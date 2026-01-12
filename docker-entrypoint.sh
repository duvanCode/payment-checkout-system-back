#!/bin/sh

# Salir inmediatamente si un comando falla
set -e

echo "🚀 Iniciando ambiente de desarrollo..."

# 1. Instalar/Actualizar dependencias
# Esto asegura que si se agregó algo al package.json, el contenedor lo tenga
echo "📦 Instalando/Actualizando dependencias (npm install)..."
npm install

# 2. Generar Prisma Client
echo "💎 Generando Prisma Client..."
npx prisma generate

# 3. Correr migraciones pendientes
echo "🔄 Corriendo migraciones de base de datos..."
npx prisma migrate deploy

# 4. Correr semillas (Seed)
echo "🌱 Ejecutando semillas (Seed)..."
npm run prisma:seed

# 5. Ejecutar el comando pasado al contenedor (start:dev por defecto)
echo "🎬 Iniciando la aplicación..."
exec "$@"
