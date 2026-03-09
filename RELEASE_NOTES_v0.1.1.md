# better-notion2pdf v0.1.1 (draft)

## Highlights
- Added cookie-file support hardening for private Notion pages.
- Added baseline tests for cookie loading and margin parsing.
- Improved hard clean-level UI removal behavior.
- Refined CLI exit-code behavior and README docs.

## Changes

### ✨ Features
- Validate cookie-file entries before applying to browser session.
  - Required fields: `name`, `value`
  - Required context: `domain` or `url`
- Added sample cookie schema:
  - `examples/cookies.example.json`

### 🧪 Tests
- Added `test/cookies.test.ts`
  - invalid cookie payload should fail
  - valid `{ cookies: [] }` payload should pass
- Added `test/parseMargin.test.ts`
  - valid 4-part margin parsing
  - invalid format rejection

### 🧹 UI Cleaning (hard mode)
- Extended hard clean selector list:
  - backlinks / breadcrumb / open-in-Notion related UI elements
- Continued policy: preserve content blocks while removing app chrome.

### 🧰 CLI / Docs
- Better exit-code mapping in CLI:
  - `20`: timeout
  - `30`: auth/permission issues
  - `40`: output write errors
  - `50`: fallback internal errors
- README updates:
  - private Notion (`--cookie-file`) usage guide
  - cookie sample reference
  - FAQ + exit code section

## Verification
- `pnpm run typecheck` ✅
- `pnpm test` ✅ (4 tests)
- `pnpm run build` ✅

## Commits included
- `0ca0ea9` feat: add cookie-file validation and baseline tests
- `866e52d` feat: hard-clean tuning, exit codes, and private Notion docs
