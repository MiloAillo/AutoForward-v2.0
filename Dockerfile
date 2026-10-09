FROM node:22-alpine

WORKDIR /app

# Copy package files and Prisma config
COPY package*.json prisma7.config.ts tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Copy application code
COPY . .

# Generate Prisma Client (with dummy DATABASE_URL for build)
ENV DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
RUN npx prisma generate

# Create required directories
RUN mkdir -p storage/media auth

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Volumes for persistence
VOLUME ["/app/storage", "/app/auth"]

# Run entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
