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

## Debug outputs

When `--debug-html` is set, these files are also generated in the same folder:

- `page.html` (current DOM)
- `injected-css.css`
- `build-log.json`
