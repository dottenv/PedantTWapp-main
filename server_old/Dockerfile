FROM node:20-alpine

WORKDIR /app

# Создаем папки для данных
RUN mkdir -p /app/data/uploads

COPY package*.json ./
RUN npm install

COPY . .

# Инициализируем данные при сборке
RUN node init-data.js

EXPOSE 3001

CMD ["npm", "run", "dev"]