# 삼진정공 네트워크 모니터링 백업 및 복구 가이드 v2.0

본 문서는 삼진정공 'Plan B Policy'에 의거하여, 시스템 데이터의 영속성 보장과 재난 복구(Disaster Recovery) 절차를 정의합니다.

---

## 1. 자동화된 백업 체계 (Automated Backup)

현재 본 시스템은 별도의 수동 작업 없이도 매일 최신 데이터를 저장하도록 세팅되어 있습니다.

*   **백업 대상:** Zabbix 설정, 모든 수집 데이터(트래픽, 생존 현황), Grafana 환경 등
*   **백업 주기:** 매일 새벽 01:00 (자동 수행)
*   **백업 스크립트:** `/home/sjadmin/kr-netmon/scripts/db_backup.sh`
*   **파일 저장소:** `/home/sjadmin/kr-netmon/backups/`
*   **파일 형식:** `zabbix_db_YYYYMMDD_HHMMSS.sql` (PostgreSQL 덤프 파일)
*   **보관 기간:** 최신 30일 (이전 파일은 자동 삭제됨)

---

## 2. 외부 2차 백업 (Off-site Backup)

서버 자체 고장에 대비하여 일주일에 한 번 아래 명령어로 개인 PC나 NAS에 파일을 복사하는 것을 권장합니다.

**[Windows PC에서 복사하기 (PowerShell)]**
```powershell
scp sjadmin@192.168.11.31:/home/sjadmin/kr-netmon/backups/zabbix_db_날짜.sql .
```

---

## 3. 서비스 복구 절차 (Recovery / Plan B)

서버 전면 교체 또는 시스템 손상 시 아래 순서대로 복구합니다.

1.  **환경 파일 복원:**
    *   압축해둔 `kr-netmon` 폴더(설정 파일들)를 신규 서버에 배치합니다.
2.  **시스템 가동:**
    ```bash
    cd ~/kr-netmon
    podman-compose up -d
    ```
3.  **데이터 임포트 (가장 중요):**
    *   가장 최근의 백업 파일(`.sql`)을 사용하여 DB에 주입합니다.
    ```bash
    cat zabbix_db_날짜.sql | podman exec -i kr-netmon-zabbix-db psql -U zabbix zabbix
    ```
4.  **검증:**
    *   Zabbix/Grafana 웹 페이지 접속 후 데이터가 이전과 동일하게 나오는지 확인합니다.

---

## 4. 모니터링 및 관리
*   **로그 확인:** 백업이 잘 돌았는지 확인하려면 `/home/sjadmin/kr-netmon/backups/backup_log.txt` 파일을 확인하세요.
*   **용량 주의:** 현재 300GB로 넉넉하게 확장되어 있으나, 월 1회 `df -h` 명령어로 여유 공간을 점속 점검하십시오.

---
**Last Updated:** 2026-02-27
**Prepared by:** Antigravity AI
