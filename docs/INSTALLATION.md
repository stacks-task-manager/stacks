# Stacks Installation Guide

This guide provides comprehensive instructions for installing and deploying Stacks using Docker.

## Prerequisites

- Docker and Docker Compose installed on your system
- At least 2GB of available RAM
- 5GB of free disk space
- Internet connection for downloading dependencies

## Quick Start with Docker

### 1. Clone or Download the Release

Either clone the repository or download the release files to your server:

```bash
# If cloning the repository
git clone <repository-url>
cd stacks-hono

# Or if using release files, extract them to a directory
```

### 2. Navigate to Docker Directory

```bash
cd docker
```

### 3. Start the Services

```bash
docker-compose up -d
```

This will start three services:
- **Stacks Server** (port 3000) - Main application
- **Email Service** - Background email processing
- **PostgreSQL Database** - Data storage

### 4. Access the Application

Once all services are running, access Stacks at:
```
http://localhost:3000
```

## Environment Configuration

### Server Environment Variables

The main server requires the following environment variables. You can customize these in the `docker-compose.yml` file:

#### Core Application Settings
```bash
# Application port (default: 3000)
APP_PORT=3000

# Environment mode
NODE_ENV=production

# Enable database query logging (set to false in production)
DEBUG_DB=false

# Security secrets (CHANGE THESE IN PRODUCTION)
COOKIE_SECRET=your-secure-cookie-secret
JWT_SECRET=your-very-secure-jwt-secret

# File management
DELETE_FILES=false  # Whether to permanently delete files when users delete them
CACHE=true          # HTTP API response cache (opt-in; unset or any other value disables it)
```

#### Database Configuration
```bash
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=stacks_hono
```

#### Google OAuth (Optional)
To enable Google Calendar integration and OAuth login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add your domain/IP to authorized redirect URIs: `http://your-domain:3000/auth/google/callback`

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://your-domain:3000/auth/google/callback
```

### Email Service Environment Variables

The email service handles background email processing:

#### SMTP Configuration
```bash
# SMTP server settings
SMTP_HOST=smtp.gmail.com        # Your SMTP server
SMTP_PORT=587                   # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false               # true for SSL (port 465), false for TLS (port 587)
SMTP_USER=your-email@gmail.com  # SMTP username
SMTP_PASSWORD=your-app-password # SMTP password or app password

# Email sender information
SMTP_FROM_NAME=Stacks Notifications
SMTP_FROM_EMAIL=your-email@gmail.com

# Processing settings
EMAIL_PROCESS_INTERVAL=60000    # Check for emails every 60 seconds
PUBLIC_URL=http://localhost:3000  # Your public URL for email links
```

#### Popular SMTP Providers

**Gmail:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
# Use App Password instead of regular password
```

**Outlook/Hotmail:**
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

## Production Deployment

### 1. Security Considerations

**Change Default Secrets:**
```bash
# Generate secure random strings for these values
COOKIE_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
```

**Database Security:**
- Change the default PostgreSQL password
- Consider using a managed database service
- Enable SSL connections if possible

### 2. Custom Docker Compose

Create a production `docker-compose.yml` with your custom environment variables:

```yaml
services:
  stacks:
    build:
      context: .
      dockerfile: Dockerfile.server
    working_dir: /server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=your_db_user
      - POSTGRES_PASSWORD=your_secure_password
      - POSTGRES_DB=stacks_hono
      - APP_PORT=3000
      - DEBUG_DB=false
      - COOKIE_SECRET=your-secure-cookie-secret
      - JWT_SECRET=your-very-secure-jwt-secret
      - DELETE_FILES=false
      - CACHE=true
      - GOOGLE_CLIENT_ID=your-google-client-id
      - GOOGLE_CLIENT_SECRET=your-google-client-secret
      - GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
    volumes:
      - uploads_data:/server/uploads
      - previews_data:/server/previews
      - ./logs:/var/log
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  email:
    build:
      context: .
      dockerfile: Dockerfile.email
    working_dir: /email-service
    environment:
      - NODE_ENV=production
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=your_db_user
      - POSTGRES_PASSWORD=your_secure_password
      - POSTGRES_DB=stacks_hono
      - SMTP_HOST=your-smtp-host
      - SMTP_PORT=587
      - SMTP_SECURE=false
      - SMTP_USER=your-email@domain.com
      - SMTP_PASSWORD=your-smtp-password
      - SMTP_FROM_NAME=Your App Name
      - SMTP_FROM_EMAIL=your-email@domain.com
      - EMAIL_PROCESS_INTERVAL=60000
      - PUBLIC_URL=https://your-domain.com
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=your_db_user
      - POSTGRES_PASSWORD=your_secure_password
      - POSTGRES_DB=stacks_hono
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U your_db_user"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
  uploads_data:
    driver: local
  previews_data:
    driver: local
```

### 3. Reverse Proxy Setup

For production, use a reverse proxy like Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Maintenance

### Viewing Logs
```bash
# View all service logs
docker-compose logs

# View specific service logs
docker-compose logs stacks
docker-compose logs email
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f
```

### Updating
```bash
# Stop services
docker-compose down

# Pull latest images (if using pre-built images)
docker-compose pull

# Rebuild and start
docker-compose up -d --build
```

### Backup
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres stacks_hono > backup.sql

# Backup uploaded files
docker cp $(docker-compose ps -q stacks):/server/uploads ./uploads-backup
```

### Restore
```bash
# Restore database
docker-compose exec -T postgres psql -U postgres stacks_hono < backup.sql

# Restore uploaded files
docker cp ./uploads-backup $(docker-compose ps -q stacks):/server/uploads
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   - Change the port mapping in docker-compose.yml: `"3001:3000"`

2. **Database connection failed:**
   - Ensure PostgreSQL service is healthy: `docker-compose ps`
   - Check database credentials in environment variables

3. **Email not sending:**
   - Verify SMTP credentials and settings
   - Check email service logs: `docker-compose logs email`
   - Ensure firewall allows outbound SMTP connections

4. **Google OAuth not working:**
   - Verify redirect URI matches exactly
   - Ensure Google Calendar API is enabled
   - Check client ID and secret are correct

### Health Checks

The application includes health check endpoints:
- Server health: `http://localhost:3000/health`
- Check service status: `docker-compose ps`

## Support

For additional support:
1. Check the application logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions are up to date

---

**Note:** This installation guide assumes you're using the Docker deployment method. For development setup or custom installations, refer to the individual package documentation in the `packages/` directory.