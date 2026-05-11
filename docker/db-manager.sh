#!/bin/bash

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKUP_DIR="$SCRIPT_DIR/backups"
ENV_FILE="$SCRIPT_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Default credentials if not set in .env
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-stacks_hono}
DB_HOST="postgres" # Service name in docker-compose

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Database Manager${NC}"
echo "----------------"
echo "1. 📤 Backup Database"
echo "2. 📥 Restore Database"
echo "3. ❌ Exit"
echo ""
read -p "Select an option (1-3): " option

case $option in
    1)
        echo ""
        echo -e "${YELLOW}Starting Backup...${NC}"
        
        TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
        FILENAME="backup_${TIMESTAMP}.sql.gz"
        FILEPATH="$BACKUP_DIR/$FILENAME"
        
        # Check if docker-compose is available
        if command -v docker-compose &> /dev/null; then
            DOCKER_CMD="docker-compose"
        else
            DOCKER_CMD="docker compose"
        fi
        
        # Check if postgres container is running
        echo "   Checking status of 'postgres' container..."
        if ! $DOCKER_CMD -f "$SCRIPT_DIR/docker-compose.yml" ps -q postgres | grep -q .; then
             echo -e "${RED}❌ Postgres container is NOT running!${NC}"
             echo "   Please start the database first: docker-compose up -d postgres"
             exit 1
        fi
        
        # Run pg_dump
        echo "   Dumping database '${DB_NAME}'..."
        
        # We use -T (disable pseudo-tty allocation) to avoid carriage returns in output
        $DOCKER_CMD -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILEPATH"
        
        if [ $? -eq 0 ]; then
            FILE_SIZE=$(du -h "$FILEPATH" | cut -f1)
            echo -e "${GREEN}✅ Backup created successfully!${NC}"
            echo "   File: $FILENAME"
            echo "   Size: $FILE_SIZE"
            echo "   Path: $FILEPATH"
        else
            echo -e "${RED}❌ Backup failed!${NC}"
            # Clean up empty file if failed
            if [ -f "$FILEPATH" ]; then
                rm "$FILEPATH"
            fi
            exit 1
        fi
        ;;
        
    2)
        echo ""
        echo -e "${YELLOW}Select a backup to restore:${NC}"
        
        # List latest 10 backups
        # Using ls -t to sort by modification time (newest first)
        # We store files in an array
        files=($(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -n 10))
        
        if [ ${#files[@]} -eq 0 ]; then
            echo -e "${RED}❌ No backups found in $BACKUP_DIR${NC}"
            exit 1
        fi
        
        i=1
        for file in "${files[@]}"; do
            filename=$(basename "$file")
            size=$(du -h "$file" | cut -f1)
            timestamp=$(date -r "$file" "+%Y-%m-%d %H:%M:%S")
            echo "$i) $filename ($size) - $timestamp"
            ((i++))
        done
        
        echo ""
        read -p "Enter number to restore (or 0 to cancel): " selection
        
        if [[ ! "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#files[@]} ]; then
            if [ "$selection" -eq 0 ]; then
                echo "Cancelled."
                exit 0
            fi
            echo -e "${RED}❌ Invalid selection.${NC}"
            exit 1
        fi
        
        # Get selected file
        SELECTED_FILE="${files[$((selection-1))]}"
        echo ""
        echo -e "You selected: ${YELLOW}$(basename "$SELECTED_FILE")${NC}"
        echo -e "${RED}⚠️  WARNING: This will OVERWRITE the current database '${DB_NAME}'!${NC}"
        read -p "Are you sure you want to proceed? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            echo "Restore cancelled."
            exit 0
        fi
        
        echo ""
        echo -e "${YELLOW}Restoring database...${NC}"
        
        # Check docker command
        if command -v docker-compose &> /dev/null; then
            DOCKER_CMD="docker-compose"
        else
            DOCKER_CMD="docker compose"
        fi
        
        # 1. Clean existing schema
        echo "   Cleaning existing data..."
        $DOCKER_CMD -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to clean database. Restore aborted.${NC}"
            exit 1
        fi
        
        # 2. Restore
        echo "   Importing dump..."
        gunzip -c "$SELECTED_FILE" | $DOCKER_CMD -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Database restored successfully!${NC}"
        else
            echo -e "${RED}❌ Restore failed!${NC}"
            exit 1
        fi
        ;;
        
    3)
        echo "Exiting."
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid option.${NC}"
        exit 1
        ;;
esac
