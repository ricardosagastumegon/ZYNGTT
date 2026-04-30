FROM node:20-slim

# Playwright/Chromium system dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    libglib2.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxi6 libxtst6 \
    fonts-liberation libnss3 libcups2 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 libxrandr2 libgbm1 \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_HEADLESS=true

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
