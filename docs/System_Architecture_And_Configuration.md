# SAMJIN Network Monitoring - 시스템 아키텍처 및 상세 구성 문서 (System Architecture & Configuration)

## 1. 개요 (Overview)
본 플랫폼은 사내 네트워크 인프라 자원의 생존성 및 트래픽 현황을 모니터링하기 위해 구축된 컨테이너 기반 텔레메트리 스택입니다. 전사 커스터마이징 표준 프레임워크 10 Step Logic에 의거하여 설계되었으며, 오픈소스 제품군의 엔진 수정 없이 환경 변수 및 공식 API 확장을 통해 운영됩니다.

---

## 2. 아키텍처 구성 (Architecture Components)

네트워크 무결성 통제(Network Isolation)를 위해 논리적으로 `kr-netmon-backend`와 `kr-netmon-frontend` 영역으로 스택이 분리되어 통신합니다.

### 2.1 Backend (수집 및 스토리지 영역)
외부 네트워크 장비로부터 데이터를 수집하고 영구 보존 및 처리하는 시스템 계층입니다. 외부 사용자 접근은 차단됩니다.
1. **TimescaleDB (PostgreSQL 16 기반)**
   - 컨테이너: `kr-netmon-zabbix-db`
   - 역할: 대규모 시계열 데이터(Trend/History)의 고속 처리 및 파티셔닝 보장. 일반 관계형 DB 대비 모니터링 TPS 최적화 달성 수단.
2. **Zabbix Server (Zabbix 7.0 LTS)**
   - 컨테이너: `kr-netmon-zabbix-server`
   - 역할: SNMP(단순 네트워크 관리 프로토콜), Zabbix Agent Poller 모듈을 탑재하여 타겟 디바이스의 데이터 능동 수집(Pull) 및 임계치 검사(Trigger), 알람 스케줄러 관리.
3. **Prometheus / SNMP Exporter (선택 요소)**
   - 컨테이너: `kr-netmon-prometheus`, `kr-netmon-snmp-exporter`
   - 역할: SNMP 워크를 병렬 수집하여 Zabbix 와 별도의 Metrics 파이프라인 추가 구성 시 활용 가능한 Exporter/Scraper 스택 지원.

### 2.2 Frontend (시각화 및 접근 영역)
최종 사용자(관리자, 경영진 등)에게 데이터를 시각적으로 제공하고 인터페이스(GUI)를 렌더링하는 계층입니다.
1. **Zabbix Web UI (Nginx-PHP)**
   - 컨테이너: `kr-netmon-zabbix-web`
   - 역할: Zabbix 코어의 정책/설정을 관리(디바이스 등록, 트리거 변경, 알람 유저 관리 등)하기 위한 메인 관리 콘솔 렌더링. 포트 8081(HTTP), 8443(HTTPS) 사용.
2. **Grafana (Grafana Enterprise 릴리즈)**
   - 컨테이너: `kr-netmon-grafana`
   - 역할: 사용자 맞춤형 Dashboard 생성, Zabbix 플러그인을 활용한 데이터 연동(View 렌더링 전담). 성능 전이 방지를 위해 DB가 아닌 Web 콘솔의 API와 연결됨. 포트 3001 제공.

---

## 3. 핵심 규칙(Governance) 및 적용 사항

### 3.1 Namespace Integrity (명명 규칙 준수)
모든 커스텀 리소스 및 컨테이너, 볼륨 객체는 **`kr-netmon-`** 이라는 표준 Prefix를 의무 장착하여 타 프로젝트(Sandbox 등)와의 리소스 및 DNS 명칭 충돌을 원천 차단합니다.

### 3.2 Performance Budgeting (성능 자원 분배 통제)
과도한 트래픽 또는 악의적 새로고침으로부터 호스트 머신 셧다운을 방지하기 위한 Fail-safe 자원 쿼터가 도입되었습니다.
- **제한(Limits) / 할당(Reservations) 정책:**
  - `kr-netmon-zabbix-db`: CPU 최대 4코어, Memory 최대 4G
  - `kr-netmon-zabbix-server`: CPU 최대 2코어, Memory 최대 2G (메모리 캐시 튜닝: `ZBX_CACHESIZE=512M` 등)
  - `kr-netmon-grafana`: CPU 최대 1코어, Memory 최대 1G

### 3.3 Security Gating 및 Secret 관리 (보안 통제)
- 코드 내 평문 기재(No Hard-coding) 금지 원칙에 따라, 런타임에 필요한 **암호화 정보는 운영 서버 측의 `.env` 환경 변수(또는 Vault)에서 안전하게 주입**됩니다 (`${KR_NETMON_DB_PASSWORD}` 등). 시스템 디렉토리 내 로그에는 민감 정보가 출력되지 않습니다.

---

## 4. 커스텀 확장 내역 (Custom Extensions)

엔진 수정을 원천 금지하는 코어 모듈 격리 기준을 충족하기 위하여 승인된 Hook 방식의 두 가지 확장 기능을 포함합니다.

1. **텔레그램 동적 알람 발생 (Webhook)**
   - 위치: `scripts/KR_NETMON_TELEGRAM_WH.js`
   - 설명: 기본 알람 기능의 가독성을 높이고 로컬 언어 및 조직 룰(이모지 등)을 흡수하기 위해 Javascript 기반의 Hook으로 작성된 확장 알림 플러그인.
2. **Grafana 기반 자동 프로비저닝 (IaC)**
   - 위치: `grafana/provisioning/dashboards/dashboard.yml`
   - 설명: 수동 생성에 의한 버전 관리 단절을 막고 코드를 통한 대시보드 자동 배포 파이프라인 형성(Zabbix 알람 및 트래픽 정보 위젯화).

---

## 5. 빌드 및 배포 방법 (Deployment Pipeline)

초기 및 릴리즈 구축 절차를 안내합니다.

1. **디렉토리 권한 설정** (최초 구동 전 로컬 볼륨의 쓰기/읽기 권한 승격)
   ```bash
   mkdir -p grafana_data
   chmod -R 777 grafana_data zbx_env/var/lib/zabbix/snmptraps
   ```
2. **비밀키(.env) 파일 생성 (보안 담당자 통제)**
   CI/CD 환경에서의 파일 복제본 또는 템플릿 사용.
   ```env
   # .env
   POSTGRES_USER=zabbix
   KR_NETMON_DB_PASSWORD=<Your_Secure_DB_Pass>
   POSTGRES_DB=zabbix
   KR_NETMON_GRAFANA_PASSWORD=<Your_Secure_GF_Pass>
   ```
3. **가동 명령 (Cold Start)**
   ```bash
   podman-compose up -d
   ```
4. **성능 모니터링 체크**
   ```bash
   podman stats --no-stream
   ```
   (메인 컴포넌트 CPU 사용 및 메모리 Budget 이내 정상 점검 필수)

---
*본 도큐먼트는 SAMJIN 기술 표준 산출물로서 CI/CD 통과 요건 (3 Year TCO & Maintenance Lifecycle Risk Zero 검증)으로 활용됩니다.*
