FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
CMD ["node","worker.mjs"]
