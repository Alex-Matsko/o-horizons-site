FROM nginx:1.27-alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all static site files
COPY . /usr/share/nginx/html/

EXPOSE 80
