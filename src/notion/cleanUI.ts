import type { Page } from 'puppeteer';

export async function cleanNotionAppUI(page: Page, level: 'soft' | 'hard' = 'soft') {
  await page.evaluate((cleanLevel) => {
    const removed: string[] = [];

    const removeSelectors = [
      '[data-testid="notion-topbar"]',
      '.notion-topbar',
      '.notion-presence-container',
      '[aria-label="Comments"]',
      '[aria-label="Open comments"]',
      '.notion-help-button',
      '.intercom-lightweight-app',
      '.notion-peek-renderer',
      '[data-overlay]',
      '[data-testid="floating-help-button"]',
    ];

    if (cleanLevel === 'hard') {
      removeSelectors.push(
        '.notion-table_of_contents-block',
        '.notion-page-cover-wrapper',
        '.notion-breadcrumb',
        '.notion-backlinks',
        '.notion-page-link .notion-focusable',
        '[aria-label="Open in Notion"]'
      );
    }

    for (const selector of removeSelectors) {
      document.querySelectorAll(selector).forEach((el) => {
        (el as HTMLElement).style.display = 'none';
        removed.push(selector);
      });
    }

    // hide floating fixed controls but keep actual content blocks
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (
        el.matches(
          '.notion-callout-block, .notion-quote-block, .notion-code-block, pre, code, img, .notion-image-block, table'
        )
      ) {
        return;
      }

      const style = window.getComputedStyle(el);
      if ((style.position === 'fixed' || style.position === 'sticky') && !el.closest('.notion-page-content')) {
        el.style.display = 'none';
      }
    });

    // expose debug count
    (window as unknown as { __better_notion2pdf_removed?: number }).__better_notion2pdf_removed = removed.length;
  }, level);
}
