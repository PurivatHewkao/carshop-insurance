# Identity verification — 11 November 2026

Implemented MySQL-backed Register/Login/Logout/Profile and Admin user creation, listing, role changes and suspension. Uses the existing carshop_sql schema, with additive token revocation and administration-lock tables. Initial admin seeded locally through ignored environment settings.

## Passed

- Backend integration tests against a newly generated MySQL test database: 5 test groups covering validation, duplicate/concurrent registration, JWT tampering/expiry/issuer/audience, logout, rate limiting, database failures, seed idempotency, self-modification protection and simultaneous admin demotions.
- Fresh Node process verifies persisted profile and revoked token records.
- Real frontend adapter against the API: register, profile read/update, logout, login and error cases.
- Headless Microsoft Edge: register, update profile, wrong password, login/logout, customer denied Admin access, admin creates staff, changes role and suspends account, suspended login rejected, anonymous Admin access redirected.
- Existing frontend API/demo checks.
- ESLint for Identity backend, frontend and modified central router.
- Frontend production build.
- Local configured Admin login against carshop_sql.
- Web dependency audit after compatible follow-redirects update: zero reported vulnerabilities.

Tests used Node 22.20.0 and installed Microsoft Edge. The project declares Node 24; default shell Node 20 is older than the frontend toolchain requirement. Select a compatible Node before starting the frontend or running the combined tests.

## Existing project limitations

Full-repository lint reports 8 errors in Catalog CarPhoto/CarsPage, Sales SellerAppointmentsPage, HomePage and the MongoDB shell script. Identity lint passes. Build succeeds with the existing bundle-size warning above 500 kB.

Frontend credentials are held in memory, so refreshing requires login again. Finance and Stock accounts have the shared account page; their business workspaces are outside Identity. API role enforcement added here covers Identity endpoints; each other service must enforce its own business permissions.

The account name field is stored as a full name in first_name, with last_name empty. Existing split names are read together. The local database had no existing users when inspected. Initial admin email is admin@carshop.local, with a generated password in services/identity/.env and a placeholder phone 0000000000 that can be edited on the account page.

Run from the project root:

```powershell
npm --prefix services/identity test
```

The runner creates a unique carshop_identity_<random>_test database and removes only that database when complete. Application data and secrets are not committed.
