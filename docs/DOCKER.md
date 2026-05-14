# Docker Setup for Stacks

This document explains how to run the Stacks application using Docker.

## Prerequisites

-   Docker and Docker Compose installed on your system
-   The `releases` folder must be present with the built application

## Building the Releases Folder

Before running Docker, you need to build the server and create the releases folder:

```bash
yarn release
```

## Running with Docker Compose

1. **Start the services:**

```bash
cd release
docker-compose up -d
```

2. **View logs:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

3. **Stop the services:**

```bash
docker-compose down
```

4. **Stop and remove volumes (⚠️ This will delete all data):**
5. 
```bash
docker-compose down -v
```

## Services

### Application (app)

-   **Port:** 3001
-   **Image:** Built from local Dockerfile
-   **Volumes:**
    -   `uploads_data:/app/uploads` - File uploads storage
    -   `previews_data:/app/previews` - Preview files storage

### PostgreSQL (postgres)

-   **Port:** 5432
-   **Image:** postgres:15-alpine
-   **Volume:** `postgres_data:/var/lib/postgresql/data`
-   **Default credentials:**
    -   Database: `stacks_hono`
    -   User: `postgres`
    -   Password: `postgres`

## Environment Variables

The application uses the following environment variables (configured in docker-compose.yml):

### Database Configuration

-   `POSTGRES_HOST=postgres`
-   `POSTGRES_PORT=5432`
-   `POSTGRES_USER=postgres`
-   `POSTGRES_PASSWORD=postgres`
-   `POSTGRES_DB=stacks_hono`

### Application Configuration

-   `NODE_ENV=production`
-   `COOKIE_SECRET=s3cr3t`
-   `JWT_SECRET=your-very-secret-key`
-   `DELETE_FILES=false`

### Google OAuth (Update with your values)

-   `GOOGLE_CLIENT_ID`
-   `GOOGLE_CLIENT_SECRET`
-   `GOOGLE_REDIRECT_URI`

## Customizing Environment Variables

To customize environment variables:

1. **Option 1: Edit docker-compose.yml**
   Modify the `environment` section in the `app` service.

2. **Option 2: Use .env file**
   Create a `.env` file in the project root:

    ```bash
    # Database
    POSTGRES_PASSWORD=your_secure_password

    # Application
    JWT_SECRET=your-very-secure-jwt-secret
    COOKIE_SECRET=your-secure-cookie-secret

    # Google OAuth
    GOOGLE_CLIENT_ID=your-google-client-id
    GOOGLE_CLIENT_SECRET=your-google-client-secret
    ```

## Volumes

The setup creates three persistent volumes:

1. **postgres_data** - PostgreSQL database files
2. **uploads_data** - Application file uploads
3. **previews_data** - Generated preview files

### Managing Volumes

```bash
# List volumes
docker volume ls

# Inspect a volume
docker volume inspect stacks-hono_postgres_data

# Backup database
docker-compose exec postgres pg_dump -U postgres stacks_hono > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres stacks_hono < backup.sql
```

## Troubleshooting

### Application won't start

1. Check if the `releases` folder exists and contains `server.js`
2. Verify PostgreSQL is healthy: `docker-compose ps`
3. Check application logs: `docker-compose logs app`

### Database connection issues

1. Ensure PostgreSQL container is running: `docker-compose ps postgres`
2. Check PostgreSQL logs: `docker-compose logs postgres`
3. Verify database credentials in docker-compose.yml

### Port conflicts

If ports 3001 or 5432 are already in use, modify the port mappings in docker-compose.yml:

```yaml
ports:
    - "3002:3001" # Use port 3002 instead of 3001
```

## Development vs Production

This Docker setup is configured for production use. For development:

-   Use the existing development setup with `yarn dev` (see [INSTALLATION.md](INSTALLATION.md))
-   The Docker setup uses the bundled server.js from the releases folder
-   Environment is set to `production` mode

## Security Notes

⚠️ **Important for Production:**

1. Change default passwords in docker-compose.yml
2. Use strong, unique values for JWT_SECRET and COOKIE_SECRET
3. Configure proper Google OAuth credentials
4. Consider using Docker secrets for sensitive data
5. Run behind a reverse proxy (nginx, traefik) with SSL/TLS
