# Grafana 대시보드 전략

## 개요
네트워크 운영팀(NOC)을 위한 "Single Pane of Glass" 통합 대시보드 구성 전략입니다.

## 1. 상단: 상태 개요 (Stat Panels)
- **글로벌 네트워크 상태**: Up/Down 호스트 수 (Prometheus/Zabbix 데이터).
- **활성 알림 (Active Alerts)**: Critical/High 심각도 트리거 발생 건수.
- **총 처리량 (Total Throughput)**: 백본망 전체 대역폭 사용량 합계.

## 2. 중단: 토폴로지 및 흐름 (Canvas / Flowcharting)
- **Top N Talkers**: 인터페이스 점유율 상위 장비 바 그래프.
- **지연 시간 히트맵 (Latency Heatmap)**: 전체 서브넷 ICMP 응답 속도 시각화 (지터/패킷로스 식별용).
- **트래픽 트렌드**: 백본 업링크 In/Out 트래픽 7일 추이 그래프.

## 3. 하단: 장비 상세 (Multi-Stat / Tables)
- **장비 상태 테이블**: CPU, RAM, 온도가 임계치에 근접한 장비 리스트.
- **인터페이스 에러**: 패킷 에러/Discard 발생 추이 (물리 계층 장애 조기 경보).

## 구현 팁
- **변수(Variables)** 사용: `$group`, `$host`, `$interface`를 활용하여 대시보드를 동적으로 만드세요.
- **Overrides (재정의)** 설정: 값에 따라 색상을 지정하세요 (Green < 70%, Yellow > 70%, Red > 90%).
- **자동 새로고침**: NOC 모니터링용으로 30초~1분 주기로 설정하세요.
