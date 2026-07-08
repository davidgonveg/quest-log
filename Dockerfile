# --- Etapa 1: dependencias -------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Etapa 2: build ---------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Las páginas son force-dynamic, así que el build no toca la BD,
# pero Prisma exige que la variable exista.
ENV DATABASE_URL="file:/data/quest.db"
RUN npx prisma generate && npm run build

# --- Etapa 3: CLI de Prisma aislado (para migrate deploy en el arranque) ----
FROM node:22-alpine AS prisma-cli
WORKDIR /cli
RUN npm install --no-save --loglevel=error prisma@6.19.3

# --- Etapa 4: runtime -------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# openssl para los engines de Prisma en Alpine
RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app

# CLI de Prisma con todas sus dependencias; el standalone de Next
# se copia encima y ambos árboles de node_modules se fusionan.
COPY --from=prisma-cli /cli/node_modules ./node_modules

# Servidor standalone de Next (incluye las node_modules que traza)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Esquema y migraciones
COPY --from=build /app/prisma ./prisma

COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh && mkdir -p /data && chown -R app:app /data /app

USER app
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
