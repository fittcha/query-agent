# Query Agent

AI 기반 데이터베이스 쿼리 에이전트

## 프로젝트 개요

자연어로 데이터베이스를 조회하고 관리할 수 있는 웹 애플리케이션.
여러 DB와 여러 AI 모델을 선택해서 사용할 수 있는 구조.

## 기술 스택

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express + TypeScript
- **Database**: MSSQL (추후 PostgreSQL, MySQL 확장)
- **AI**: Claude API (추후 GPT, Gemini 확장)

## 프로젝트 구조

```
query-agent/
├── server/           # Express 백엔드
│   ├── index.ts      # 서버 진입점
│   ├── routes/       # API 라우트
│   │   ├── chat.ts   # AI 채팅 API
│   │   └── db.ts     # DB 직접 조회 API
│   └── db/           # DB 연결 모듈
│       └── mssql.ts  # MSSQL 연결
├── src/              # React 프론트엔드
│   ├── App.tsx
│   ├── components/
│   └── hooks/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env              # 환경변수 (gitignore)
```

## 개발 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (프론트 + 백엔드 동시)
npm run dev:server   # 백엔드만
npm run dev:client   # 프론트만
npm run build        # 프로덕션 빌드
```

## 환경변수

`.env.example` 참고해서 `.env` 파일 생성

## 코딩 컨벤션

- TypeScript strict 모드 사용
- 함수형 컴포넌트 + hooks 사용
- 에러는 try-catch로 처리하고 사용자에게 명확한 메시지 제공
- SQL 인젝션 방지 필수
