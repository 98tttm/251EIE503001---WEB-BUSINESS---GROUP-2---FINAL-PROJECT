#!/bin/bash

# Script restore MongoDB cho MediCare
# Sử dụng: ./restore-mongodb.sh <backup_file.tar.gz>

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    echo "Example: $0 /var/backups/mongodb/backup_20250101_120000.tar.gz"
    exit 1
fi

BACKUP_FILE=$1
DB_NAME="MediCare_database"
TEMP_DIR="/tmp/mongodb_restore_$$"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will replace the current database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    exit 0
fi

echo -e "${GREEN}Extracting backup...${NC}"
mkdir -p $TEMP_DIR
tar -xzf $BACKUP_FILE -C $TEMP_DIR

echo -e "${GREEN}Restoring database: $DB_NAME${NC}"
mongorestore --db $DB_NAME --drop $TEMP_DIR/backup_*/$DB_NAME

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Restore completed successfully!${NC}"
    rm -rf $TEMP_DIR
else
    echo -e "${RED}Restore failed!${NC}"
    rm -rf $TEMP_DIR
    exit 1
fi

