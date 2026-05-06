FROM node:20-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/shared packages/shared

EXPOSE 4000

CMD ["sh", "-c", "pnpm --filter @localbase/api db:migrate && pnpm --filter @localbase/api dev"]
