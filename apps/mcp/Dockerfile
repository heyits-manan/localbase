FROM node:20-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/mcp/package.json apps/mcp/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/mcp apps/mcp
COPY packages/shared packages/shared

CMD ["pnpm", "--silent", "--filter", "@localbase/mcp", "exec", "tsx", "src/index.ts"]
