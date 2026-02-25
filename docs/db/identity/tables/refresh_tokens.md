# identity.refresh_tokens

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| UserId | uuid | NO | (none) | NO |
| TokenHash | text | NO | (none) | NO |
| ExpiresAtUtc | timestamp with time zone | NO | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |
| RevokedAtUtc | timestamp with time zone | YES | (none) | NO |
| ReplacedByTokenHash | text | YES | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_refresh_tokens_TokenHash | CREATE UNIQUE INDEX "IX_refresh_tokens_TokenHash" ON identity.refresh_tokens USING btree ("TokenHash") |
| IX_refresh_tokens_UserId | CREATE INDEX "IX_refresh_tokens_UserId" ON identity.refresh_tokens USING btree ("UserId") |
| PK_refresh_tokens | CREATE UNIQUE INDEX "PK_refresh_tokens" ON identity.refresh_tokens USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
