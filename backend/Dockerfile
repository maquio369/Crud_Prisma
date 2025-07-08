# Dockerfile para Backend (Node.js + Express + PostgreSQL)
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el código fuente
COPY . .

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Cambiar permisos
RUN chown -R backend:nodejs /app
USER backend

# Exponer puerto 3001
EXPOSE 3001

# Comando de inicio
CMD ["npm", "start"]