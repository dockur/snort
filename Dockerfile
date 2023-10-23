FROM --platform=$BUILDPLATFORM node:21 as build

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml .
COPY .yarn .yarn
COPY packages packages

RUN yarn --network-timeout 1000000
RUN yarn build

FROM nginxinc/nginx-unprivileged:mainline-alpine

ARG DATE_ARG=""
ARG BUILD_ARG=0
ARG VERSION_ARG=0
ENV VERSION=$VERSION_ARG

LABEL org.opencontainers.image.title="Snort"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.created=${DATE_ARG}
LABEL org.opencontainers.image.revision=${BUILD_ARG}
LABEL org.opencontainers.image.version=${VERSION_ARG}
LABEL org.opencontainers.image.source="https://github.com/dockur/snort/"
LABEL org.opencontainers.image.url="https://hub.docker.com/r/dockurr/snort/"
LABEL org.opencontainers.image.description="Nostr web UI (snort.social)"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/app/build /usr/share/nginx/html

EXPOSE 8080
