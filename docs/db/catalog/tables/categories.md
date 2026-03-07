# catalog.categories

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| Key | character varying(50) | NO | (none) | NO |
| Name | character varying(100) | NO | (none) | NO |
| SortOrder | integer | NO | (none) | NO |
| IsActive | boolean | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_categories_IsActive_SortOrder | CREATE INDEX "IX_categories_IsActive_SortOrder" ON catalog.categories USING btree ("IsActive", "SortOrder") |
| IX_categories_Key | CREATE UNIQUE INDEX "IX_categories_Key" ON catalog.categories USING btree ("Key") |
| PK_categories | CREATE UNIQUE INDEX "PK_categories" ON catalog.categories USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
