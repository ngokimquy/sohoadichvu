# Docker Nginx + Node.js Application

This project sets up a Docker environment with nginx as a reverse proxy forwarding requests to a Node.js application running on port 3000.

## Project Structure

```
nginx/
├── docker-compose.yml      # Docker Compose configuration
├── nginx.conf             # Nginx configuration
├── nodeapp/
│   ├── Dockerfile         # Node.js Dockerfile
│   ├── package.json       # Node.js dependencies
│   ├── server.js          # Node.js application
│   └── .dockerignore      # Docker ignore file
├── .gitignore             # Git ignore file
└── README.md              # This file
```

## Quick Start

1. **Start the application:**
   ```bash
   docker-compose up -d
   ```

2. **Check the logs:**
   ```bash
   # View all logs
   docker-compose logs -f
   
   # View nginx logs
   docker-compose logs -f nginx
   
   # View Node.js app logs
   docker-compose logs -f nodeapp
   ```

3. **Test the application:**
   ```bash
   # Test main endpoint
   curl http://localhost/
   
   # Test health endpoint
   curl http://localhost/health
   
   # Test API endpoint
   curl http://localhost/api/users
   
   # Test nginx health
   curl http://localhost/nginx-health
   ```

## Available Endpoints

- `GET /` - Main application endpoint
- `GET /health` - Application health check
- `GET /api/users` - Sample API endpoint
- `GET /nginx-health` - Nginx health check

## Docker Commands

```bash
# Build and start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild services
docker-compose up --build -d

# View running containers
docker-compose ps

# Scale Node.js app (if needed)
docker-compose up --scale nodeapp=3 -d

# Remove all containers and volumes
docker-compose down -v
```

## Configuration

### Nginx Configuration
- Location: `nginx.conf`
- Port: 80 (HTTP)
- Forwards all requests to Node.js app on port 3000

### Node.js Application
- Location: `nodeapp/`
- Port: 3000 (internal)
- Framework: Express.js

## Environment Variables

The Node.js application supports the following environment variables:

- `NODE_ENV` - Environment (production/development)
- `PORT` - Port number (default: 3000)

## Health Checks

Both services include health checks:
- **Nginx**: `/nginx-health` endpoint
- **Node.js**: `/health` endpoint with Docker health check

## Logs

Nginx logs are stored in a Docker volume and can be accessed via:
```bash
docker-compose exec nginx cat /var/log/nginx/access.log
docker-compose exec nginx cat /var/log/nginx/error.log
```

## Security Features

- Security headers configured in nginx
- Gzip compression enabled
- Proxy headers properly set
- Container isolation with custom network

## Troubleshooting

1. **Check container status:**
   ```bash
   docker-compose ps
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Test connectivity:**
   ```bash
   docker-compose exec nginx wget -qO- http://nodeapp:3000/health
   ```

4. **Restart services:**
   ```bash
   docker-compose restart
   ```
