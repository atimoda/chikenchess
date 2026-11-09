# Game server image (Colyseus). Built on the VPS by deploy/compose.yml; see DEPLOY.md.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=2567
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
USER node
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:2567/health || exit 1
CMD ["node", "src/index.mjs"]
