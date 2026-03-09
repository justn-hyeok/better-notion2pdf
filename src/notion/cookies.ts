import fs from 'fs-extra';
import type { Page } from 'puppeteer';

type CookieLike = Record<string, unknown>;

export async function loadCookies(page: Page, cookieFile?: string) {
  if (!cookieFile) return 0;

  const raw = await fs.readFile(cookieFile, 'utf-8');
  const parsed = JSON.parse(raw);

  const cookies: CookieLike[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.cookies)
      ? parsed.cookies
      : [];

  if (!cookies.length) {
    throw new Error('Cookie file is empty or invalid. Expected array or { cookies: [] }.');
  }

  await page.setCookie(...(cookies as never[]));
  return cookies.length;
}
