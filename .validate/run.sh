#!/usr/bin/env bash
# Local-only: drops + recreates the validation DB, applies the Supabase shim,
# then applies every repo migration in order. Fails loudly on the first error.
set -euo pipefail
export PGPASSWORD=postgres
PSQL="psql -v ON_ERROR_STOP=1 -h localhost -U postgres"

echo "Recreating gumbo_validate…"
$PSQL -d postgres -q -c "drop database if exists gumbo_validate;"
$PSQL -d postgres -q -c "create database gumbo_validate;"

echo "Applying shim…"
$PSQL -d gumbo_validate -q -f /workspace/.validate/00_supabase_shim.sql

for f in /workspace/supabase/migrations/*.sql; do
  echo "Applying $(basename "$f")…"
  $PSQL -d gumbo_validate -q -f "$f"
done

echo "OK — all migrations applied cleanly."
