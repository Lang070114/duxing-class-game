FROM node:24-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN node scripts/build-standalone.mjs

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /src/standalone-dist/ ./
ENV NODE_ENV=production PORT=80 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 80
CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]
