FROM --platform=$BUILDPLATFORM node:20 as build
ENV NODE_ENV=production

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages packages

RUN yarn install --network-timeout 1000000

COPY . .
RUN yarn build

FROM nginx:mainline-alpine

ARG DATE_ARG=""
ARG BUILD_ARG=0
ARG VERSION_ARG="v0.1.18"
ENV VERSION=$VERSION_ARG

LABEL org.opencontainers.image.created=${DATE_ARG}
LABEL org.opencontainers.image.revision=${BUILD_ARG}
LABEL org.opencontainers.image.version=${VERSION_ARG}
LABEL org.opencontainers.image.source=https://github.com/dockur/snort/
LABEL org.opencontainers.image.url=https://hub.docker.com/r/dockurr/snort/

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/app/build /usr/share/nginx/html
