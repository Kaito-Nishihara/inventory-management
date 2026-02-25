# identity.auth_audit_logs

## Columns

| Name | Type | Nullable | Default | PK |
|---|---|---|---|---|
| Id | uuid | NO | (none) | YES |
| UserId | uuid | YES | (none) | NO |
| Action | character varying(64) | NO | (none) | NO |
| Success | boolean | NO | (none) | NO |
| Detail | character varying(512) | YES | (none) | NO |
| CreatedAtUtc | timestamp with time zone | NO | (none) | NO |

## Indexes

| Name | Definition |
|---|---|
| IX_auth_audit_logs_CreatedAtUtc | CREATE INDEX "IX_auth_audit_logs_CreatedAtUtc" ON identity.auth_audit_logs USING btree ("CreatedAtUtc") |
| PK_auth_audit_logs | CREATE UNIQUE INDEX "PK_auth_audit_logs" ON identity.auth_audit_logs USING btree ("Id") |

## Foreign Keys

| Constraint | Column | References |
|---|---|---|
| (none) | (none) | (none) |
