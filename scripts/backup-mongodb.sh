#!/bin/bash

# Script backup MongoDB cho MediCare
# Sử dụng: ./backup-mongodb.sh

BACKUP_DIR="/var/backups/mongodb"
DB_NAME="MediCare_database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$DATE"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting MongoDB backup...${NC}"

# Tạo thư mục backup nếu chưa có
mkdir -p $BACKUP_DIR

# Backup database
echo -e "${GREEN}Backing up database: $DB_NAME${NC}"
mongodump --db $DB_NAME --out $BACKUP_PATH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backup completed successfully!${NC}"
    echo -e "${GREEN}Backup location: $BACKUP_PATH${NC}"
    
    # Compress backup
    echo -e "${GREEN}Compressing backup...${NC}"
    tar -czf "$BACKUP_PATH.tar.gz" -C $BACKUP_DIR "backup_$DATE"
    rm -rf $BACKUP_PATH
    echo -e "${GREEN}Compressed backup: $BACKUP_PATH.tar.gz${NC}"
    
    # Xóa backups cũ hơn 7 ngày
    echo -e "${YELLOW}Cleaning up old backups (older than 7 days)...${NC}"
    find $BACKUP_DIR -name "backup_*.tar.gz" -type f -mtime +7 -delete
    echo -e "${GREEN}Cleanup completed!${NC}"
else
    echo -e "${RED}Backup failed!${NC}"
    exit 1
fi

