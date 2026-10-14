# POYGA server (Fastify + WebSocket). Monorepo: rules + content + server. TypeScript tsx orqali ishga tushadi.
FROM node:22-slim AS base
ENV NODE_ENV=production PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY rules/package.json rules/
COPY content/package.json content/
COPY server/package.json server/
COPY client/package.json client/
COPY admin/package.json admin/
RUN pnpm install --frozen-lockfile --filter @poyga/server... --prod=false

FROM base AS run
# Hoisted linker: ildiz va har bir paketning ichki node_modules'i bilan birga ko'chiriladi
COPY --from=deps /app /app
COPY rules rules
COPY content content
COPY server server
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
WORKDIR /app/server
CMD ["../node_modules/.bin/tsx", "src/main.ts"]
