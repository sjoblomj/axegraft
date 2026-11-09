# Public hosting only. The editor itself needs no server or image.
FROM node:22-alpine
WORKDIR /app
COPY index.html styles.css ./
COPY catalog ./catalog
COPY src ./src
COPY assets ./assets
COPY images ./images
COPY hosting/server.js ./hosting/server.js
ENV SITE_DIR=/app DATA_DIR=/data PORT=8080
EXPOSE 8080
CMD ["node", "hosting/server.js"]
