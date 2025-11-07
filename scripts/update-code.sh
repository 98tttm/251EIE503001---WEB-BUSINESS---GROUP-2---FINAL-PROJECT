#!/bin/bash

# Script update code từ Git repository
# Sử dụng: ./update-code.sh [branch]

set -e

PROJECT_DIR="/var/www/medicare"
BRANCH=${1:-main}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cd $PROJECT_DIR

log_info "Pulling latest code from branch: $BRANCH"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

log_info "Code updated successfully!"
log_info "Run './deploy.sh all' to deploy changes"

