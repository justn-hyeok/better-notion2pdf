import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveProfilePath(profile: 'notion-default' | 'portfolio') {
  const candidates = [
    path.resolve(__dirname, `../profiles/${profile}.css`), // src runtime
    path.resolve(process.cwd(), `src/profiles/${profile}.css`), // built cli from project root
    path.resolve(process.cwd(), `profiles/${profile}.css`),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Profile CSS not found for '${profile}'`);
}

export async function injectProfileCss(
  page: Page,
  profile: 'notion-default' | 'portfolio',
  opts?: { codeWrap?: 'soft' | 'hard' | 'none'; codeFontSize?: number }
) {
  const cssPath = resolveProfilePath(profile);
  const baseCss = await fs.readFile(cssPath, 'utf-8');

  const codeWrap = opts?.codeWrap ?? 'soft';
  const codeFontSize = opts?.codeFontSize ?? 11;

  const codeCss =
    codeWrap === 'none'
      ? `\npre, .notion-code-block { white-space: pre !important; overflow-x: auto !important; font-size: ${codeFontSize}px !important; }\n`
      : codeWrap === 'hard'
        ? `\npre, .notion-code-block { white-space: pre-wrap !important; word-break: break-all !important; overflow-wrap: anywhere !important; font-size: ${codeFontSize}px !important; }\n`
        : `\npre, .notion-code-block { white-space: pre-wrap !important; word-break: break-word !important; overflow-wrap: anywhere !important; font-size: ${codeFontSize}px !important; }\n`;

  const css = `${baseCss}\n${codeCss}`;
  await page.addStyleTag({ content: css });
  return css;
}
