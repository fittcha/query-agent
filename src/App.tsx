import { useState } from "react";

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

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json() as {
        message: string;
        sql?: string;
        error?: string;
        result?: { recordset?: Record<string, unknown>[]; error?: string } | Record<string, unknown>[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      const result = Array.isArray(data.result)
        ? data.result
        : data.result?.recordset;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        sql: data.sql,
        result: result,
        error: !Array.isArray(data.result) ? data.result?.error : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Query Agent</h1>
        <p className="text-sm text-gray-500">자연어로 데이터베이스를 조회하세요</p>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <p>데이터베이스에 대해 질문해보세요.</p>
              <p className="text-sm mt-2">예: "모든 테이블 목록을 보여줘", "users 테이블에서 최근 가입자 10명"</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {msg.sql && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">SQL:</p>
                    <pre className="bg-gray-900 text-green-400 text-sm p-3 rounded overflow-x-auto">
                      {msg.sql}
                    </pre>
                  </div>
                )}

                {msg.error && (
                  <div className="mt-3 text-red-600 text-sm">
                    Error: {msg.error}
                  </div>
                )}

                {msg.result && Array.isArray(msg.result) && msg.result.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      결과 ({msg.result.length}건):
                    </p>
                    <table className="min-w-full text-sm border">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(msg.result[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left border-b font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.result.slice(0, 20).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-2 border-b">
                                {val === null ? <span className="text-gray-400">NULL</span> : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {msg.result.length > 20 && (
                      <p className="text-xs text-gray-500 mt-1">
                        ...외 {msg.result.length - 20}건 더 있음
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-lg px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <footer className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
