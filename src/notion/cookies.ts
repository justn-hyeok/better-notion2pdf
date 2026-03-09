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

  for (const c of cookies) {
    if (!c || typeof c !== 'object') {
      throw new Error('Cookie entry must be an object.');
    }
    const o = c as Record<string, unknown>;
    if (typeof o.name !== 'string' || typeof o.value !== 'string') {
      throw new Error('Each cookie must include string fields: name, value.');
    }
    if (typeof o.domain !== 'string' && typeof o.url !== 'string') {
      throw new Error('Each cookie must include domain or url.');
    }
  }

  await page.setCookie(...(cookies as never[]));
  return cookies.length;
}
