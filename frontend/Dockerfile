FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# envsubst (from gettext) is used by the entrypoint to render the nginx config
RUN apk add --no-cache gettext

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Config is rendered from a template at runtime (see docker-entrypoint.sh) so the
# listen port and backend URL can be set per environment (local vs Railway).
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.railway.sh
RUN chmod +x /docker-entrypoint.railway.sh

# Expose port (documentation only; actual port comes from $PORT at runtime)
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.railway.sh"]
