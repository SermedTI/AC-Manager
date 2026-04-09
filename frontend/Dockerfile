FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json tsconfig.base.json ./

# Copy shared and frontend package manifests
COPY shared/package.json shared/
COPY frontend/package.json frontend/

# Install all workspace dependencies
RUN npm ci --workspace=@ac/shared --workspace=frontend --include-workspace-root

# Copy source code
COPY shared/ shared/
COPY frontend/ frontend/

# Build shared then frontend
RUN npm run build -w shared && npm run build -w frontend

# ------- nginx to serve static + proxy API -------
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
