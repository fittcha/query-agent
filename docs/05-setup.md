# 5. 개발 환경 설정

## 필수 프로그램

### 1. Node.js (v18 이상)

```bash
# 버전 확인
node -v   # v18.x.x 이상

# 설치 (Mac)
brew install node

# 설치 (Windows)
# https://nodejs.org 에서 다운로드
```

### 2. Git

```bash
git --version  # git version 2.x.x
```

### 3. MSSQL Server (선택)

로컬 테스트용 DB가 필요합니다.

**옵션 A: Docker 사용 (권장)**

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Test1234!" \
  -p 1433:1433 --name mssql \
  -d mcr.microsoft.com/mssql/server:2019-latest
```

**옵션 B: SQL Server Express 설치**

https://www.microsoft.com/sql-server/sql-server-downloads

---

## 프로젝트 설정

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/query-agent.git
cd query-agent
```

### 2. 의존성 설치

```bash
npm install
```

주요 패키지:

| 패키지 | 용도 |
|--------|------|
| `express` | 웹 서버 프레임워크 |
| `mssql` | MSSQL 클라이언트 |
| `@anthropic-ai/sdk` | Claude API SDK |
| `react` | UI 라이브러리 |
| `vite` | 빌드 도구 |
| `tailwindcss` | CSS 프레임워크 |
| `typescript` | 타입 시스템 |
| `tsx` | TypeScript 실행기 |

### 3. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일 편집:

```bash
# Claude API 키 (필수)
# https://console.anthropic.com 에서 발급
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# MSSQL 연결 정보
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=Test1234!
MSSQL_DATABASE=master
MSSQL_ENCRYPT=false

# 서버 포트
PORT=3001
```

---

## 개발 서버 실행

### 전체 실행 (프론트 + 백엔드)

```bash
npm run dev
```

출력:
```
[server] Server running on http://localhost:3001
[vite] Local: http://localhost:5173
```

### 개별 실행

```bash
# 백엔드만
npm run dev:server

# 프론트엔드만
npm run dev:client
```

---

## 접속 확인

### 1. 프론트엔드

브라우저에서 http://localhost:5173 접속

### 2. 백엔드 API

```bash
# 헬스 체크
curl http://localhost:3001/api/health
# {"status":"ok"}

# DB 연결 테스트
curl http://localhost:3001/api/db/health
# {"connected":true,"message":"Database connected"}

# 스키마 조회
curl http://localhost:3001/api/db/schema
```

---

## 테스트 데이터 생성

```sql
-- MSSQL에서 실행
CREATE DATABASE TestDB;
USE TestDB;

CREATE TABLE users (
  id INT PRIMARY KEY IDENTITY(1,1),
  name NVARCHAR(100),
  email NVARCHAR(255),
  created_at DATETIME DEFAULT GETDATE()
);

INSERT INTO users (name, email) VALUES
  ('홍길동', 'hong@example.com'),
  ('김철수', 'kim@example.com'),
  ('이영희', 'lee@example.com');

CREATE TABLE orders (
  id INT PRIMARY KEY IDENTITY(1,1),
  user_id INT FOREIGN KEY REFERENCES users(id),
  total_amount DECIMAL(10,2),
  created_at DATETIME DEFAULT GETDATE()
);

INSERT INTO orders (user_id, total_amount) VALUES
  (1, 50000),
  (1, 30000),
  (2, 100000);
```

`.env`에서 `MSSQL_DATABASE=TestDB`로 변경 후 서버 재시작.

---

## 문제 해결

### 1. "Cannot find module" 에러

```bash
# node_modules 재설치
rm -rf node_modules
npm install
```

### 2. MSSQL 연결 실패

```bash
# 에러: ConnectionError: Failed to connect
```

확인사항:
- MSSQL 서버가 실행 중인지
- 포트 1433이 열려있는지
- 사용자/비밀번호가 정확한지
- 방화벽이 차단하지 않는지

```bash
# 포트 확인 (Mac/Linux)
lsof -i :1433

# Docker MSSQL 상태 확인
docker ps
docker logs mssql
```

### 3. Claude API 에러

```bash
# 에러: AuthenticationError
```

확인사항:
- API 키가 올바른지
- API 키에 크레딧이 있는지

### 4. 프록시 에러

```bash
# 에러: 502 Bad Gateway
```

백엔드(3001)가 실행 중인지 확인:
```bash
curl http://localhost:3001/api/health
```

---

## IDE 설정 (VS Code)

### 추천 확장

- **ESLint**: 코드 린팅
- **Prettier**: 코드 포매팅
- **Tailwind CSS IntelliSense**: Tailwind 자동완성
- **TypeScript Vue Plugin**: TypeScript 지원

### 설정 파일 (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

---

## 다음 단계

[6. API 레퍼런스](./06-api-reference.md)에서 API 상세 명세를 확인합니다.
