FROM oven/bun:1-slim
WORKDIR /app

COPY dist ./dist
COPY package.json ./
COPY .env.local ./.env.local

ENV PORT=8080
ENV NODE_ENV=production
ENV TABLE_NAME=necto_turnos
EXPOSE 8080

CMD ["bun", "dist/main.js"]
