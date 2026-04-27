FROM node:22-alpine
RUN apk add --no-cache postgresql-client wget
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "src/app.js"]
