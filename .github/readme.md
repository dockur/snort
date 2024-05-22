<h1 align="center">snort-docker<br />
<div align="center">
<a href="https://github.com/dockur/snort"><img src="https://raw.githubusercontent.com/dockur/snort/master/.github/logo.png" title="Logo" style="max-width:100%;" width="128" heigth="128"/></a>
</div>
<div align="center">
  
[![Build]][build_url]
[![Version]][tag_url]
[![Size]][tag_url]
[![Pulls]][hub_url]

</div></h1>

Docker image of [snort](https://github.com/v0l/snort), an UI for the [nostr](https://github.com/nostr-protocol/nostr) protocol.

See [snort.social](https://snort.social) for a demo.

## How to use

Via Docker Compose:

```yaml
services:
  snort:
    container_name: snort
    image: dockurr/snort
    ports:
        - 80:8080
```

Via Docker CLI:

```bash
docker run -it --rm -p 80:8080 dockurr/snort
```

## Stars
[![Stars](https://starchart.cc/dockur/snort.svg?variant=adaptive)](https://starchart.cc/dockur/snort)

[build_url]: https://github.com/dockur/snort/
[hub_url]: https://hub.docker.com/r/dockurr/snort/
[tag_url]: https://hub.docker.com/r/dockurr/snort/tags

[Build]: https://github.com/dockur/snort/actions/workflows/build.yml/badge.svg
[Size]: https://img.shields.io/docker/image-size/dockurr/snort/latest?color=066da5&label=size
[Pulls]: https://img.shields.io/docker/pulls/dockurr/snort.svg?style=flat&label=pulls&logo=docker
[Version]: https://img.shields.io/docker/v/dockurr/snort/latest?arch=amd64&sort=semver&color=066da5
