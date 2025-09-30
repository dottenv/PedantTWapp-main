FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
ARG CLOUDPUB_SERVER_URL
ARG CLOUDPUB_ADMIN_URL
ENV CLOUDPUB_SERVER_URL=$CLOUDPUB_SERVER_URL
ENV CLOUDPUB_ADMIN_URL=$CLOUDPUB_ADMIN_URL
RUN npx vite build

FROM node:24-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
RUN npm i -g serve
EXPOSE 3002
CMD ["sh", "-c", "serve ./dist -p 3002 --single"]