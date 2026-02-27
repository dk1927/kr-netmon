# SAMJIN Network Monitoring - 시스템 운영 및 사용자 매뉴얼 (User Operation Manual) v2.2

본 문서는 삼진정공 통합 네트워크 모니터링 시스템의 효율적 운영과 안정적인 서비스 유지를 위한 **표준 운영 지침서(SOP)**입니다. IT 관리자가 실무 현장에서 즉각 참조할 수 있는 서비스 접속, 장비 등록, 장애 대응 및 리눅스 서버 제어 절차를 포함합니다.

---

## 1. 서비스 접속 및 기본 정보 (Access Information)

### 1.1 플랫폼 진입점
네트워크 보안 정책에 따라 관리자 전용 망(VPN 또는 특정 인트라넷)을 경유하여 접속 가능합니다.

*   **Zabbix Admin Console (장비 구성 및 알람 관리)**
    *   **접속 주소:** `http://192.168.11.31:8081`
    *   **계정 정보:** `Admin` (초기 로그인 후 즉시 비밀번호 변경 권고)
*   **Grafana Dashboard (전사 네트워크 통합 관제 현황판)**
    *   **접속 주소:** `http://192.168.11.31:3001`
    *   **계정 정보:** `admin` (비밀번호는 환경변수 `${KR_NETMON_GRAFANA_PASSWORD}` 참조)

---

## 2. 리눅스 서버 및 서비스 제어 (Server & Service Control)

모든 서비스는 `podman-compose`를 통해 통합 제어됩니다. 명령어는 반드시 프로젝트 루트 폴더(`~/kr-netmon`)에서 실행해야 합니다.

### 2.1 서비스 기본 제어
*   **서비스 가동 (Start):** `cd ~/kr-netmon && podman-compose up -d`
*   **서비스 정지 (Stop):** `cd ~/kr-netmon && podman-compose stop`
*   **서비스 재시작 (Restart):** `cd ~/kr-netmon && podman-compose restart`

### 2.2 서비스 상태 점검 (Health Check)
*   **컨테이너 구동 확인:** `podman-compose ps` (모든 STATUS가 `Up` 또는 `healthy`여야 함)
*   **자원 사용량 확인:** `podman stats --no-stream` (CPU/Memory 쿼터 준수 여부 확인)
*   **실시간 로그 확인:** `podman logs -f kr-netmon-zabbix-server` (장애 원인 파악 시 사용)

---

## 3. 신규 장비 등록 절차 (Device Provisioning)

인프라 확충 시 Zabbix에 장비를 등록해야 실시간 텔레메트리 수집이 시작됩니다.

### 단계 1: 타겟 장비 환경 설정
*   **SNMP 활성화:** 스위치/방화벽 콘솔에서 SNMP v2c/v3 서비스를 가동합니다.
*   **접근 제어:** 모니터링 서버 IP(`192.168.11.31`)의 읽기 전용(RO) 접근을 허용하도록 ACL을 설정합니다. (Community String: `samjin_monitor` 등)

### 단계 2: Zabbix 호스트 등록
1. Zabbix Web 콘솔 접속 ➔ `Data collection` ➔ `Hosts` ➔ `Create host` 클릭.
2. **Host name:** 표준 명명 규칙을 따름 (예: `L3_A_E6124_1`).
3. **Templates:** `Network Generic Device by SNMP` 또는 제조사 전용 템플릿(ArubaOS-CX 등)을 지정합니다.
4. **Interfaces:** `Add` ➔ `SNMP` ➔ 해당 장비 IP와 포트(161) 입력.
5. **Macros:** `{$SNMP_COMMUNITY}` 매크로 값에 장비에 설정된 문자열을 입력합니다.

---

## 4. 장애 알람 및 대응 체계 (Alert & Incident Response)

### 4.1 알람 전송 체계
시스템은 임계치 위반 시 실시간으로 통합 알림을 전송합니다.
*   **텔레그램(Telegram) 고가용 채널:** 장애 심각도(`Disaster`, `High`, `Warning`)와 함께 장애 발생 장비 및 항목명을 전송합니다.

### 4.2 장애 인지(Acknowledge) 처리 규칙
중복 알람 방지와 이력 관리를 위해 장애 발생 시 반드시 '인지 처리'를 수행해야 합니다.
1. Zabbix ➔ `Monitoring` ➔ `Problems` 이동.
2. 해당 장애 항목의 `Ack` 열을 클릭하여 인지 메시지(예: "천안공장 현장 확인 중") 작성 후 `Update` 클릭.
3. 조치가 완료되면 자동으로 `Resolved` 상태로 전환됩니다.

---

## 5. 통합 관제 대시보드 활용 (Visualization)

관리자가 직접 설계한 **"삼진정공 네트워크 모니터링"** 대시보드를 활용합니다.

*   **가변 변수(Variables) 필터링:** 상단의 `Group`, `Host`, `Port` 필터를 사용하여 특정 섹션만 조회.
*   **키오스크 모드 (Kiosk Mode):** 관제 센터 전시 시 우측 상단 `TV 아이콘` 클릭.
*   **데이터 내보내기:** 위젯 메뉴 ➔ `Inspect` ➔ `Data` ➔ `Download CSV`.

---

## 6. 정기 유지보수 및 데이터 보호 (Maintenance)

### 6.1 시스템 리소스 관리
*   **디스크 용량 확인:** `df -h` (LVM 확장 후 총 300GB 가용 여부 점검)
*   **프로젝트 용량 점검:** `du -sh ~/kr-netmon`

### 6.2 데이터 백업 관리
*   **자동 백업:** 매일 새벽 1시 자동 수행 (`/home/sjadmin/kr-netmon/backups/`)
*   **수동 백업 실행:** `~/kr-netmon/scripts/db_backup.sh`
*   **외부 복사 권고:** 주 1회 SCP를 이용한 개인 PC 2차 백업 수행.

---

## 7. 응급 조치 및 장애 복구 (Emergency Plan)

### 7.1 서비스 초기화
설정이 꼬이거나 불능 상태일 때 강제 재빌드 및 재가동을 수행합니다.
```bash
cd ~/kr-netmon
podman-compose down
podman-compose up -d --build
```

### 7.2 데이터베이스 복구 (Plan B)
시스템 치명적 오류 시 `Backup_Recovery_Guide.md`의 절차에 따라 최신 SQL 백업본을 임포트합니다.

---
**최종 업데이트:** 2026-02-27
**관리 책임:** 삼진정공 네트워크 관리팀
**기술 지원:** Antigravity AI Infrastructure Team
