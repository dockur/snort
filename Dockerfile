FROM --platform=$BUILDPLATFORM node:21 as build

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml .
COPY .yarn .yarn
COPY packages packages
COPY .git .git

RUN yarn --network-timeout 1000000
RUN yarn build

FROM nginxinc/nginx-unprivileged:mainline-alpine

ARG VERSION_ARG=0
ENV VERSION=$VERSION_ARG

LABEL org.opencontainers.image.title="Snort"
LABEL org.opencontainers.image.description="Nostr web UI (snort.social)"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/app/build /usr/share/nginx/html

EXPOSE 8080
