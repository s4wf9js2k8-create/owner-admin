# syntax=docker/dockerfile:1
FROM node:22-alpine AS frontend
WORKDIR /ui
COPY . .
# Install/build/clean in one layer to keep VFS/Windows builds small.
RUN --mount=type=secret,id=proxy_ca if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; npm ci && npm run build && rm -rf node_modules
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node server/ ./
RUN --mount=type=secret,id=proxy_ca if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; npm ci --omit=dev && mkdir -p /data/uploads /data/recovery && chown -R node:node /data
COPY --from=frontend /ui/dist ./web
USER node
EXPOSE 3000
CMD ["node","src/index.js"]
