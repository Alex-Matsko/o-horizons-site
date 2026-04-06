FROM nginx:1.27-alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static site
COPY index.html /usr/share/nginx/html/index.html
COPY index-en.html /usr/share/nginx/html/index-en.html
COPY style.css /usr/share/nginx/html/style.css
COPY favicon.svg /usr/share/nginx/html/favicon.svg

EXPOSE 80
