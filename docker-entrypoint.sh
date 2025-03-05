#!/bin/bash
set -e

echo "Starting database migration..."
pnpm db:migrate

echo "Starting application..."
pnpm start