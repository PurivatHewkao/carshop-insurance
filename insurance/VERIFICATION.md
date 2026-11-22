# Verification — 22 November 2026

## Passed locally

- NOVA production build (`npm --prefix insurance/frontend run build`).
- TOYOTY production build, both original checkout and deployment checkout based on GitHub main `8a0dbf7` with NOVA changes merged. Existing >500 kB bundle warning remains.
- ESLint for insurance and touched TOYOTY files.
- Backend automated tests: 6 passed (pricing/cap/rounding, validation, receipt hashing, transaction rollback, HTTP/CORS/body limit/rate limit).
- Real MySQL integration: passed using isolated `nova_insurance_test` on local MySQL. Migrate/seed twice, four plans, authoritative prices, direct/referral purchase, concurrent duplicate requests (201 + 409), unique policy IDs/numbers, token 401/403, hash-only storage and persistence through a separate connection.
- Chrome headless end-to-end: **3 passed**. TOYOTY partner page → NOVA referral → Smart Drive checkout → real MySQL purchase → policy → refresh → TOYOTY; mobile viewport 390×844 with no horizontal overflow on home/checkout; network failure and retry using the real plans API.
- Receipt API denies a policy ID without its bearer token; receipt token does not appear in the URL.
- `.env`, node_modules, dist, local MySQL data and test artifacts are git-ignored.

## Limits

- Native interactive browser control failed with `GetCursorPos: Access is denied`; headless Chrome was used for browser checks.
- Existing TOYOTY role flows were preserved in source and built, but the complete Customer/Seller/Manager/Admin/Finance/Stock business workflows were not re-run against production databases.
- Production deployment is tracked separately; a local test pass does not claim production success.
- A committed purchase whose first response is lost cannot recover its receipt token without an additional authenticated recovery flow; retry safely returns 409.
- All purchase and policy behavior is an educational simulation without payment or insurance coverage.
