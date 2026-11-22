# Activity Logs — implementation foundation

This module contains the persistence and validation foundation for immutable activity events.

## Current implementation

- `models/ActivityEvent.js`: MongoDB `activity_events` schema and query indexes.
- `validation.js`: proposed event/query validation, including rejection of sensitive metadata keys.
- `repository.js`: insert and filtered cursor-based read operations.
- `service.js`: event ID generation and a second sensitive-metadata guard.

## Event ingestion remains closed

The read-only `GET /api/v1/activity-logs` route is mounted and protected by Identity session validation plus Manager/Admin role checks. It reads from Reporting-owned MongoDB only. The `POST /api/v1/activity-logs/events` ingestion route remains closed because the team has not approved internal service authentication or the actor-identity trust boundary. Do not accept `actorUserId` from an untrusted browser. Before mounting event ingestion:

1. Approve `docs/activity-log-contract-proposal.md` with Identity, Catalog, Sales, and Payment owners.
2. Agree on service-to-service authentication, event signing/replay protection, and how the trusted actor identity is propagated.
3. Configure the agreed secret/key in backend hosting environments (never `VITE_`).
4. Add route-level authentication/authorization and integration tests.

No TTL/retention policy is configured until the team approves retention requirements.
