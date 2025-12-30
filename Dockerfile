# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Copy root config
COPY package.json ./

# Copy server and client configs
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json ./client/

# Install root scripts and all dependencies
RUN npm run install:all

# Copy all source code
COPY . .

# Build frontend
RUN npm run build:client

# Final stage
FROM node:18-slim

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Install production dependencies for server
WORKDIR /app/server
RUN npm install --omit=dev

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/chat_users.db

CMD ["node", "index.js"]
