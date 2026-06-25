FROM node:20-alpine AS builder

RUN apk add --no-cache unzip p7zip

WORKDIR /app

COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY package*.json ./

RUN npm install
RUN cd server && npm install
RUN cd client && npm install

COPY server/ ./server/
COPY client/ ./client/
COPY .env.example ./.env

RUN cd client && npm run build

FROM node:20-alpine

RUN apk add --no-cache unzip p7zip openssl

WORKDIR /app

COPY server/package*.json ./server/
COPY --from=builder /app/server/node_modules ./server/node_modules/
COPY server/ ./server/

COPY --from=builder /app/client/dist ./server/public/client
COPY --from=builder /app/server/dist ./server/dist

RUN mkdir -p uploads signed manifests public/install temp logs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/server

CMD ["node", "dist/index.js"]
