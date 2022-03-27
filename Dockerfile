# Builder
FROM node:lts AS builder
WORKDIR /usr/src/app

COPY package.json package.json

RUN npm install

# Image
FROM node:lts
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package.json package.json
COPY --from=builder /usr/src/app/node_modules node_modules
COPY src src
COPY types types
COPY tsconfig.json tsconfig.json

RUN ./node_modules/typescript/bin/tsc

EXPOSE 80

CMD ["node", "dist/index.js"]
