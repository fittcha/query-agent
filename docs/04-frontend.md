# 4. 프론트엔드 가이드

## 개요

프론트엔드는 **React + TypeScript + Vite + TailwindCSS**로 구축됩니다.

---

## Vite란?

Vite는 차세대 프론트엔드 빌드 도구입니다.

**기존 (Webpack):**
```
코드 변경 → 전체 번들링 → 브라우저 새로고침 (느림)
```

**Vite:**
```
코드 변경 → 해당 파일만 교체 → 즉시 반영 (빠름)
```

### `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

| 설정 | 설명 |
|------|------|
| `plugins: [react()]` | React JSX/TSX 지원 |
| `server.port` | 개발 서버 포트 |
| `server.proxy` | API 요청을 백엔드로 프록시 |

**프록시란?**

프론트(5173)에서 `/api/chat` 요청하면 Vite가 백엔드(3001)로 전달합니다.

```
브라우저 → localhost:5173/api/chat → (프록시) → localhost:3001/api/chat
```

CORS 문제 없이 개발할 수 있습니다.

---

## TailwindCSS란?

클래스 기반 CSS 프레임워크입니다.

**기존 CSS:**
```css
.button {
  background-color: blue;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}
```

**Tailwind:**
```html
<button class="bg-blue-500 text-white px-4 py-2 rounded">
  버튼
</button>
```

### 설정 파일들

**`tailwind.config.js`**
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

- `content`: Tailwind 클래스를 스캔할 파일들

**`postcss.config.js`**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- PostCSS 플러그인으로 Tailwind 적용

**`src/index.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- Tailwind 기본 스타일 로드

---

## 메인 컴포넌트 (`src/App.tsx`)

### 상태 관리

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  result?: Record<string, unknown>[] | null;
  error?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
```

| 상태 | 타입 | 설명 |
|------|------|------|
| `messages` | `Message[]` | 대화 내역 |
| `input` | `string` | 입력 필드 값 |
| `loading` | `boolean` | API 호출 중 여부 |

### API 호출

```typescript
const sendMessage = async () => {
  if (!input.trim() || loading) return;

  // 1. 사용자 메시지 추가
  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: input,
  };
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setLoading(true);

  try {
    // 2. API 호출
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });

    const data = await response.json();

    // 3. AI 응답 추가
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: data.message,
      sql: data.sql,
      result: data.result?.recordset || data.result,
    };
    setMessages((prev) => [...prev, assistantMessage]);

  } catch (error) {
    // 4. 에러 처리
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "오류가 발생했습니다.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setLoading(false);
  }
};
```

### UI 구조

```tsx
<div className="min-h-screen bg-gray-100 flex flex-col">
  {/* 헤더 */}
  <header className="bg-white border-b px-6 py-4">
    <h1>Query Agent</h1>
  </header>

  {/* 메시지 영역 */}
  <main className="flex-1 overflow-auto p-6">
    {messages.map((msg) => (
      <MessageBubble key={msg.id} message={msg} />
    ))}
  </main>

  {/* 입력 영역 */}
  <footer className="bg-white border-t p-4">
    <input value={input} onChange={...} />
    <button onClick={sendMessage}>전송</button>
  </footer>
</div>
```

### 메시지 버블

```tsx
<div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
  <div className={`rounded-lg px-4 py-3 ${
    msg.role === "user"
      ? "bg-blue-600 text-white"    // 사용자: 파란색
      : "bg-white border shadow-sm"  // AI: 흰색
  }`}>
    <p>{msg.content}</p>

    {/* SQL 표시 */}
    {msg.sql && (
      <pre className="bg-gray-900 text-green-400 p-3 rounded">
        {msg.sql}
      </pre>
    )}

    {/* 결과 테이블 */}
    {msg.result && (
      <table className="min-w-full text-sm border">
        {/* 테이블 렌더링 */}
      </table>
    )}
  </div>
</div>
```

### Enter 키 처리

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();  // 줄바꿈 방지
    sendMessage();
  }
};
```

- Enter: 전송
- Shift+Enter: 줄바꿈

---

## 로딩 애니메이션

```tsx
{loading && (
  <div className="flex gap-2">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
  </div>
)}
```

Tailwind의 `animate-bounce`로 점 3개가 순서대로 튀는 애니메이션입니다.

---

## 결과 테이블 렌더링

```tsx
{msg.result && Array.isArray(msg.result) && msg.result.length > 0 && (
  <table className="min-w-full text-sm border">
    <thead>
      <tr>
        {Object.keys(msg.result[0]).map((key) => (
          <th key={key}>{key}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {msg.result.slice(0, 20).map((row, i) => (
        <tr key={i}>
          {Object.values(row).map((val, j) => (
            <td key={j}>{val === null ? "NULL" : String(val)}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)}
```

- `Object.keys()`: 컬럼명 추출
- `Object.values()`: 값 추출
- `slice(0, 20)`: 최대 20행만 표시

---

## TypeScript 타입

### `Message` 인터페이스

```typescript
interface Message {
  id: string;                        // 고유 ID
  role: "user" | "assistant";        // 발신자
  content: string;                   // 메시지 내용
  sql?: string;                      // 생성된 SQL (옵션)
  result?: Record<string, unknown>[]; // 쿼리 결과 (옵션)
  error?: string;                    // 에러 메시지 (옵션)
}
```

### `Record<string, unknown>`란?

```typescript
// 이것은:
Record<string, unknown>

// 이것과 같습니다:
{ [key: string]: unknown }

// 예시:
{ id: 1, name: "John", age: 30 }
```

- 키가 문자열인 객체
- 값은 모든 타입 가능

---

## 다음 단계

[5. 개발 환경 설정](./05-setup.md)에서 로컬 환경을 구축합니다.
