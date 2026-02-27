# 삼진정공 네트워크 모니터링 시스템 운영 관리 가이드 (Linux/Podman)

본 문서는 삼진정공 네트워크 모니터링 시스템(`kr-netmon`)의 리눅스 서버 레벨 운영 명령어 및 서비스 관리 절차를 정의합니다.

---

## 1. 서비스 제어 (Service Control)
모든 서비스는 `podman-compose`를 통해 통합 제어됩니다. 명령어는 반드시 프로젝트 루트 폴더(`~/kr-netmon`)에서 실행해야 합니다.

### 1.1 서비스 가동 (Start)
```bash
cd ~/kr-netmon
podman-compose up -d
```
*   `-d`: 백그라운드 모드 실행 (터미널을 닫아도 서비스 유지)

### 1.2 서비스 정지 (Stop)
```bash
cd ~/kr-netmon
podman-compose stop
```
*   서비스를 안전하게 종료합니다. (데이터 유실 방지를 위해 권장)

### 1.3 서비스 재시작 (Restart)
```bash
cd ~/kr-netmon
podman-compose restart
```
*   설정 변경 후 적용이 필요할 때 사용합니다.

---

## 2. 상태 점검 (Status Monitoring)

### 2.1 컨테이너 구동 상태 확인
```bash
podman-compose ps
```
*   모든 서비스의 `STATUS`가 `Up` 인지 확인합니다.
*   특히 `zabbix-db`의 경우 `(healthy)` 표시가 있어야 정상입니다.

### 2.2 실시간 자원 사용량 모니터링
```bash
podman stats --no-stream
```
*   각 컨테이너별 CPU, 메모리 점유율을 확인하여 성능 예산 준수 여부를 체크합니다.

### 2.3 서비스 로그 확인 (트러블슈팅)
```bash
# 특정 서비스(예: zabbix-server)의 실시간 로그 확인
podman logs -f kr-netmon-zabbix-server
```
*   장비 등록이 안 되거나 대시보드 데이터가 안 나올 때 원인을 파악하는 가장 확실한 방법입니다.

---

## 3. 리눅스 서버 리소스 관리 (System Resource)

### 3.1 디스크 사용량 확인
```bash
# 전체 디스크 잔여량 확인
df -h

# 현재 우리 프로젝트 폴더 용량 확인
du -sh ~/kr-netmon
```

### 3.2 포트 점검 (방화벽 및 서비스 확인)
```bash
# 현재 열려있는 주요 포트(22, 8081, 3001) 및 방화벽 상태 확인
sudo ufw status
```

---

## 4. 백업 수동 실행 및 확인

### 4.1 백업 즉시 실행
```bash
~/kr-netmon/scripts/db_backup.sh
```

### 4.2 백업 파일 생성 확인
```bash
ls -lh ~/kr-netmon/backups
```

---

## 5. 응급 조치 (Emergency Plan)

### 5.1 컨테이너 전체 강제 재빌드
설정 파일 등이 꼬여서 서비스가 정상적으로 올라오지 않을 때 사용합니다.
```bash
podman-compose down
podman-compose up -d --build
```

### 5.2 서버 재부팅 후 조치
시스템 재부팅 후 서비스가 자동으로 올라오지 않는다면 위 **1.1 가동 명령어**를 입력하십시오.

---
**Last Updated:** 2026-02-27
**Prepared by:** Antigravity AI
