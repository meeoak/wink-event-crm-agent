# wink-event-crm-leader

Wink Event CRM의 리더/관리자 전용 정적 웹앱입니다.

이 앱은 GitHub Pages 같은 정적 호스팅에서 열고, 데이터 저장과 시트 동기화는 Apps Script API를 통해 처리합니다. 그래서 Apps Script 웹앱 상단 안내 문구 없이 리더 화면을 사용할 수 있습니다.

## 배포

1. GitHub에서 `wink-event-crm-leader` 저장소를 만듭니다.
2. 이 폴더의 파일을 저장소 루트에 올립니다.
   - `index.html`
   - `README.md`
3. `Settings > Pages`에서 `Deploy from a branch`를 선택합니다.
4. Branch는 `main`, folder는 `/root`로 설정합니다.

배포 주소 예시:

```text
https://meeoak.github.io/wink-event-crm-leader/
```

## 연결된 API

기본 Apps Script API:

```text
https://script.google.com/macros/s/AKfycbzAfGJXv4aatclHflxYMJhqna29zmOiQ3fcE8wQTDN47hDMzRJj8k4GljZYot2c4BacPQ/exec
```

현재 지원하는 주요 작업:

- 월별 CRM 데이터 불러오기
- 행사 선점, 승인, 반려, DB 저장
- 이벤트 등록/삭제
- 팀/팀리더/에이전트 등록, 수정, 삭제, 업무종료
- 자동화 시트 동기화, 불러오기, 다운로드
