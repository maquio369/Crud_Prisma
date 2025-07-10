# Dockerfile para Frontend (React + Vite)
# Etapa 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

# Crear variables de entorno para el build

ENV VITE_BACKEND_URL=
ENV VITE_BACKEND_HEALTH_URL=/health
ENV VITE_API_BASE_URL=/api
# Construir la aplicación
RUN npm run build

# Etapa 2: Producción con Nginx
FROM nginx:alpine

# Copiar configuración personalizada de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de Nginx (crearemos este archivo)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
