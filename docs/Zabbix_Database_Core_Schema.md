# SAMJIN Network Monitoring - DB 핵심 테이블 명세서 (Zabbix Core Schema)

본 문서는 `kr-netmon-zabbix-db` 컨테이너(PostgreSQL / TimescaleDB) 내부에 생성되는 수백 개의 Zabbix 코어 테이블 중, **인프라 담당자 및 DBA가 장애 분석과 데이터 라이프사이클 관리를 위해 반드시 알아야 하는 핵심 15개 테이블 카테고리**를 추려 정리한 명세서입니다.

> **[Standard 10 Step Logic - Rule 4. Schema Protocol]**
> Zabbix 시스템의 엔진 코어 격리(Core Module Isolation) 원칙에 따라, **본 문서에 명시된 모든 기본(Standard) 테이블과 컬럼, 인덱스의 직접 변경(Alter)은 원천 금지**되며, 커스텀 확장이 필요할 시 별도의 Sidecar Table로 격리해야 합니다.

---

## 1. 아키텍처 개체(Object) 테이블
모니터링의 대상이 되는 네트워크 장비(스위치, 방화벽)와 그 하위 항목들을 관리합니다.

| 테이블명(Table) | 설명(Description) | 주요 컬럼(Key Columns) |
| :--- | :--- | :--- |
| **`hosts`** | Zabbix에 등록된 모든 관리 장비(Aruba 스위치 등)의 마스터 정보 | `hostid`(PK), `host`(이름), `status`(0=활성, 1=비활성) |
| **`interface`** | 장비와 통신하기 위한 프로토콜 및 IP 주소 정보 | `interfaceid`(PK), `hostid`(FK), `ip`, `port`, `type`(2=SNMP) |
| **`items`** | 호스트 내에서 주기적으로 수집할 구체적인 지표(CPU 템퍼러쳐, 포트 통신량 등) | `itemid`(PK), `hostid`(FK), `key_`(지표식별자), `delay`(수집주기) |
| **`hosts_groups`** | 사업장/티어별 호스트 그룹핑 매핑 정보 (N:M 매핑) | `hostgroupid`(PK), `hostid`(FK), `groupid`(FK) |

## 2. 규칙 및 알람 설정(Configuration) 테이블
데이터가 특정 임계치(100도 이상, 핑 타임아웃 등)를 넘었을 때 경고를 발생시키는 룰(규칙)을 담고 있습니다.

| 테이블명(Table) | 설명(Description) | 주요 컬럼(Key Columns) |
| :--- | :--- | :--- |
| **`triggers`** | 아이템 값을 기반으로 장애 여부를 판별하는 임계치(Threshold) 함수식 | `triggerid`(PK), `description`, `priority`(2=Warning, 4=High, 5=Disaster) |
| **`functions`** | 트리거에 사용된 구체적인 수학 함수 목록 연동 | `functionid`(PK), `itemid`(FK), `triggerid`(FK), `function` |
| **`actions`** | 트리거 발생 시 수행할 액션(예: 텔레그램 스크립트 실행) 정의 | `actionid`(PK), `name`, `status` |
| **`operations`** | 액션 내부의 구체적인 행동 절차(수신자, 메시지 템플릿 등) | `operationid`(PK), `actionid`(FK), `operationtype` |

## 3. 이벤트 및 장애 내역(Event/Problem) 테이블
실제 시스템 운용 중 발생한 알람의 기록(Log) 창고입니다.

| 테이블명(Table) | 설명(Description) | 주요 컬럼(Key Columns) |
| :--- | :--- | :--- |
| **`events`** | 시스템에서 발생한 상태 변경의 모든 히스토리 (초단위 기록) | `eventid`(PK), `source`, `objectid`(FK: triggerid), `clock`(발생시간) |
| **`problem`** | 현재 '진행 중' 이거나 최근 해결된 장애 상황만을 필터링한 핵심 모음 | `eventid`(PK), `name`, `severity`, `r_eventid`(해결된 이벤트ID) |
| **`alerts`** | 웹훅(텔레그램), 이메일 등 실제 발송된 알림 메시지의 이력과 성공 여부 | `alertid`(PK), `actionid`(FK), `sendto`, `status`(1=성공, 2=실패), `error` |

## 4. 시계열 데이터(History & Trend) 테이블 🔥 
> [!WARNING] 디스크 용량 모니터링 주의 구간
> Zabbix 전체 DB 용량의 **90% 이상을 차지하는 거대 테이블**입니다. 저희 아키텍처는 이 테이블들의 부하를 견디기 위해 일반 RDBMS가 아닌 **`TimescaleDB(시계열 파티셔닝 DB)`** 기술을 적용하여 엔진을 가속시켰습니다.

| 테이블명(Table) | 설명(Description) | 주요 컬럼(Key Columns) |
| :--- | :--- | :--- |
| **`history`** | 소수점(Float) 형태의 원본 성능 데이터 (예: CPU 부하율, 온도 45.2도) | `itemid`, `clock`, `value` |
| **`history_uint`** | 정수(Integer) 형태의 원본 성능 데이터 (예: 누적 네트워크 In/Out 바이트(Traffic)) | `itemid`, `clock`, `value` |
| **`history_str`** | 문자열 데이터 (장비 시리얼넘버, OID 응답값, 로그 메시지 등) | `itemid`, `clock`, `value` |
| **`trends` / `trends_uint`** | 원본 데이터를 1시간 단위 최솟값/최댓값/평균값으로 압축(Rollup) 보관하여 1년 이상 장기 보존하는 요약 테이블 | `itemid`, `clock`, `num`, `value_min`, `value_avg`, `value_max` |

---

### [DBA를 위한 TCO 및 관리 가이드]
1. **TimescaleDB Chunking:** Zabbix는 `history` 계열 테이블들을 하우스키핑(Housekeeping) 할 때 `DELETE` 구문을 쓰지 않습니다. 대신 **TimescaleDB의 자동화된 Chunk(일단위 파티션) Drop 기능**을 사용하여 CPU I/O 리소스 소모 없이 수천만 건의 낡은 데이터를 1초 만에 폭파(정리)합니다.
2. **보존 주기 튜닝:** 이 시계열 테이블이 너무 빠르게 꽉 찬다면, Zabbix 프론트엔드 관리자 화면의 **`Administration` > `Housekeeping`** 메뉴에서 History 보존 주기를 7일 이내로 단축하시고, 장기 통계는 Trends 테이블(1시간 평균)에 맡기시는 것이 퍼포먼스(서버 예산) 준수 원칙에 가장 이상적입니다.
