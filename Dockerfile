FROM nginx:1.27-alpine

# Reverse proxy in front of the `site` (Next.js) and `mailer` services —
# no static files are served from this image anymore.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
