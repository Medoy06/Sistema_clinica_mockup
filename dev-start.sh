#!/bin/bash

echo "🏥 Iniciando Sistema Clínica..."

# Start Docker containers
cd ~/clinic-system
docker compose up -d
sleep 3

# Get the correct DB host IP
DB_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "📡 DB Host detectado: $DB_IP"

# Update backend .env
sed -i "s/^DB_HOST=.*/DB_HOST=$DB_IP/" ~/clinic-system/backend/.env
echo "✅ Backend .env actualizado"

echo ""
echo "▶  Inicia el backend:  cd ~/clinic-system/backend && npm run dev"
echo "▶  Inicia el frontend: cd ~/clinic-system/frontend && npm run dev"
sed -i "s/^DB_HOST=.*/DB_HOST=$DB_IP/" ~/clinic-system/backend/.env
sed -i "s/^DB_PORT=.*/DB_PORT=5433/" ~/clinic-system/backend/.env
