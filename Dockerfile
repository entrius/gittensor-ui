FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 8080

RUN npm run build

CMD [ "npm", "run", "preview" ]
