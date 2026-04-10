FROM node:20-alpine AS base

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json tsconfig.base.json ./

# Copy shared and backend package manifests
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY backend/prisma backend/prisma/

# Install all workspace dependencies
RUN npm ci --workspace=@ac/shared --workspace=@ac/backend --include-workspace-root

# Copy source code
COPY shared/ shared/
COPY backend/ backend/

# Build shared first, then backend
RUN npm run build -w shared && npm run build -w backend

# Generate Prisma client
RUN npx -w backend prisma generate

# ------- production image -------
FROM node:20-alpine

WORKDIR /app

COPY --from=base /app/package.json /app/package-lock.json /app/tsconfig.base.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/shared ./shared
COPY --from=base /app/backend ./backend

# Create uploads directory
RUN mkdir -p /app/backend/uploads/attachments /app/backend/uploads/qrcodes

WORKDIR /app/backend

EXPOSE 3333

CMD ["node", "dist/index.js"]
