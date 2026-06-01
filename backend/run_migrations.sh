#!/bin/bash
# Script para rodar migrations antes de iniciar o servidor no Render

echo "🔄 Rodando Alembic migrations..."
cd /opt/render/project/src/backend
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migrations completadas com sucesso!"
    exit 0
else
    echo "❌ Erro ao rodar migrations"
    exit 1
fi
