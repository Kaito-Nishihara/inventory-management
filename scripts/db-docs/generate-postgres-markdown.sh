#!/usr/bin/env bash
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-invdb}"
PGUSER="${PGUSER:-inv}"
PGPASSWORD="${PGPASSWORD:-invpass}"
OUTPUT_DIR="${OUTPUT_DIR:-docs/db}"
SCHEMAS="${SCHEMAS:-identity catalog order}"

export PGPASSWORD

if ! command -v psql >/dev/null 2>&1; then
  echo "psql command is required but was not found." >&2
  exit 1
fi

psql_cmd() {
  psql \
    --host "$PGHOST" \
    --port "$PGPORT" \
    --username "$PGUSER" \
    --dbname "$PGDATABASE" \
    --no-align \
    --tuples-only \
    --field-separator $'\t' \
    --command "$1"
}

escape_md() {
  local value="${1:-}"
  value="${value//|/\\|}"
  value="${value//$'\n'/<br/>}"
  printf '%s' "$value"
}

mkdir -p "$OUTPUT_DIR"
rm -f "${OUTPUT_DIR}/database-schema.md"

readme_file="${OUTPUT_DIR}/README.md"
{
  echo "# Database Definition"
  echo
  echo "- Database: \`${PGDATABASE}\`"
  echo "- GeneratedAtUtc: \`$(date -u +"%Y-%m-%dT%H:%M:%SZ")\`"
  echo
  echo "## Schemas"
} >"$readme_file"

for schema in $SCHEMAS; do
  schema_dir="${OUTPUT_DIR}/${schema}"
  tables_dir="${schema_dir}/tables"
  schema_index="${schema_dir}/README.md"
  schema_erd="${schema_dir}/er.dbml"
  rm -rf "$schema_dir"
  mkdir -p "$tables_dir"

  {
    echo "# ${schema} schema"
    echo
    echo "## Files"
    echo "- [ER Diagram (DBML)](er.dbml)"
    echo "- Table definitions in [tables/](tables/)"
    echo
    echo "## Tables"
  } >"$schema_index"
  echo "- [${schema}](${schema}/README.md)" >>"$readme_file"

  tables_query="
  SELECT table_name
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema = '${schema}'
  ORDER BY table_name;
  "

  while IFS=$'\t' read -r table_name; do
    [[ -z "${table_name:-}" ]] && continue

    table_file="${tables_dir}/${table_name}.md"
    {
      echo "# ${schema}.${table_name}"
      echo
      echo "## Columns"
      echo
      echo "| Name | Type | Nullable | Default | PK |"
      echo "|---|---|---|---|---|"
    } >"$table_file"

    columns_query="
    SELECT
      c.column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
      c.is_nullable,
      COALESCE(c.column_default, '(none)') AS column_default,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM pg_index i
          JOIN pg_attribute ia
            ON ia.attrelid = i.indrelid
           AND ia.attnum = ANY(i.indkey)
          WHERE i.indrelid = (quote_ident('${schema}') || '.' || quote_ident('${table_name}'))::regclass
            AND i.indisprimary
            AND ia.attname = c.column_name
        ) THEN 'YES'
        ELSE 'NO'
      END AS is_pk
    FROM information_schema.columns c
    JOIN pg_class cl
      ON cl.relname = c.table_name
    JOIN pg_namespace ns
      ON ns.oid = cl.relnamespace
     AND ns.nspname = c.table_schema
    JOIN pg_attribute a
      ON a.attrelid = cl.oid
     AND a.attname = c.column_name
    WHERE c.table_schema = '${schema}'
      AND c.table_name = '${table_name}'
    ORDER BY c.ordinal_position;
    "

    while IFS=$'\t' read -r column_name data_type is_nullable column_default is_pk; do
      echo "| $(escape_md "$column_name") | $(escape_md "$data_type") | $(escape_md "$is_nullable") | $(escape_md "$column_default") | $(escape_md "$is_pk") |" >>"$table_file"
    done < <(psql_cmd "$columns_query")

    {
      echo
      echo "## Indexes"
      echo
      echo "| Name | Definition |"
      echo "|---|---|"
    } >>"$table_file"

    indexes_query="
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = '${schema}'
      AND tablename = '${table_name}'
    ORDER BY indexname;
    "

    has_indexes=0
    while IFS=$'\t' read -r index_name index_def; do
      [[ -z "${index_name:-}" ]] && continue
      has_indexes=1
      echo "| $(escape_md "$index_name") | $(escape_md "$index_def") |" >>"$table_file"
    done < <(psql_cmd "$indexes_query")
    [[ $has_indexes -eq 0 ]] && echo "| (none) | (none) |" >>"$table_file"

    {
      echo
      echo "## Foreign Keys"
      echo
      echo "| Constraint | Column | References |"
      echo "|---|---|---|"
    } >>"$table_file"

    fks_query="
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_schema || '.' || ccu.table_name || '(' || ccu.column_name || ')' AS references_to
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = '${schema}'
      AND tc.table_name = '${table_name}'
    ORDER BY tc.constraint_name, kcu.ordinal_position;
    "

    has_fks=0
    while IFS=$'\t' read -r constraint_name column_name references_to; do
      [[ -z "${constraint_name:-}" ]] && continue
      has_fks=1
      echo "| $(escape_md "$constraint_name") | $(escape_md "$column_name") | $(escape_md "$references_to") |" >>"$table_file"
    done < <(psql_cmd "$fks_query")
    [[ $has_fks -eq 0 ]] && echo "| (none) | (none) | (none) |" >>"$table_file"

    echo "- [${table_name}](tables/${table_name}.md)" >>"$schema_index"
  done < <(psql_cmd "$tables_query")

  {
    echo "// ${schema} schema"
    echo "// GeneratedAtUtc: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo
  } >"$schema_erd"

  while IFS=$'\t' read -r table_name; do
    [[ -z "${table_name:-}" ]] && continue
    echo "Table ${schema}.${table_name} {" >>"$schema_erd"
    dbml_columns_query="
    SELECT
      c.column_name,
      CASE
        WHEN pg_catalog.format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone' THEN 'timestamptz'
        WHEN pg_catalog.format_type(a.atttypid, a.atttypmod) LIKE 'character varying%' THEN regexp_replace(pg_catalog.format_type(a.atttypid, a.atttypmod), '^character varying', 'varchar')
        ELSE pg_catalog.format_type(a.atttypid, a.atttypmod)
      END AS data_type,
      CASE WHEN c.is_nullable = 'NO' THEN 'not null' ELSE '' END AS not_null_flag,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM pg_index i
          JOIN pg_attribute ia
            ON ia.attrelid = i.indrelid
           AND ia.attnum = ANY(i.indkey)
          WHERE i.indrelid = (quote_ident('${schema}') || '.' || quote_ident('${table_name}'))::regclass
            AND i.indisprimary
            AND ia.attname = c.column_name
        ) THEN 'pk'
        ELSE ''
      END AS pk_flag
    FROM information_schema.columns c
    JOIN pg_class cl
      ON cl.relname = c.table_name
    JOIN pg_namespace ns
      ON ns.oid = cl.relnamespace
     AND ns.nspname = c.table_schema
    JOIN pg_attribute a
      ON a.attrelid = cl.oid
     AND a.attname = c.column_name
    WHERE c.table_schema = '${schema}'
      AND c.table_name = '${table_name}'
    ORDER BY c.ordinal_position;
    "

    while IFS=$'\t' read -r column_name data_type not_null_flag pk_flag; do
      settings=()
      [[ -n "$pk_flag" ]] && settings+=("$pk_flag")
      [[ -n "$not_null_flag" ]] && settings+=("$not_null_flag")
      if [[ ${#settings[@]} -eq 0 ]]; then
        echo "  ${column_name} ${data_type}" >>"$schema_erd"
      else
        joined="$(IFS=', '; echo "${settings[*]}")"
        echo "  ${column_name} ${data_type} [${joined}]" >>"$schema_erd"
      fi
    done < <(psql_cmd "$dbml_columns_query")
    echo "}" >>"$schema_erd"
    echo >>"$schema_erd"
  done < <(psql_cmd "$tables_query")

  relation_query="
  SELECT
    kcu.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_schema AS to_schema,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.constraint_schema = kcu.constraint_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.constraint_schema = tc.constraint_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = '${schema}'
  ORDER BY kcu.table_name, kcu.ordinal_position;
  "

  while IFS=$'\t' read -r from_table from_column to_schema to_table to_column; do
    [[ -z "${from_table:-}" ]] && continue
    [[ -z "${to_schema:-}" ]] && to_schema="$schema"
    echo "Ref: ${schema}.${from_table}.${from_column} > ${to_schema}.${to_table}.${to_column}" >>"$schema_erd"
  done < <(psql_cmd "$relation_query")
done

echo "Generated: ${OUTPUT_DIR}"
