FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/folio.db
ENV PORT=3000

EXPOSE 3000
USER node

CMD ["npm", "start"]
