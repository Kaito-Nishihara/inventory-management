FROM node:24-bookworm-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
