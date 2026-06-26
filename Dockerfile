FROM node:20-alpine AS builder

RUN apk add --no-cache unzip p7zip

WORKDIR /app

COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN cd server && npm ci
RUN cd client && npm ci

COPY server/ ./server/
COPY client/ ./client/
COPY .env.example ./.env

RUN cd server && npm run build
RUN cd client && npm run build

FROM node:20-alpine

RUN apk add --no-cache unzip p7zip openssl

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/src ./server/src
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./server/public/client

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/server

CMD ["node", "dist/index.js"]
