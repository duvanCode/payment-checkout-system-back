FROM node:20-alpine AS development

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias iniciales
RUN npm install

# Copiar el resto del código
COPY . .

# Copiar script de entrada y dar permisos
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Exponer puerto
EXPOSE 3000

# Usar el script como entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]

# Comando por defecto (pasado como argumento al entrypoint)
CMD ["npm", "run", "start:dev"]
