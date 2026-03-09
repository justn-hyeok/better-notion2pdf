#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";
import { z as z2 } from "zod";

// src/build.ts
import fs3 from "fs-extra";
import path2 from "path";
import puppeteer from "puppeteer";
import ora from "ora";

// src/utils/parseMargin.ts
function parseMargin(input) {
  const parts = input.split(",").map((p) => p.trim());
  if (parts.length !== 4 || parts.some((p) => p.length === 0)) {
    throw new Error("Invalid --margin. Expected: top,right,bottom,left (e.g. 18mm,16mm,18mm,16mm)");
  }
  return {
    top: parts[0],
    right: parts[1],
    bottom: parts[2],
    left: parts[3]
  };
}

// src/notion/cleanUI.ts
async function cleanNotionAppUI(page, level = "soft") {
  await page.evaluate((cleanLevel) => {
    const removed = [];
    const removeSelectors = [
      '[data-testid="notion-topbar"]',
      ".notion-topbar",
      ".notion-presence-container",
      '[aria-label="Comments"]',
      '[aria-label="Open comments"]',
      ".notion-help-button",
      ".intercom-lightweight-app",
      ".notion-peek-renderer",
      "[data-overlay]",
      '[data-testid="floating-help-button"]'
    ];
    if (cleanLevel === "hard") {
      removeSelectors.push(
        ".notion-table_of_contents-block",
        ".notion-page-cover-wrapper",
        ".notion-breadcrumb",
        ".notion-backlinks",
        ".notion-page-link .notion-focusable",
        '[aria-label="Open in Notion"]'
      );
    }
    for (const selector of removeSelectors) {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.display = "none";
        removed.push(selector);
      });
    }
    document.querySelectorAll("*").forEach((el) => {
      if (el.matches(
        ".notion-callout-block, .notion-quote-block, .notion-code-block, pre, code, img, .notion-image-block, table"
      )) {
        return;
      }
      const style = window.getComputedStyle(el);
      if ((style.position === "fixed" || style.position === "sticky") && !el.closest(".notion-page-content")) {
        el.style.display = "none";
      }
    });
    window.__better_notion2pdf_removed = removed.length;
  }, level);
}

// src/notion/waitForRender.ts
async function autoScrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 600;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        total += distance;
        if (total >= scrollHeight + 2e3) {
          clearInterval(timer);
          resolve();
        }
      }, 80);
    });
    window.scrollTo(0, 0);
  });
}
async function waitForImages(page, timeoutMs) {
  await page.waitForFunction(
    () => {
      const images = Array.from(document.images);
      if (images.length === 0) return true;
      return images.every((img) => img.complete && img.naturalWidth > 0);
    },
    { timeout: timeoutMs }
  );
}
async function waitForLayoutStable(page, rounds = 2, intervalMs = 500) {
  let stable = 0;
  let prev = -1;
  while (stable < rounds) {
    const h = await page.evaluate(() => document.body.scrollHeight);
    if (h === prev) stable += 1;
    else stable = 0;
    prev = h;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// src/notion/injectStyles.ts
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function resolveProfilePath(profile) {
  const candidates = [
    path.resolve(__dirname, `../profiles/${profile}.css`),
    // src runtime
    path.resolve(process.cwd(), `src/profiles/${profile}.css`),
    // built cli from project root
    path.resolve(process.cwd(), `profiles/${profile}.css`)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Profile CSS not found for '${profile}'`);
}
async function injectProfileCss(page, profile, opts) {
  const cssPath = resolveProfilePath(profile);
  const baseCss = await fs.readFile(cssPath, "utf-8");
  const codeWrap = opts?.codeWrap ?? "soft";
  const codeFontSize = opts?.codeFontSize ?? 11;
  const codeCss = codeWrap === "none" ? `
pre, .notion-code-block { white-space: pre !important; overflow-x: auto !important; font-size: ${codeFontSize}px !important; }
` : codeWrap === "hard" ? `
pre, .notion-code-block { white-space: pre-wrap !important; word-break: break-all !important; overflow-wrap: anywhere !important; font-size: ${codeFontSize}px !important; }
` : `
pre, .notion-code-block { white-space: pre-wrap !important; word-break: break-word !important; overflow-wrap: anywhere !important; font-size: ${codeFontSize}px !important; }
`;
  const css = `${baseCss}
${codeCss}`;
  await page.addStyleTag({ content: css });
  return css;
}

// src/notion/cookies.ts
import fs2 from "fs-extra";
async function loadCookies(page, cookieFile) {
  if (!cookieFile) return 0;
  const raw = await fs2.readFile(cookieFile, "utf-8");
  const parsed = JSON.parse(raw);
  const cookies = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.cookies) ? parsed.cookies : [];
  if (!cookies.length) {
    throw new Error("Cookie file is empty or invalid. Expected array or { cookies: [] }.");
  }
  for (const c of cookies) {
    if (!c || typeof c !== "object") {
      throw new Error("Cookie entry must be an object.");
    }
    const o = c;
    if (typeof o.name !== "string" || typeof o.value !== "string") {
      throw new Error("Each cookie must include string fields: name, value.");
    }
    if (typeof o.domain !== "string" && typeof o.url !== "string") {
      throw new Error("Each cookie must include domain or url.");
    }
  }
  await page.setCookie(...cookies);
  return cookies.length;
}

// src/build.ts
async function buildPdf(options) {
  const startedAt = Date.now();
  const spinner = ora("Launching browser").start();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(options.timeoutMs);
    if (options.cookieFile) {
      spinner.text = "Loading cookies";
      const count = await loadCookies(page, options.cookieFile);
      spinner.text = `Loaded ${count} cookies`;
    }
    spinner.text = "Opening Notion page";
    await page.goto(options.url, { waitUntil: "networkidle2" });
    spinner.text = "Waiting for lazy content";
    await autoScrollToBottom(page);
    let imageWaitTimedOut = false;
    try {
      await waitForImages(page, options.timeoutMs);
    } catch {
      imageWaitTimedOut = true;
      spinner.warn("Some images did not fully load in time. Continuing...");
      spinner.start("Continuing build");
    }
    await waitForLayoutStable(page);
    if (!options.keepUi) {
      spinner.text = "Cleaning app UI";
      await cleanNotionAppUI(page, options.cleanLevel);
    }
    spinner.text = "Injecting print styles";
    const injectedCss = await injectProfileCss(page, options.profile, {
      codeWrap: options.codeWrap,
      codeFontSize: options.codeFontSize
    });
    await new Promise((r) => setTimeout(r, options.waitMs));
    const outPath = path2.resolve(options.out);
    await fs3.ensureDir(path2.dirname(outPath));
    if (options.debugShot) {
      await fs3.ensureDir(path2.dirname(path2.resolve(options.debugShot)));
      await page.screenshot({ path: path2.resolve(options.debugShot), fullPage: true });
    }
    if (options.debugHtml) {
      await fs3.ensureDir(path2.dirname(path2.resolve(options.debugHtml)));
      await fs3.writeFile(path2.resolve(options.debugHtml), await page.content(), "utf-8");
    }
    spinner.text = "Generating PDF";
    await page.pdf({
      path: outPath,
      format: options.format,
      printBackground: true,
      margin: parseMargin(options.margin),
      preferCSSPageSize: true
    });
    const removedUiCount = await page.evaluate(
      () => window.__better_notion2pdf_removed ?? 0
    );
    if (options.debugHtml) {
      const debugDir = path2.dirname(path2.resolve(options.debugHtml));
      const cssDumpPath = path2.resolve(debugDir, "injected-css.css");
      await fs3.writeFile(cssDumpPath, injectedCss, "utf-8");
      const logPath = path2.resolve(debugDir, "build-log.json");
      const log = {
        startedAt: new Date(startedAt).toISOString(),
        endedAt: (/* @__PURE__ */ new Date()).toISOString(),
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
        imageWaitTimedOut
      };
      await fs3.writeFile(logPath, JSON.stringify(log, null, 2), "utf-8");
    }
    spinner.succeed(`PDF generated: ${outPath}`);
  } finally {
    await browser.close();
  }
}

// src/types.ts
import { z } from "zod";
var CliOptionsSchema = z.object({
  url: z.string().url(),
  out: z.string().default("output.pdf"),
  format: z.enum(["A4", "Letter"]).default("A4"),
  margin: z.string().default("18mm,16mm,18mm,16mm"),
  profile: z.enum(["notion-default", "portfolio"]).default("notion-default"),
  cleanLevel: z.enum(["soft", "hard"]).default("soft"),
  waitMs: z.number().int().min(0).default(1200),
  timeoutMs: z.number().int().min(1e3).default(45e3),
  keepUi: z.boolean().default(false),
  cookieFile: z.string().optional(),
  codeWrap: z.enum(["soft", "hard", "none"]).default("soft"),
  codeFontSize: z.number().int().min(8).max(16).default(11),
  debugShot: z.string().optional(),
  debugHtml: z.string().optional(),
  verbose: z.boolean().default(false)
});

// src/utils/logger.ts
import chalk from "chalk";
function logError(msg) {
  console.error(chalk.red("\u2716"), msg);
}

// src/cli.ts
var program = new Command();
program.name("better-notion2pdf").description("Readable Notion-to-PDF builder with smart page breaks").requiredOption("--url <url>", "Notion page URL").option("--out <path>", "Output PDF path", "output.pdf").option("--format <A4|Letter>", "PDF page format", "A4").option("--margin <t,r,b,l>", "PDF margins", "18mm,16mm,18mm,16mm").option("--profile <profile>", "Style profile: notion-default|portfolio", "notion-default").option("--clean-level <level>", "UI clean level: soft|hard", "soft").option("--wait-ms <ms>", "Extra wait after style injection", "1200").option("--timeout-ms <ms>", "Navigation/render timeout", "45000").option("--keep-ui", "Do not remove Notion app UI").option("--cookie-file <path>", "JSON cookie file for private Notion pages").option("--code-wrap <mode>", "Code wrapping mode: soft|hard|none", "soft").option("--code-font-size <px>", "Code font size in px (8-16)", "11").option("--debug-shot <path>", "Save full page screenshot before PDF").option("--debug-html <path>", "Save page HTML and injected css").option("--verbose", "Verbose logs").action(async (raw) => {
  try {
    const parsed = CliOptionsSchema.parse({
      ...raw,
      waitMs: Number(raw.waitMs),
      timeoutMs: Number(raw.timeoutMs),
      codeFontSize: Number(raw.codeFontSize)
    });
    await buildPdf(parsed);
    process.exit(0);
  } catch (error) {
    if (error instanceof z2.ZodError) {
      logError(`Invalid options: ${error.issues.map((i) => i.message).join(", ")}`);
      process.exit(10);
    }
    const msg = error instanceof Error ? error.message : String(error);
    logError(msg);
    if (/timeout|navigation timeout/i.test(msg)) process.exit(20);
    if (/auth|permission|login|forbidden|401|403|object_not_found/i.test(msg)) process.exit(30);
    if (/EACCES|ENOENT|write|pdf|output/i.test(msg)) process.exit(40);
    process.exit(50);
  }
});
program.parse();
