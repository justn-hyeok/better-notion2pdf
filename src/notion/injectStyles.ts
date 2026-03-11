import type { Page } from 'puppeteer';
import baseLightModeCss from '../profiles/base-light-mode.css';
import notionDefaultCss from '../profiles/notion-default.css';
import portfolioCss from '../profiles/portfolio.css';

const profileMap: Record<string, string> = {
  'notion-default': notionDefaultCss,
  portfolio: portfolioCss,
};

export async function injectProfileCss(
  page: Page,
  profile: 'notion-default' | 'portfolio',
  opts?: { codeWrap?: 'soft' | 'hard' | 'none'; codeFontSize?: number }
) {
  const baseCss = profileMap[profile];
  if (!baseCss) {
    throw new Error(`Unknown profile: '${profile}'`);
  }

  const codeWrap = opts?.codeWrap ?? 'soft';
  const codeFontSize = opts?.codeFontSize ?? 11;

  const codeCss =
    codeWrap === 'none'
      ? `\npre, .notion-code-block { white-space: pre !important; overflow-x: auto !important; font-size: ${codeFontSize}px !important; }\n`
      : codeWrap === 'hard'
        ? `\npre, .notion-code-block { white-space: pre-wrap !important; word-break: break-all !important; overflow-wrap: anywhere !important; font-size: ${codeFontSize}px !important; }\n`
        : `\npre, .notion-code-block { white-space: pre-wrap !important; word-break: break-word !important; overflow-wrap: anywhere !important; font-size: ${codeFontSize}px !important; }\n`;

  const css = `${baseLightModeCss}\n${baseCss}\n${codeCss}`;
  await page.addStyleTag({ content: css });
  return css;
}
