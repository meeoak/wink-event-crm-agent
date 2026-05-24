# wink-event-crm-agent

Wink Event CRM의 에이전트 전용 웹앱입니다. Google Apps Script 화면이 아니라 정적 웹앱으로 띄우기 때문에 Apps Script 상단 안내 문구 없이 사용할 수 있습니다.

## 사용 흐름

1. `index.html`을 브라우저로 엽니다.
2. 왼쪽에서 본인 에이전트 이름을 선택합니다.
3. 달력에서 이벤트를 클릭합니다.
4. 슬롯에서 에이전트를 선택하고 `선점`을 누르면 `승인대기`로 저장됩니다.
5. 승인완료 후에도 DB 칸은 계속 보이므로 숫자를 입력하고 저장할 수 있습니다.

## GitHub Pages 배포

1. GitHub에서 `wink-event-crm-agent` 저장소를 만듭니다.
2. 이 폴더의 파일 4개를 저장소 루트에 올립니다.
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. `Settings > Pages`에서 `Deploy from a branch`를 선택합니다.
4. Branch는 `main`, folder는 `/root`로 설정합니다.
5. 배포 후 주소는 보통 아래 형태가 됩니다.

```text
https://meeoak.github.io/wink-event-crm-agent/
```

## API

기본 API는 현재 Apps Script 배포 URL로 설정되어 있습니다.

```text
https://script.google.com/macros/s/AKfycbzAfGJXv4aatclHflxYMJhqna29zmOiQ3fcE8wQTDN47hDMzRJj8k4GljZYot2c4BacPQ/exec
```

다른 배포 URL을 쓰려면 주소 뒤에 `?apiUrl=배포URL`을 붙여 실행합니다.

```text
https://meeoak.github.io/wink-event-crm-agent/?apiUrl=새AppsScript배포URL
```
