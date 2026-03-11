import fs from 'fs-extra';
import type { Page, CookieParam } from 'puppeteer';

type CookieLike = Record<string, unknown>;

function toCookieParam(c: CookieLike): CookieParam {
  const param: CookieParam = {
    name: c.name as string,
    value: c.value as string,
  };
  if (typeof c.domain === 'string') param.domain = c.domain;
  if (typeof c.url === 'string') param.url = c.url;
  if (typeof c.path === 'string') param.path = c.path;
  if (typeof c.secure === 'boolean') param.secure = c.secure;
  if (typeof c.httpOnly === 'boolean') param.httpOnly = c.httpOnly;
  if (typeof c.sameSite === 'string') {
    const normalized: Record<string, CookieParam['sameSite']> = {
      strict: 'Strict',
      lax: 'Lax',
      none: 'None',
    };
    const mapped = normalized[c.sameSite.toLowerCase()];
    if (!mapped) {
      throw new Error(`Invalid sameSite value "${c.sameSite}" in cookie "${c.name}". Expected: Strict, Lax, or None.`);
    }
    param.sameSite = mapped;
  }
  if (typeof c.expires === 'number') param.expires = c.expires;
  return param;
}

export async function loadCookies(page: Page, cookieFile?: string) {
  if (!cookieFile) return 0;

  const raw = await fs.readFile(cookieFile, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse cookie file "${cookieFile}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const obj = parsed as Record<string, unknown>;
  const cookies: CookieLike[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(obj?.cookies)
      ? (obj.cookies as CookieLike[])
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

  await page.setCookie(...cookies.map(toCookieParam));
  return cookies.length;
}
