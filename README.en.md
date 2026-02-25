# inventory-management

A sample inventory management system built with React + .NET 10 + PostgreSQL.  
It incrementally implements both customer-facing purchase flows and admin-facing product/inventory/order operations.

## Tech Stack

- Frontend: React (Vite) + Tailwind CSS
- Backend: .NET 10 Web API
- Database: PostgreSQL 16
- Auth: JWT (Identity Service)
- Inter-service communication: gRPC (Order -> Catalog)
- Infra: Docker Compose
- Monitoring (local): Uptime Kuma

## Repository Structure

```text
inventory-management/
├─ apps/
│  └─ web/                    # React frontend
├─ services/
│  ├─ identity/Identity.Api/  # Authentication / user management
│  ├─ catalog/Catalog.Api/    # Product / inventory management
│  └─ order/Order.Api/        # Order management
├─ tests/
│  └─ Chapter7.E2E.Tests/     # E2E tests
├─ scripts/                   # Helper scripts (E2E, DB docs generation, etc.)
├─ docs/                      # Chapter docs / DB definition files
├─ compose.yml
└─ inventory-management.sln
```

## Run Locally

```bash
docker compose up -d --build
```

Main endpoints:

- Web: `http://localhost:3000`
- Identity API: `http://localhost:5001`
- Catalog API: `http://localhost:5002`
- Order API: `http://localhost:5003`
- Uptime Kuma: `http://localhost:3001`

## Tests

### .NET tests

```bash
docker compose --profile test run --rm test-runner
```

### Frontend unit tests

```bash
cd apps/web
npm run test:unit
```

### Frontend E2E tests

```bash
cd apps/web
npm run test:e2e
```

## Automated DB Documentation

The GitHub Actions workflow `db-docs` generates DB definitions from PostgreSQL.

- Output: `docs/db/`
- Formats:
  - Table definitions: `docs/db/{schema}/tables/*.md`
  - ER diagrams (DBML): `docs/db/{schema}/er.dbml`
