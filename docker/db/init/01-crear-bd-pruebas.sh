#!/bin/sh
# Crea la base de datos de pruebas e2e la primera vez que se inicializa el volumen.
set -e

if [ -n "$DB_NAME_TEST" ]; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE "$DB_NAME_TEST"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME_TEST')\gexec
EOSQL
fi
