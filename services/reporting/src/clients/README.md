# Reporting source API client

`source-api.js` calls the configured Sales, Payment and Catalog base URLs (`SALES_API_URL`, `PAYMENT_API_URL`, `CATALOG_API_URL`), each including `/api/v1`.

- Sales: `GET /orders`, `GET /appointments`
- Payment: `GET /order-balances` (requires a valid Manager/Admin Identity session)
- Catalog: `GET /cars`, `GET /cars/stock-summary` (requires a valid Manager/Admin Identity session)

The client uses Node.js `fetch`, a bounded timeout, status/error mapping, and forwards only the incoming Authorization header or Identity session cookie. It never queries source databases or imports another service's business logic. Base URLs come only from server environment configuration, never request input.
