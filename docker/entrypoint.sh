#!/bin/sh
set -e

# Aplica las migraciones pendientes sobre la BD del volumen (/data).
# En el primer arranque crea la BD; la app se auto-inicializa después.
node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma

exec node server.js
