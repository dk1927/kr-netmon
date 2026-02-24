# 유지보수 및 보안 전략 (Maintenance & Security)

## 1. 데이터베이스 증가 관리 (TimescaleDB)
본 시스템은 대용량 데이터 처리를 위해 **PostgreSQL + TimescaleDB**를 사용합니다.

### 1.1 하이퍼테이블(Hypertable) 자동 관리
PostgreSQL 지원 Zabbix 7.0 이미지는 TimescaleDB 확장을 자동으로 감지합니다.
- **압축 (Compression)**: 7일 이상 된 이력 데이터에 대해 기본적으로 활성화됩니다.
- **청크 (Chunking)**: 빠른 삭제(Drop)를 위해 데이터를 시간 단위(예: 1일)로 파티셔닝합니다.

### 1.2 사용자 수행 작업
데이터베이스 컨테이너 내부에서 연 1회 혹은 성능 저하 시 다음 SQL을 실행하여 정책을 점검하십시오:
```sql
SELECT add_compression_policy('history', INTERVAL '7 days');
SELECT add_compression_policy('history_uint', INTERVAL '7 days');
```

## 2. 보안 패치 정책
시스템이 폐쇄망에 위치하더라도 다음 절차를 준수해야 합니다.

### 2.1 컨테이너 업데이트 (월간)
1. **최신 이미지 풀(Pull)**:
    ```bash
    podman-compose pull
    ```
2. **컨테이너 재생성**:
    ```bash
    podman-compose up -d
    ```
3. **오래된 이미지 정리**:
    ```bash
    podman image prune -f
    ```

### 2.2 호스트 보안
- **방화벽**: 사내망 통신을 위해 `8080` (Web) 및 `3000` (Grafana) 포트만 개방하십시오.
- **SNMPv3 필수**: 모든 네트워크 장비에서 보안이 취약한 SNMPv1/v2c를 비활성화하십시오.
