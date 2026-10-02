FROM node:22.6-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./

RUN npm ci

COPY . .

RUN npx tsc

RUN mkdir -p storage auth

VOLUME ["/app/storage", "/app/auth"]

CMD ["node", "dist/index.js"]
