#!/bin/bash

# Clean script to remove specified directories and files
# To add new cleanup targets, simply add them to the arrays below

echo "Starting cleanup process..."

# Define cleanup targets as arrays
# Format: "path:description"
# Note: Do not add yarn.lock (root or packages) — keep the lockfile for reproducible installs and CI.
CLEANUP_TARGETS=(
    "node_modules:Root workspace node_modules"
    "packages/app/node_modules:App package node_modules"
    "packages/app/build:App package build directory"
    "packages/server/node_modules:Server package node_modules"
    "packages/server/dist:Server package dist directory"
    "packages/types/node_modules:Types package node_modules"
    "packages/types/dist:Types package dist directory"
    "packages/types/*.tgz:Types package tgz files"
    "packages/email-service/dist:Email service dist directory"
    "packages/email-service/node_modules:Email service node_modules directory"
    "packages/db/*.tgz:Db package tgs files"
    "packages/db/dist:Db dist folder"
    "packages/db/build:Db build folder"
    "packages/db/node_modules:Db node_modules folder"
    "packages/license/node_modules:License node_modules folder"
    "packages/license/dist:License dist folder"
    "packages/translations/node_modules:Translations package node_modules"
    "packages/translations/dist:Translations package dist directory"
    "test-results:Playwright test results"
    "releases:Releases directory"
)

# Function to clean a single target
clean_target() {
    local target="$1"
    local description="$2"
    
    # Handle glob patterns (files with *)
    if [[ "$target" == *"*"* ]]; then
        if ls $target 1> /dev/null 2>&1; then
            echo "Removing $description..."
            rm -f $target
        else
            echo "$description not found, skipping..."
        fi
    else
        # Handle directories and regular files
        if [ -e "$target" ]; then
            echo "Removing $description..."
            rm -rf "$target"
        else
            echo "$description not found, skipping..."
        fi
    fi
}

# Process all cleanup targets
for item in "${CLEANUP_TARGETS[@]}"; do
    # Split the item into path and description
    IFS=':' read -r path description <<< "$item"
    clean_target "$path" "$description"
done

echo "Cleanup complete!"