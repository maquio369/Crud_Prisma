# Dockerfile para Frontend (React + Vite) - Versión con debug
FROM node:18-alpine AS builder

WORKDIR /app

# Debug: Verificar Node y npm
RUN echo "Node version:" && node --version && echo "NPM version:" && npm --version

# Copiar archivos de dependencias
COPY package*.json ./

# Debug: Mostrar archivos copiados
RUN ls -la

# Instalar dependencias con logs
RUN npm ci --verbose

# Debug: Verificar que ExcelJS esté instalado
RUN npm list exceljs || echo "ExcelJS no encontrado"

# Copiar código fuente
COPY . .

# Debug: Verificar archivos copiados
RUN ls -la src/

# Variables de entorno
ENV VITE_BACKEND_URL=
ENV VITE_BACKEND_HEALTH_URL=/health
ENV VITE_API_BASE_URL=/api
ENV NODE_ENV=production

# Debug: Verificar variables de entorno
RUN env | grep VITE

# Construir con logs detallados
RUN npm run build --verbose

# Debug: Verificar que dist se creó
RUN ls -la dist/

# Etapa 2: Producción
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]