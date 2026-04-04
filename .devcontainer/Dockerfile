FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y \
    locales curl git sudo \
    && sed -i -e 's/# ja_JP.UTF-8 UTF-8/ja_JP.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

ENV LANG=ja_JP.UTF-8
ENV TZ=Asia/Tokyo

RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node
WORKDIR /app/try-cloudflare-worker

USER node
CMD ["sleep", "infinity"]