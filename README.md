# better-notion2pdf

Readable Notion-to-PDF builder with smart page breaks.

## Install

```bash
pnpm install
pnpm build
```

## Usage

```bash
node dist/cli.js \
  --url "https://www.notion.so/your-page" \
  --out "portfolio.pdf" \
  --profile portfolio \
  --clean-level soft \
  --code-wrap soft \
  --code-font-size 11 \
  --debug-shot "./debug/before.pdf.png" \
  --debug-html "./debug/page.html"
```

## Key behavior

- Keeps content blocks (callout, quote, code, image, table)
- Removes Notion app chrome only (unless `--keep-ui`)
- Preserves original image quality (no re-encoding in pipeline)
- Uses smart page-break styles for headings and non-splittable blocks

## Useful options

- `--cookie-file ./cookies.json` : access private Notion pages with existing session cookies
- `--code-wrap soft|hard|none` : code block wrapping strategy in PDF
- `--code-font-size 8..16` : code block font size

Cookie file format example: `examples/cookies.example.json`

## Debug outputs

When `--debug-html` is set, these files are also generated in the same folder:

- `page.html` (current DOM)
- `injected-css.css`
- `build-log.json`

## Exit codes

- `0` success
- `10` invalid input/options
- `20` timeout
- `30` auth/permission error
- `40` output write error
- `50` unknown internal error

## Private Notion pages (cookie-file)

1. Log in to Notion in Chrome.
2. Open DevTools → Application → Cookies → `https://www.notion.so`.
3. Export cookies and keep at least `name`, `value`, `domain` (or `url`).
4. Save as JSON like `examples/cookies.example.json`.
5. Run with `--cookie-file ./cookies.json`.

## FAQ

**Q. Why does private Notion fail?**
- Use `--cookie-file` with a valid Notion session cookie and ensure page permission is granted.

**Q. Are images compressed?**
- No. This tool does not re-encode images. It only adjusts layout and page breaks.

**Q. Why is Chrome sandbox error shown on Linux?**
- In restricted Linux environments, Chromium sandbox may be unavailable. This tool launches with `--no-sandbox` by default in this environment.
