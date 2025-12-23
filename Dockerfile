FROM node:20-alpine AS web_build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY vite.config.js index.html ./
COPY client ./client
COPY public ./public

ARG API_TOKEN
ARG VITE_API_TOKEN
RUN VITE_API_TOKEN="${VITE_API_TOKEN:-$API_TOKEN}" npm run build

FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends gcc g++ build-essential libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server ./server
COPY images ./images
COPY index.html ./index.html
COPY --from=web_build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

CMD ["python3", "/app/server/server.py"]

