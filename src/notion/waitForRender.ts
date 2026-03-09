import type { Page } from 'puppeteer';

export async function autoScrollToBottom(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let total = 0;
      const distance = 600;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        total += distance;
        if (total >= scrollHeight + 2000) {
          clearInterval(timer);
          resolve();
        }
      }, 80);
    });
    window.scrollTo(0, 0);
  });
}

export async function waitForImages(page: Page, timeoutMs: number) {
  await page.waitForFunction(
    () => {
      const images = Array.from(document.images);
      if (images.length === 0) return true;
      return images.every((img) => img.complete && img.naturalWidth > 0);
    },
    { timeout: timeoutMs }
  );
}

export async function waitForLayoutStable(page: Page, rounds = 2, intervalMs = 500) {
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
