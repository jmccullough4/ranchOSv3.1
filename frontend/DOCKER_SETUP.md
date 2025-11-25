# Docker Deployment Guide for ranchOS

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and start the container:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Local: http://localhost:8082
   - Network: http://<your-machine-ip>:8082

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t ranchos-demo:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name ranchos-command-center \
     -p 8082:8082 \
     --restart unless-stopped \
     ranchos-demo:latest
   ```

3. **View logs:**
   ```bash
   docker logs -f ranchos-command-center
   ```

## Network Access

The application is configured to listen on all network interfaces (0.0.0.0:8082) inside the container. When you expose port 8082, it will be accessible from:

- **Same machine:** http://localhost:8082
- **Local network:** http://192.168.x.x:8082 (replace with your IP)
- **Other networks:** Configure port forwarding on your router if needed

## Environment Variables

Set a custom Mapbox token:
```bash
MAPBOX_TOKEN=your_token_here docker-compose up -d
```

Or create a `.env` file:
```env
MAPBOX_TOKEN=your_mapbox_token_here
```

## Troubleshooting

**Container won't start:**
```bash
docker-compose logs
```

**Check container health:**
```bash
docker ps
# Look for "healthy" status
```

**Rebuild after code changes:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Production Deployment

For production, consider:
- Using a reverse proxy (nginx, Traefik)
- Adding SSL/TLS certificates
- Setting up monitoring
- Configuring log aggregation
- Using Docker secrets for sensitive data
