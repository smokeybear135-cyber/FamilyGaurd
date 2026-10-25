FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY vendor ./vendor
RUN mkdir -p /data && chown -R node:node /data /app
ENV NODE_ENV=production PORT=3000 FAMILYGUARD_DATA_DIR=/data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
