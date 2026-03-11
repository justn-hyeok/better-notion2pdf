import type { Page } from 'puppeteer';

export async function autoScrollToBottom(page: Page) {
  // Two-pass scroll: first pass triggers lazy loading, second ensures everything loaded
  for (let pass = 0; pass < 2; pass++) {
    await page.evaluate(async (passIndex) => {
      await new Promise<void>((resolve) => {
        let total = 0;
        let scrollCount = 0;
        const distance = 400;
        const maxScrolls = 300;
        const interval = passIndex === 0 ? 100 : 150;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          total += distance;
          scrollCount++;
          if (total >= scrollHeight + 2000 || scrollCount >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, interval);
      });
      window.scrollTo(0, 0);
    }, pass);
    // Wait between passes for lazy content to initialize; skip second pass if no new content
    if (pass === 0) {
      const heightBefore = await page.evaluate(() => document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 1000));
      const heightAfter = await page.evaluate(() => document.body.scrollHeight);
      if (heightAfter === heightBefore) break;
    }
  }
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

export async function waitForLayoutStable(page: Page, rounds = 2, intervalMs = 500, maxIterations = 30) {
  let stable = 0;
  let prev = -1;
  let iterations = 0;

  while (stable < rounds && iterations < maxIterations) {
    iterations++;
    const h = await page.evaluate(() => document.body.scrollHeight);
    if (h === prev) stable += 1;
    else stable = 0;
    prev = h;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return { stable: stable >= rounds, iterations };
}
