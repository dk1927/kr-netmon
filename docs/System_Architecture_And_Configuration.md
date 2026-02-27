# SAMJIN Network Monitoring - 시스템 아키텍처 및 상세 구성 가이드 v2.1

## 1. 개요 (Overview)
본 문서는 삼진정공 전사 네트워크 인프라 자원의 실시간 가시성 확보 및 장애 대응력 강화를 위해 구축된 **통합 모니터링 텔레메트리 스택**의 아키텍처와 운영 구성을 기술합니다. 본 시스템은 전사 IT 표준인 'Customization 10 Step Logic'을 준수하며, 운영 안정성, 보안 무결성, 비즈니스 민첩성을 동시에 충족하도록 설계되었습니다.

---

## 2. 시스템 아키텍처 (System Architecture)

### 2.1 계층형 구성 (Layered Architecture)
본 시스템은 데이터 흐름에 따라 3개의 논리 계층으로 분리되어 독립적으로 작동합니다.

1.  **Collection Layer:** SNMP(Aruba Backbone), ICMP(L3, L2, Firewall, All Nodes) 수집.
2.  **Processing Layer:** Zabbix 7.0 LTS 기반 임계치 판정 및 알람 파이프라인.
3.  **Visualization Layer:** Grafana 전용 NOC 상황판을 통한 실시간 대시보드 제공.

### 2.2 네트워크 및 보안 통제 (Network Security)
*   **Inbound Policy:** 관리용 SSH(TCP 22) 및 서비스 포트(8081, 3001)는 리눅스 방화벽(UFW)에 의해 내부망에 한해 허용됨.


---

## 3. 인프라 상세 구성 (Infrastructure Details)

### 3.1 컨테이너 환경 (Podman)
*   **Rootless Execution:** 모든 서비스는 비특권 계정(`sjadmin`) 권한으로 구동되어 호스트 시스템 침투 위험을 원천 차단함.
*   **Resource Budget:** DB(4코어/4G), Server(2코어/2G) 등 컨테이너별 자원 쿼터 적용.

### 3.2 스토리지 현황 (Storage & LVM)
*   **Total Capacity:** **300GB (CONFIRMED)** - LVM 온라인 확장을 통해 초기 100GB에서 300GB로 가용 공간 증설 완료.
*   **LVM Path:** `/dev/mapper/ubuntu--vg-ubuntu--lv`
*   **Utilization:** 현재 사용량 약 10% 미만으로, 향후 5년 이상의 시계열 트렌드 보존 가능.

### 3.3 시각화 자산 (Visualization Assets)
*   **메인 대시보드:** **삼진정공 네트워크 모니터링** (관리자 직접 구성)
*   **구성 전략:** Grafana 내부에서 직접 커스터마이징한 전용 NOC 상황판을 사용하며, 코드는 별도의 JSON 익스포트를 통해 백업 관리됨.
*   **NOC 전용 레이아웃:** 천안, 울산, 전주 공장별 핵심 업링크 트래픽 및 장비 Health 상태를 가로형 그리드로 배치.

---

## 4. 운영 자동화 및 데이터 보호 (Operation & Data Protection)

### 4.1 DB 자동 백업 시스템 (Automated Backup)
*   **Script Location:** `/home/sjadmin/kr-netmon/scripts/db_backup.sh`
*   **Execution Policy:** 매일 새벽 01:00 자동 실행 (Crontab 등록).
*   **Data Retention:** 최근 30일 치 백업본을 상시 보관하며, 기간 경과 시 자동 삭제(Garbage Collection).
*   **Remote Off-site:** SCP(Secure Copy) 프로토콜을 이용한 개인 PC/NAS 2차 백업 권고.

### 4.2 시스템 복구 로드맵 (Plan B Policy)
장애 발생 시 서비스 복구 골든타임(10분 이내) 확보를 위한 절차입니다.
1.  신규 서버에 설정 폴더(`.env`, `yml` 등) 복사.
2.  `podman-compose up -d` 실행.
3.  최신 SQL 백업본을 이용한 DB Import 수행.

---

## 5. 관리 및 모니터링 유지보수 (Maintenance)
*   **Log Management:** 컨테이너 로그 로테이션(10MB x 3개) 적용으로 디스크 Full 장애 방지.
*   **Standard OS:** Ubuntu 24.04 LTS (Kernel 6.8+).


---
**최종 업데이트:** 2026-02-27
**작성자:** Antigravity AI (on behalf of SAMJIN IT)
**승인:** 전사 표준 가이드라인 준수 확인됨.
