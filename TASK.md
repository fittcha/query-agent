# Task: Query Agent 개발

## 목표

자연어로 DB를 조회/관리할 수 있는 웹 앱 개발

## 현재 진행 상황

- [x] 프로젝트 구조 생성
- [x] package.json 설정
- [x] Express 서버 기본 구조 (server/index.ts)
- [x] 채팅 API 라우트 (server/routes/chat.ts)
- [x] DB API 라우트 (server/routes/db.ts)
- [ ] MSSQL 연결 모듈 (server/db/mssql.ts)
- [ ] React 프론트엔드 설정
- [ ] 채팅 UI 컴포넌트
- [ ] DB/AI 선택 셀렉트박스

## 핵심 기능 요구사항

### 1. AI 채팅
- 자연어 입력 → AI가 SQL 생성 → 실행 → 결과 표시
- AI 모델 선택 가능 (Claude, GPT, Gemini)
- 대화 히스토리 유지

### 2. DB 연결
- 여러 DB 타입 지원 (MSSQL, PostgreSQL, MySQL)
- 셀렉트박스로 DB 선택
- 연결 테스트 기능
- 스키마 자동 조회

### 3. UI
- 채팅 인터페이스 (왼쪽: 채팅, 오른쪽: 결과/스키마)
- 쿼리 결과 테이블 표시
- SQL 하이라이팅
- 다크모드 (선택)

## 다음 할 일

1. `server/db/mssql.ts` 생성 - DB 연결 및 쿼리 함수
2. Vite + React 프론트엔드 설정
3. 기본 채팅 UI 구현
4. npm install 후 테스트

## 참고

- Claude API 키 필요 (.env에 설정)
- MSSQL 테스트는 VPN 연결 후 회사 개발 DB로
