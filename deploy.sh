#!/bin/bash

# Script deploy tự động cho MediCare
# Sử dụng: ./deploy.sh [client|admin|backend|all]

set -e  # Exit on error

PROJECT_DIR="/var/www/medicare"
BACKEND_DIR="$PROJECT_DIR/backend"
CLIENT_DIR="$PROJECT_DIR/my_client"
ADMIN_DIR="$PROJECT_DIR/my_admin"
CLIENT_WEB_DIR="/var/www/medicare/client"
ADMIN_WEB_DIR="/var/www/medicare/admin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

deploy_backend() {
    log_info "Deploying Backend..."
    
    cd $BACKEND_DIR
    
    log_info "Installing dependencies..."
    npm install --production
    
    log_info "Creating logs directory..."
    mkdir -p logs
    
    log_info "Restarting PM2..."
    pm2 restart medicare-backend || pm2 start ecosystem.config.js
    
    log_info "Backend deployed successfully!"
}

deploy_client() {
    log_info "Deploying Client Frontend..."
    
    cd $CLIENT_DIR
    
    log_info "Installing dependencies..."
    npm install
    
    log_info "Building production..."
    npm run build
    
    log_info "Copying files to web directory..."
    sudo rm -rf $CLIENT_WEB_DIR/*
    sudo cp -r dist/my_client/browser/* $CLIENT_WEB_DIR/
    sudo chown -R www-data:www-data $CLIENT_WEB_DIR
    
    log_info "Client deployed successfully!"
}

deploy_admin() {
    log_info "Deploying Admin Frontend..."
    
    cd $ADMIN_DIR
    
    log_info "Installing dependencies..."
    npm install
    
    log_info "Building production..."
    npm run build
    
    log_info "Copying files to web directory..."
    sudo rm -rf $ADMIN_WEB_DIR/*
    sudo cp -r dist/my_admin/browser/* $ADMIN_WEB_DIR/
    sudo chown -R www-data:www-data $ADMIN_WEB_DIR
    
    log_info "Admin deployed successfully!"
}

deploy_all() {
    log_info "Deploying all components..."
    deploy_backend
    deploy_client
    deploy_admin
    log_info "All components deployed successfully!"
}

# Main
case "$1" in
    backend)
        deploy_backend
        ;;
    client)
        deploy_client
        ;;
    admin)
        deploy_admin
        ;;
    all|"")
        deploy_all
        ;;
    *)
        echo "Usage: $0 [backend|client|admin|all]"
        exit 1
        ;;
esac

log_info "Deployment completed!"

