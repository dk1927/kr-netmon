# Zabbix 구성 가이드

## 1. SNMPv3 설정 (백본 및 방화벽)
> **목표:** SNMPv3 AuthPriv 모드를 사용하여 네트워크 장비를 안전하게 모니터링합니다.

### 1.1 전역 매크로 설정
**Administration (관리) > General (일반) > Macros (매크로)**로 이동하여 다음 보안 매크로를 추가합니다:
- `{$SNMP_USER}`: SNMPv3 사용자명 (예: `zabbix_user`)
- `{$SNMP_AUTH_PASS}`: 인증 비밀번호 (SHA/MD5)
- `{$SNMP_PRIV_PASS}`: 암호화 비밀번호 (AES/DES)

### 1.2 호스트 설정
1. **Data collection (데이터 수집) > Hosts (호스트) > Create host (호스트 생성)**로 이동합니다.
2. **Interfaces (인터페이스)**: **SNMP** 인터페이스를 추가합니다.
    - Security level: `authPriv`
    - Auth protocol: `SHA` (또는 MD5)
    - Priv protocol: `AES` (또는 DES)
3. **Macros (매크로)**: 전역 설정을 상속받거나 호스트별로 재정의합니다.
4. **Templates (템플릿)**: `Network Generic Device by SNMP` 또는 벤더별 템플릿(Cisco/Juniper)을 연결합니다.

---

## 2. 네트워크 디스커버리 규칙
> **목표:** 특정 서브넷의 신규 장비를 자동으로 탐지합니다.

**Data collection (데이터 수집) > Discovery (디스커버리) > Create discovery rule (규칙 생성)**로 이동:
- **Name**: `사내망 서브넷 스캔`
- **IP Range**: `192.168.10.1-254, 192.168.20.1-254`
- **Checks**:
    - `ICMP Ping`
    - `SNMPv2 agent "sysName"` (표준화된 경우 SNMPv3 사용)
- **Device uniqueness criteria**: `IP address`
- **Update interval**: `1h` (부하 감소를 위해 1시간 권장)

**Action**: 발견된 호스트를 그룹에 추가하고 템플릿을 연결하는 **Discovery Action**을 생성하십시오.

---

## 3. 토폴로지 맵 및 시각적 알림
> **목표:** 트래픽 90% 초과나 핑 손실 등 치명적 문제 발생 시 노드가 빨간색으로 깜빡이는 네트워크 맵을 구성합니다.

### 3.1 트리거(Trigger) 설정
템플릿에 고트래픽 감지 트리거가 있는지 확인합니다.
트리거 표현식 예시:
```
avg(/Cisco Core Switch/net.if.in[Gi0/1],5m)>900M
```
*Severity (심각도): High (높음)*

### 3.2 맵(Map) 구성
1. **Monitoring (모니터링) > Maps (맵) > Create map (맵 생성)**으로 이동합니다.
2. **Map elements**: 호스트(스위치 등)를 추가합니다.
3. **Link Config (링크 설정)**:
    - 두 요소를 연결하는 링크를 생성합니다.
    - **Link indicators**: 트리거를 추가합니다 (예: `ICMP Ping Loss`).
    - **Color**: 트리거 활성화 시 `Red`로 설정합니다.
4. **Icon Highlighting (아이콘 강조)**:
    - 맵 속성에서 **"Icon highlighting"**을 활성화합니다.
    - Warning 이상의 트리거가 발생하면 호스트 아이콘 배경이나 테두리가 색상으로 강조됩니다.
    - **고급 설정**: "Advanced labels"를 사용하여 `{HOST.NAME} : {ITEM.LASTVALUE}`와 같이 맵에서 바로 값을 봅니다.

---

## 4. 알림 (Telegram Webhook)
> **목표:** 문제 발생 시 텔레그램으로 즉시 알림을 전송합니다.

### 4.1 미디어 타입 설정
1. **Administration (관리) > Media types (미디어 타입) > Create media type**으로 이동합니다.
2. **Name**: `Telegram Webhook`
3. **Type**: `Webhook`
4. **Parameters**:
    - `Token`: `<YOUR_BOT_TOKEN>`
    - `To`: `{ALERT.SENDTO}`
    - `Subject`: `{ALERT.SUBJECT}`
    - `Message`: `{ALERT.MESSAGE}`
    - `Severity`: `{EVENT.SEVERITY}`
5. **Script**: `scripts/KR_NETMON_TELEGRAM_WH.js`의 내용을 복사하여 붙여넣습니다.

### 4.2 사용자 설정
1. **Users (사용자) > Users > Admin**으로 이동합니다.
2. **Media**: `Telegram Webhook`을 추가합니다.
    - **Send to**: `<YOUR_CHAT_ID>` (그룹 ID 또는 개인 ID).
    - **When active**: `1-7,00:00-24:00`
    - **Severity**: High, Disaster 등을 선택합니다.

### 4.3 트리거 액션
1. **Alerts (알림) > Actions (액션) > Trigger actions**로 이동합니다.
2. "Report problems to Telegram" 액션을 생성합니다.
3. **Operations**: "Send message to users: Admin" (via "Telegram Webhook")을 설정합니다.
