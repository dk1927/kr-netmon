# SAMJIN Network Monitoring - 컨테이너 구조 및 내부 통신망 명세서 (Container Architecture & Network Topology)

이 문서는 SAMJIN 네트워크 모니터링 시스템을 구성하는 `Rootless Podman` 기반의 컨테이너 아키텍처, 내부 가상 네트워크(Internal Network), 그리고 데이터 흐름(Data Flow)을 상세히 설명하기 위해 작성되었습니다.

---

## 1. 스택(Stack) 격리 구조 개요

시스템은 보안성(Security Gating)과 무장애(Fail-Safe) 설계를 충족하기 위해, 단일 OS(호스트) 위에 모든 것을 설치하지 않고 **역할별로 5개의 독립된 컨테이너(가상 박스)** 로 쪼개어 운용합니다. 이를 묶어주는 것이 2개의 가상 서브넷(Subnet)입니다.

### 1-1. 멀티 티어 가상 네트워크 (Virtual Networks)
컨테이너 간 패킷 방화벽 역할을 수행하기 위해 통신망을 2개로 분리(Decoupling)했습니다.

*   **`kr-netmon-backend` (폐쇄망):**
    *   **접근 권한:** 외부(Host OS 밖)에서 절대 직접 들어올 수 없는 철저한 내부용 사설망입니다.
    *   **소속:** DB 서버, 코어 데이터 수집 엔진 등 데이터가 처리되고 저장되는 컴포넌트들만 이 망에 소속됩니다.
*   **`kr-netmon-frontend` (서비스망):**
    *   **접근 권한:** 우분투 호스트(Host OS)의 UFW 방화벽을 통해 바깥 세상(사용자 PC)과 포트를 뚫고 통신할 수 있는 브릿지(Bridge) 망입니다.
    *   **소속:** Zabbix Web UI, Grafana 등 웹 서버 엔진들이 소속됩니다.

---

## 2. 컨테이너별 상세 스펙 및 역할 (Container Specs)

### 2.1. Zabbix Database (`kr-netmon-zabbix-db`)
*   **Base Image:** `docker.io/timescale/timescaledb:latest-pg16`
*   **Network:** `kr-netmon-backend` (단독 소속)
*   **주요 역할:** 모니터링 플랫폼의 심장. Zabbix가 수집한 방대한 시계열 데이터(트래픽 이력)와 환경 설정을 영구 저장합니다. 
*   **보안:** 외부포트(5432)가 아예 열려있지 않아 해킹 불가능(DB 직접 접근 금지-표준 3.2). 오직 같은 Backend 망에 있는 Zabbix Server와 Web 모듈의 접속만 허가합니다.

### 2.2. Zabbix Server Core (`kr-netmon-zabbix-server`)
*   **Base Image:** `docker.io/zabbix/zabbix-server-pgsql:alpine-7.0-latest`
*   **Network:** `kr-netmon-backend`, `kr-netmon-frontend` (양쪽 모두 소속)
*   **Port:** 외부 `10051` (Proxy나 Agent가 본점 코어로 데이터 쏠 때)
*   **주요 역할:** 1분 단위로 네트워크 스위치들을 직접 찌르며(SNMP Polling) 정보를 수집하는 "실질적 일꾼"입니다.
*   **통신:** Frontend 망으로 데이터를 수집해 와서, Backend 망에 있는 DB에 저장하는 중간 다리 통신 역할을 수행합니다.

### 2.3. Zabbix Web Interface (`kr-netmon-zabbix-web`)
*   **Base Image:** `docker.io/zabbix/zabbix-web-nginx-pgsql:alpine-7.0-latest`
*   **Network:** `kr-netmon-backend`, `kr-netmon-frontend`
*   **Port:** 외부 `8081` (내부 Nginx 8080) / 외부 `8443`
*   **주요 역할:** Zabbix의 관제 화면(UI)을 뿌려주는 웹 서버(Nginx+PHP)입니다.
*   **통신:** 우리는 `8081` 포트로 접속하지만, 컨테이너는 Backend 망의 DB에 접속하여 설정 정보를 읽고 화면을 그려냅니다.

### 2.4. Zabbix SNMP Traps (`kr-netmon-zabbix-snmptraps`)
*   **Base Image:** `docker.io/zabbix/zabbix-snmptraps:alpine-7.0-latest`
*   **Network:** `kr-netmon-frontend`
*   **Port:** 외부 `1162` (UDP)
*   **주요 역할:** 네트워크 장비(스위치/방화벽)에서 비정상적인 이벤트(포트 다운, 팬 고장 등)가 발생했을 때 장비가 스스로 Zabbix에 쏘는 긴급 알람(Trap)을 수신 받아 해석하는 전용 우체통입니다.

### 2.5. Grafana Enterprise (`kr-netmon-grafana`)
*   **Base Image:** `docker.io/grafana/grafana-enterprise:latest`
*   **Network:** `kr-netmon-frontend` (단독 소속)
*   **Port:** 외부 `3001` (내부 3000)
*   **주요 역할:** 경영진/상황실 통제용 고품질 시각화(Visualization) 화면을 제공합니다.
*   **통신 메커니즘 (중요):** 
    * DB(`kr-netmon-zabbix-db`)에 직접 붙지 않고, 같은 Frontend 망에 있는 `kr-netmon-zabbix-web` 의 API 포트(`8080`)에 통신하여 데이터를 가져옵니다. (API First Extension - 표준 3.1)
    * 따라서 내부 DNS 주소인 `http://kr-netmon-zabbix-web:8080` 으로 완벽한 서비스 메시(Service Mesh) 연동을 구현했습니다.

---

## 3. 영구 저장용 볼륨 버퍼 (Volume Mapping)
컨테이너가 파괴되거나 업데이트 되더라도, 정보가 삭제되지 않고 우분투 호스트(본체)에 영구 보존되도록 매핑한 통로들입니다. (경로 확인 명령: `du -sh`)

*   **`kr-netmon-db-data`:** 가장 중요. PostgreSQL의 실제 데이터.
*   **`./zbx_env/`:** Zabbix의 모듈, 스크립트(JS), 암호화, 트랩 파일들이 보관되는 곳.
*   **`./grafana_data/`:** Grafana의 기본 설정 DB 및 세션 데이터.
*   **`./grafana/provisioning/`:** IaC(코드형 인프라) 규정을 위해 대시보드를 코드로 관리하는 폴더.

---

## 4. 아키텍처 방어 메커니즘 요약 (Security Review)
1. **Rootless:** 모든 동작 주체가 `podman` 기반으로 OS 권한이 박탈되어 있습니다.
2. **UFW Defense:** Zabbix Web(8081), Grafana(3001), Trap 수신용(1162 UDP) 포트 외에는 호스트 OS 자체에서 어떠한 접근도 허용하지 않습니다. 컨테이너 내부 통신포트(예: 8080, 5432)는 UFW를 거치지 않으므로 안전합니다.
3. **Read-Only SNMP:** 모든 수집은 타겟 장비를 읽기(Polling)만 하도록 디자인되어, 이 시스템이 장악당하더라도 망 마비로 번지지 않습니다.
