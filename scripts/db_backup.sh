#!/bin/bash
# 삼진정공 네트워크 모니터링 DB 자동 백업 (정규화 버전)
BACKUP_DIR="/home/sjadmin/kr-netmon/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 폴더가 혹시 없으면 자동 생성
mkdir -p $BACKUP_DIR

# DB 덤프 실행 (현행 DB명: zabbix)
podman exec kr-netmon-zabbix-db pg_dump -U zabbix zabbix > $BACKUP_DIR/zabbix_db_$DATE.sql

# 30일 지난 파일 삭제
find $BACKUP_DIR -name "zabbix_db_*.sql" -mtime +30 -delete

echo "Backup success: $BACKUP_DIR/zabbix_db_$DATE.sql"
