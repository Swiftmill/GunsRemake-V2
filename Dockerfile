FROM node:22-bullseye-slim
WORKDIR /app
COPY backend ./backend
COPY scripts ./scripts
RUN mkdir -p /data/guns
ENV GUNS_DATA_DIR=/data/guns
WORKDIR /app/backend
CMD ["npm", "start"]
