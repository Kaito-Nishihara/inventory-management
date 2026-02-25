# catalog.products

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| Name | character varying(200) | NO | (none) | NO |
| Description | character varying(2000) | NO | (none) | NO |
| Price | numeric(18,2) | NO | (none) | NO |
| IsPublished | boolean | NO | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |
| UpdatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| PK_products | CREATE UNIQUE INDEX "PK_products" ON catalog.products USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
