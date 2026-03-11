import fs from 'fs-extra';
import path from 'node:path';
import puppeteer from 'puppeteer';
import ora from 'ora';
import { CliOptions } from './types.js';
import { PdfTimeoutError, PdfAuthError, PdfOutputError } from './errors.js';
import { parseMargin } from './utils/parseMargin.js';
import { cleanNotionAppUI } from './notion/cleanUI.js';
import { autoScrollToBottom, waitForImages, waitForLayoutStable } from './notion/waitForRender.js';
import { injectProfileCss } from './notion/injectStyles.js';
import { loadCookies } from './notion/cookies.js';

export async function buildPdf(options: CliOptions) {
  const startedAt = Date.now();
  const spinner = ora('Launching browser').start();
  const browser = await puppeteer.launch({
    headless: true,
    args: options.noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(options.timeoutMs);

    if (options.cookieFile) {
      spinner.text = 'Loading cookies';
      const count = await loadCookies(page, options.cookieFile);
      spinner.text = `Loaded ${count} cookies`;
    }

    spinner.text = 'Opening Notion page';
    try {
      await page.goto(options.url, { waitUntil: 'networkidle2' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/timeout|navigation timeout/i.test(msg)) throw new PdfTimeoutError(msg);
      if (/net::ERR_ABORTED|403|401|object_not_found/i.test(msg)) throw new PdfAuthError(msg);
      throw err;
    }

    spinner.text = 'Waiting for lazy content';
    await autoScrollToBottom(page);
    let imageWaitTimedOut = false;
    try {
      await waitForImages(page, options.timeoutMs);
    } catch {
      imageWaitTimedOut = true;
      spinner.warn('Some images did not fully load in time. Continuing...');
      spinner.start('Continuing build');
    }
    const layout = await waitForLayoutStable(page);
    if (!layout.stable && options.verbose) {
      spinner.warn('Layout did not stabilize within iteration limit. Continuing...');
      spinner.start('Continuing build');
    }

    if (!options.keepUi) {
      spinner.text = 'Cleaning app UI';
      await cleanNotionAppUI(page, options.cleanLevel);
    }

    spinner.text = 'Injecting print styles';
    const injectedCss = await injectProfileCss(page, options.profile, {
      codeWrap: options.codeWrap,
      codeFontSize: options.codeFontSize,
    });

    await new Promise((r) => setTimeout(r, options.waitMs));

    const outPath = path.resolve(options.out);
    await fs.ensureDir(path.dirname(outPath));

    if (options.debugShot) {
      await fs.ensureDir(path.dirname(path.resolve(options.debugShot)));
      await page.screenshot({ path: path.resolve(options.debugShot), fullPage: true });
    }

    if (options.debugHtml) {
      await fs.ensureDir(path.dirname(path.resolve(options.debugHtml)));
      await fs.writeFile(path.resolve(options.debugHtml), await page.content(), 'utf-8');
    }

    spinner.text = 'Generating PDF';
    try {
      await page.pdf({
        path: outPath,
        format: options.format,
        printBackground: true,
        margin: parseMargin(options.margin),
        preferCSSPageSize: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PdfOutputError(msg);
    }

    const removedUiCount = await page.evaluate(() =>
      (window as unknown as { __better_notion2pdf_removed?: number }).__better_notion2pdf_removed ?? 0
    );

    // optional debug dump
    if (options.debugHtml) {
      const debugDir = path.dirname(path.resolve(options.debugHtml));
      const cssDumpPath = path.resolve(debugDir, 'injected-css.css');
      await fs.writeFile(cssDumpPath, injectedCss, 'utf-8');

      const logPath = path.resolve(debugDir, 'build-log.json');
      const log = {
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        url: options.url,
        output: outPath,
        profile: options.profile,
        cleanLevel: options.cleanLevel,
        keepUi: options.keepUi,
        codeWrap: options.codeWrap,
        codeFontSize: options.codeFontSize,
        cookieFileUsed: Boolean(options.cookieFile),
        removedUiCount,
        imageWaitTimedOut,
      };
      await fs.writeFile(logPath, JSON.stringify(log, null, 2), 'utf-8');
    }

    spinner.succeed(`PDF generated: ${outPath}`);
  } finally {
    await browser.close();
  }
}
