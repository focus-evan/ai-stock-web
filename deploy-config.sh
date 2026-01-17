#!/bin/bash

###############################################################################
# 部署配置文件
# 用途: 存储部署相关的配置信息
# 使用方法: source deploy-config.sh
###############################################################################

# 服务器配置
export SERVER_USER="root"
export SERVER_HOST="121.196.147.222"
export SERVER_PORT="22"

# 项目配置
export PROJECT_NAME="financial-data-platform"
export REMOTE_DIR="/var/www/html/${PROJECT_NAME}"
export BACKUP_DIR="backups"

# 构建配置
export BUILD_DIR="dist"
export NODE_OPTIONS="--max-old-space-size=8192"

# Nginx配置
export NGINX_CONF_DIR="/etc/nginx/sites-available"
export NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

# 备份配置
export MAX_BACKUPS=5  # 保留的最大备份数量

# 环境配置
export PRODUCTION_ENV="production"
export STAGING_ENV="staging"
export DEVELOPMENT_ENV="development"
