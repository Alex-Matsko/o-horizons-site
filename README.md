# o-horizons.com — Docker Deploy

Static website for [Open Horizons IT Outsourcing](https://o-horizons.com).  
Built with nginx:alpine. No dependencies, no build step.

## Quick Start

```bash
git clone https://github.com/Alex-Matsko/o-horizons-site.git
cd o-horizons-site
docker compose up -d
```

Site will be available at **http://localhost**

## With a domain (production)

Use a reverse proxy (Traefik / nginx-proxy / Caddy) in front of this container.

```yaml
# docker-compose.prod.yml
services:
  web:
    build: .
    container_name: o-horizons-site
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ohorizons.rule=Host(`o-horizons.com`,`www.o-horizons.com`)"
      - "traefik.http.routers.ohorizons.entrypoints=websecure"
      - "traefik.http.routers.ohorizons.tls.certresolver=letsencrypt"
    networks:
      - proxy

networks:
  proxy:
    external: true
```

## Build & run manually

```bash
docker build -t o-horizons-site .
docker run -d -p 80:80 --name o-horizons-site o-horizons-site
```

## Update site

1. Edit `index.html` / `index-en.html` / `style.css`
2. Rebuild:

```bash
docker compose down
docker compose up -d --build
```

## Files

| File | Description |
|------|-------------|
| `index.html` | Russian version |
| `index-en.html` | English version |
| `style.css` | Shared stylesheet |
| `nginx.conf` | Nginx server config |
| `Dockerfile` | Docker image build |
| `docker-compose.yml` | Compose stack |
