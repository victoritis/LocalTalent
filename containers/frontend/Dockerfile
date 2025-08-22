FROM node:22-alpine AS base

FROM base AS common

WORKDIR /app

FROM common AS development

# COPY . .

# RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev"]

# Etapa de producción con serve
FROM node:22-alpine AS production

WORKDIR /app

# Copiar código fuente
COPY . .

# Instalar dependencias
RUN npm ci

# Construir la aplicación
RUN npm run build

# Elimina src 
RUN rm -rf src

# Exponer puerto
EXPOSE 5173

# Usar serve con --single para SPA fallback
CMD ["npx", "serve", "-s", "dist", "-l", "5173", "--single"]

