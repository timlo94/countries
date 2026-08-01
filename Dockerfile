FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 8080
# Replace default nginx config to listen on port 8080 (Cloud Run standard port)
RUN sed -i 's/listen       80;/listen       8080;/g' /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
