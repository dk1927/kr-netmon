# SAMJIN Network Monitoring - 시스템 운영 및 사용자 매뉴얼 (User Operation Manual) v2.3

본 문서는 삼진정공 통합 네트워크 모니터링 시스템의 운영 연속성 확보를 위한 **표준 운영 지침서(SOP)**입니다. 본 버전은 리눅스 서버 리소스 관리 및 백업 검증 절차를 대폭 강화하여 작성되었습니다.

---

## 1. 서비스 접속 및 기본 정보 (Access Information)

### 1.1 플랫폼 진입점
네트워크 보안 정책에 따라 관리자 전용 망(VPN 또는 특정 인트라넷)을 경유하여 접속 가능합니다.

*   **Zabbix Admin Console (장비 구성 및 알람 관리)**
    *   **접속 주소:** `http://192.168.11.31:8081`
    *   **초기 계정:** `Admin` / `zabbix` (최초 로그인 후 즉시 변경 필수)
*   **Grafana Dashboard (전사 네트워크 통합 관제 현황판)**
    *   **접속 주소:** `http://192.168.11.31:3001`
    *   **계정 정보:** `admin` / `${KR_NETMON_GRAFANA_PASSWORD}`

---

## 2. 서버 및 서비스 제어 (Server & Service Management)

모든 서비스는 `podman-compose` 인프라 위에서 구동됩니다. 명령어 실행 전 항상 `cd ~/kr-netmon`을 통해 프로젝트 루트로 이동하십시오.

### 2.1 서비스 기본 제어 (Lifecycle)
*   **서비스 전체 가동:** `podman-compose up -d` (백그라운드 실행)
*   **서비스 전체 정지:** `podman-compose stop` (데이터 안전 정지)
*   **특정 서비스 재시작:** `podman-compose restart [서비스명]` (예: `zabbix-server`)

### 2.2 상세 상태 모니터링 (Deep Inspection)
*   **컨테이너 정밀 점검:** `podman-compose ps`
    *   `STATUS`가 `Up (healthy)`가 아닌 경우 해당 컨테이너의 로그를 즉시 확인해야 합니다.
*   **실시간 자원 점유율 확인:** `podman stats --no-stream`
    *   **CPU %:** 80% 상회 시 수집 프로세스 과부하를 의미함.
    *   **MEM USAGE / LIMIT:** 설정된 예산(Limits) 내에서 안정적으로 동작하는지 확인.
*   **로그 추적 (Troubleshooting):** `podman logs -f [컨테이너명]`
    *   네트워크 통신 오류나 DB 연결 실패 등을 실시간으로 파악할 수 있는 가장 중요한 도구입니다.

---

## 3. 신규 장비 및 서버 등록 (Asset Management)

### 3.1 네트워크 장비 (SNMP 기반)
1. **장비 설정:** SNMP v2c 활성화 및 모니터링 서버 IP(`192.168.11.31`) 허용.
2. **Zabbix 등록:** `Data collection` ➔ `Hosts` ➔ `Create host`.
3. **핵심 설정:** 인터페이스(SNMP), 템플릿(Generic/Vendor 전용), 매크로(`{$SNMP_COMMUNITY}`).

### 3.2 리눅스/윈도우 서버 (Agent 기반)
1. **에이전트 설치:** 대상 서버에 Zabbix Agent 2 설치.
2. **Server IP 지정:** 에이전트 설정 파일 내 `Server=192.168.11.31` 기재.
3. **Zabbix 등록:** `Linux by Zabbix agent` 또는 `Windows by Zabbix agent` 템플릿 사용.

---

## 4. 장애 대응 및 알람 체계 (Incident Management)

### 4.1 알람 경로
*   **텔레그램:** `[삼진정공 NOC]` 채널로 실시간 장애 정보 송출.
*   **Zabbix Dashboard:** `Monitoring` ➔ `Problems`에서 전체 리스트 확인.

### 4.2 인지(Acknowledge) 프로세스
장애 발생 시 중복 보고 방지를 위해 아래 절차를 반드시 수행합니다.
1. 장애 항목의 `Ack` 클릭 ➔ 코멘트 입력(예: "회선 점검 중") ➔ `Acknowledge` 체크 ➔ `Update`.
2. 조치 완료 후 장애가 해소되면 자동으로 목록에서 사라지며 이력에 남습니다.

---

## 5. 정기 유지보수 및 리소스 최적화 (Maintenance)

### 5.1 호스트 시스템 리소스 점검
*   **디스크 사용량 정밀 확인:** `df -h`
    *   `/` 경로의 사용량이 80%를 초과하지 않도록 관리하십시오. (LVM 확장 후 현재 300GB 확보 상태)
*   **디스크 공간 확보 (Purge):** 사용하지 않는 컨테이너 이미지나 볼륨 찌꺼기가 쌓였을 때 실행합니다.
    ```bash
    podman system prune -a  # 주의: 현재 구동 중인 서비스 외 모든 미사용 리소스 삭제
    ```

### 5.2 백업 무결성 정기 검증 (Backup Verification)
자동 백업이 정상적으로 수행되었는지 매주 1회 확인합니다.
1. **파일 존재 확인:** `ls -lh /home/sjadmin/kr-netmon/backups/`
2. **용량 추이 확인:** 파일 용량이 이전 대비 현저히 줄었거나 0byte라면 설정 오류입니다. (현재 약 80MB 내외 정상)
3. **로그 확인:** `cat /home/sjadmin/kr-netmon/backups/backup_log.txt`에서 "Backup success" 메시지 확인.

---

## 6. 보안 및 네트워크 관리 (Security & Network)

### 6.1 방화벽 상태 관리 (UFW)
서버 자체 방화벽 설정을 주기적으로 점검하여 허용되지 않은 포트가 열려있지 않은지 확인합니다.
*   **상태 확인:** `sudo ufw status verbose`
*   **필수 허용 포트:** 22(SSH), 8081(Zabbix), 3001(Grafana), 10051(Zabbix Trapper).

### 6.2 보안 패치
OS 보안 업데이트가 필요한 경우 컨테이너 서비스를 잠시 중단하고 수행하는 것을 권장합니다.
```bash
podman-compose stop
sudo apt update && sudo apt upgrade -y
podman-compose up -d
```

---

## 7. 응급 장애 복구 가이드 (Disaster Recovery)

### 7.1 서비스 전면 재기동 (Hard Reset)
시스템이 응답하지 않거나 설정이 심하게 꼬였을 때 수행합니다.
```bash
cd ~/kr-netmon
podman-compose down
podman-compose up -d --build
```

### 7.2 데이터베이스 최후 복구 (Plan B)
서비스 구동은 되나 데이터가 소실된 경우 백업 파일을 복원합니다.
```bash
# 형식: cat [백업파일] | podman exec -i kr-netmon-zabbix-db psql -U zabbix zabbix
cat /home/sjadmin/kr-netmon/backups/zabbix_db_최신날짜.sql | podman exec -i kr-netmon-zabbix-db psql -U zabbix zabbix
```

---
**최종 업데이트:** 2026-02-27
**관리 책임:** 삼진정공 네트워크 관리팀
**기술 지원:** Antigravity AI Infrastructure Team
