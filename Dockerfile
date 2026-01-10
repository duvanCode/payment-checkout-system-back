FROM node:20-alpine AS development

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Exponer puerto
EXPOSE 3000

# Comando por defecto
CMD ["npm", "run", "start:dev"]
