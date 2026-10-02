FROM node:22.6-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN mkdir -p storage auth

VOLUME ["/app/storage", "/app/auth"]

CMD ["node", "--experimental-strip-types", "index.ts"]
