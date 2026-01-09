# 1. 프로젝트 개요

## Query Agent란?

Query Agent는 **자연어로 데이터베이스를 조회하고 관리할 수 있는 웹 애플리케이션**입니다.

### 예시

```
사용자: "users 테이블에서 최근 가입한 10명 보여줘"

AI: 다음 쿼리를 실행하겠습니다.

SELECT TOP 10 * FROM users ORDER BY created_at DESC

[결과 테이블 표시]
```

SQL을 잘 모르는 사람도 자연어로 질문하면 AI가 적절한 SQL을 생성하고 실행해줍니다.

---

## 왜 만들었나?

1. **SQL 학습 곡선 완화**: 비개발자도 데이터 조회 가능
2. **생산성 향상**: 복잡한 쿼리를 빠르게 작성
3. **실수 방지**: AI가 문법 오류 체크 및 최적화 제안

---

## 핵심 기능

### 1. 자연어 쿼리

- 한국어/영어로 질문하면 SQL로 변환
- 데이터베이스 스키마를 AI가 인식하여 정확한 테이블/컬럼명 사용

### 2. 다중 DB 지원 (계획)

- MSSQL (현재 구현)
- PostgreSQL (예정)
- MySQL (예정)

### 3. 다중 AI 모델 지원 (계획)

- Claude (현재 구현)
- GPT (예정)
- Gemini (예정)

### 4. 안전한 쿼리 실행

- DROP, TRUNCATE 등 위험한 명령 자동 차단
- SELECT 기본 LIMIT 적용

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | React, TypeScript, Vite, TailwindCSS |
| **백엔드** | Node.js, Express, TypeScript |
| **데이터베이스** | MSSQL (mssql 패키지) |
| **AI** | Claude API (Anthropic) |

---

## 용어 정리

| 용어 | 설명 |
|------|------|
| **LLM** | Large Language Model. ChatGPT, Claude 같은 대규모 언어 모델 |
| **SQL** | Structured Query Language. 데이터베이스 조회 언어 |
| **스키마** | 데이터베이스의 구조 (테이블, 컬럼 정보) |
| **쿼리** | 데이터베이스에 보내는 요청 (SELECT, INSERT 등) |
| **API** | Application Programming Interface. 서버와 통신하는 인터페이스 |

---

## 다음 단계

[2. 아키텍처](./02-architecture.md)에서 시스템 구조를 알아봅니다.
