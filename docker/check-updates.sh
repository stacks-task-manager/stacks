#!/bin/bash

# Configuration
REPO_OWNER="stacks"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🔍 Checking for updates..."

# Function to compare versions
# Returns 0 if equal, 1 if v1 > v2, 2 if v2 > v1
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# Global array to store updates
# Format: "name|dir_name|current_ver|new_ver|download_url|zip_filename"
UPDATES=()

# Function to check service
check_service() {
    local name=$1
    local dir_name=$2
    local repo=$3
    local tag_prefix=$4

    local full_path="$SCRIPT_DIR/$dir_name"

    echo ""
    echo -e "📦 Checking ${YELLOW}${name}${NC} (repo: ${repo})..."

    # Check if package.json exists
    if [ ! -f "$full_path/package.json" ]; then
        echo -e "   ${YELLOW}⚠️  Package.json not found for ${name} at $dir_name/package.json${NC}"
        # We might still want to check for updates if the folder is missing but the repo exists
        # But for now, let's assume we are updating existing services.
        # If the folder doesn't exist, we can't compare versions easily unless we default to 0.0.0
    fi

    local current_version="0.0.0"
    if [ -f "$full_path/package.json" ]; then
        current_version=$(grep '"version":' "$full_path/package.json" | head -n 1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
    fi

    if [ -z "$current_version" ]; then
        current_version="0.0.0"
    fi

    echo "   Current version: $current_version"

    # Construct API URL for the LATEST release
    local url="https://api.github.com/repos/${REPO_OWNER}/${repo}/releases/latest"
    # echo "   Checking URL: $url"

    # Fetch latest release (unauthenticated)
    response=$(curl -s -H "Accept: application/vnd.github.v3+json" -H "User-Agent: bash-update-checker" "$url")

    # Check for errors in response
    if echo "$response" | grep -q "\"message\":"; then
        local message=$(echo "$response" | grep "\"message\":" | head -n 1 | sed -E 's/.*"message": "([^"]+)".*/\1/')
        if [ "$message" == "Not Found" ]; then
             echo -e "   ${YELLOW}⚠️  No releases found or repo is private.${NC}"
             return
        else
             echo -e "   ${RED}❌ GitHub API Error: $message${NC}"
             return
        fi
    fi

    # Parse latest version from tag_name
    local latest_tag=$(echo "$response" | grep -o '"tag_name": *"[^"]*"' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')

    if [ -z "$latest_tag" ]; then
        echo -e "   ${YELLOW}⚠️  Could not parse tag_name from response.${NC}"
        return
    fi

    # Remove prefix to get version number
    remote_version=${latest_tag#$tag_prefix}
    echo "   Latest GitHub version: $remote_version"

    if version_gt "$remote_version" "$current_version"; then
        echo -e "   ${GREEN}🚀 Update available!${NC}"

        local download_url=$(echo "$response" | grep -o '"browser_download_url": *"[^"]*"' | grep ".zip" | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')

        if [ -z "$download_url" ]; then
            echo -e "   ${RED}❌ No zip asset found in release.${NC}"
            return
        fi

        local filename="${name}-${latest_tag}.zip"
        UPDATES+=("$name|$dir_name|$current_version|$remote_version|$download_url|$filename")
    else
        echo -e "   ${GREEN}✅ Up to date.${NC}"
    fi
}

# Define services
# Format: name path repo tag_prefix
check_service "email-service" "email-service" "stacks-teams-email" "v"
check_service "server" "server" "stacks-teams-server" "v"
check_service "db" "db" "stacks-teams-db" "v"

# If no updates, exit
if [ ${#UPDATES[@]} -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✨ All services are up to date.${NC}"
    exit 0
fi

echo ""
echo "---------------------------------------------------"
echo -e "${YELLOW}Updates Summary:${NC}"
for update in "${UPDATES[@]}"; do
    IFS='|' read -r name dir_name current_ver new_ver url filename <<< "$update"
    echo -e " - ${GREEN}${name}${NC}: $current_ver -> $new_ver"
done
echo "---------------------------------------------------"

# 1. Ask for confirmation to proceed with download
echo ""
read -p "Do you want to proceed with the download? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Update cancelled by user."
    exit 0
fi

# Download files
DOWNLOADED_FILES=()
echo ""
echo "⬇️  Downloading updates..."
for update in "${UPDATES[@]}"; do
    IFS='|' read -r name dir_name current_ver new_ver url filename <<< "$update"

    full_path="${SCRIPT_DIR}/${filename}"
    echo "   Downloading $name to $filename..."
    curl -L -o "$full_path" "$url"

    if [ $? -eq 0 ]; then
         echo -e "   ${GREEN}✨ Downloaded.${NC}"
         DOWNLOADED_FILES+=("$update")
    else
         echo -e "   ${RED}❌ Download failed for $name.${NC}"
    fi
done

if [ ${#DOWNLOADED_FILES[@]} -eq 0 ]; then
    echo "❌ No updates downloaded successfully."
    exit 1
fi

# 2. Ask for confirmation to stop Docker
echo ""
read -p "Do you want to stop Docker containers? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        echo "🛑 Stopping Docker containers..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" down
    else
        echo "⚠️  docker-compose.yml not found in $SCRIPT_DIR. Skipping docker stop."
    fi
fi

# 3 & 4. Backup and Update
echo ""
echo "🔄 Applying updates..."

for update in "${DOWNLOADED_FILES[@]}"; do
    IFS='|' read -r name dir_name current_ver new_ver url filename <<< "$update"

    zip_path="${SCRIPT_DIR}/${filename}"
    target_dir="${SCRIPT_DIR}/${dir_name}"
    backup_dir="${SCRIPT_DIR}/${dir_name}_bak"

    echo -e "   Updating ${YELLOW}${name}${NC}..."

    # Backup
    if [ -d "$target_dir" ]; then
        if [ -d "$backup_dir" ]; then
             echo "      Removing old backup..."
             rm -rf "$backup_dir"
        fi
        echo "      Backing up current version..."
        mv "$target_dir" "$backup_dir"
    fi

    # Unzip
    # We unzip to SCRIPT_DIR because the zip usually contains the folder structure
    # However, we need to be careful.
    # If the zip contains "dist/" or "email-service/", we need to handle it.
    # Based on previous tasks, we ensured "email-service" zip contains "email-service/" folder.
    # So unzipping to SCRIPT_DIR should place it correctly.

    echo "      Unzipping..."
    unzip -q "$zip_path" -d "$SCRIPT_DIR"

    # Check if extraction was successful
    if [ -d "$target_dir" ]; then
        echo -e "      ${GREEN}✅ Updated successfully.${NC}"
        # Cleanup zip
        rm "$zip_path"
    else
        echo -e "      ${RED}❌ Update failed: Expected directory $target_dir not created.${NC}"
        # Try to restore backup?
        if [ -d "$backup_dir" ]; then
            echo "      Restoring backup..."
            mv "$backup_dir" "$target_dir"
        fi
    fi
done

# 5. Ask for confirmation to restart Docker
echo ""
read -p "Do you want to restart Docker containers? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        echo "🚀 Starting Docker containers..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
    else
        echo "⚠️  docker-compose.yml not found. Skipping docker start."
    fi
fi

echo ""
echo -e "${GREEN}✨ Update process completed.${NC}"
