# Usamos Node 18
FROM node:18-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias primero (para aprovechar caché)
COPY package*.json ./

# Instalamos las librerías
RUN npm install --only=production

# Copiamos el resto del código
COPY . .

# Exponemos el puerto (esto es informativo, Render lo gestiona)
EXPOSE 3001

# Comando para arrancar
CMD ["node", "server.js"]