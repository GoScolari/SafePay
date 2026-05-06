# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN addgroup -S safepay && adduser -S safepay -G safepay
USER safepay

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
