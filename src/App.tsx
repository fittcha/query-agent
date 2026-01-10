import { useState, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  result?: Record<string, unknown>[] | null;
  error?: string;
  timestamp?: Date;
}

interface HistoryItem {
  id: string;
  query: string;
  sql?: string;
  resultCount?: number;
  success: boolean;
  timestamp: Date;
  model: string;
  database: string;
}

interface DbHealthStatus {
  connected: boolean;
  message: string;
  error?: string;
}

interface ColumnInfo {
  name: string;
  dataType: string;
  maxLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: string;
}

interface TableInfo {
  schema: string;
  name: string;
  fullName: string;
  columns: ColumnInfo[];
}

interface StoredProcedureInfo {
  schema: string;
  name: string;
  fullName: string;
  parameters: { name: string; dataType: string; isOutput: boolean }[];
  description?: string;
}

interface ViewInfo {
  schema: string;
  name: string;
  fullName: string;
  columns: ColumnInfo[];
}

interface SchemaData {
  tables: Record<string, TableInfo>;
  storedProcedures: Record<string, StoredProcedureInfo>;
  views: Record<string, ViewInfo>;
  lastUpdated: string;
}

const AI_MODELS = [
  { id: "claude-opus", name: "Claude Opus 4.5", description: "고성능 추론, 복잡한 쿼리" },
  { id: "claude-sonnet", name: "Claude Sonnet 4", description: "빠른 응답, 일반 쿼리" },
  { id: "groq", name: "Llama 3.3 70B", description: "Groq 무료, 빠른 추론" },
  { id: "gemini", name: "Gemini 2.5 Flash", description: "Google AI 무료 티어" },
];

const DATABASES = [
  { id: "mssql", name: "MSSQL" },
];

const MENU_ITEMS = [
  { id: "query", name: "쿼리", icon: "🔍" },
  { id: "schema", name: "스키마", icon: "🗂️" },
  { id: "history", name: "히스토리", icon: "📋" },
  { id: "settings", name: "설정", icon: "⚙️" },
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("claude-opus");
  const [selectedDb, setSelectedDb] = useState("mssql");
  const [activeMenu, setActiveMenu] = useState("query");

  // 스키마 관련 상태
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [schemaTab, setSchemaTab] = useState<"tables" | "procedures" | "views">("tables");

  // 히스토리 관련 상태
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 설정 관련 상태
  const [dbHealth, setDbHealth] = useState<DbHealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // 스키마 데이터 로드
  const loadSchema = async (refresh = false) => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const url = refresh ? "/api/db/schema?format=json&refresh=true" : "/api/db/schema?format=json";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load schema");
      const data = await response.json();
      setSchemaData(data);
    } catch (error) {
      setSchemaError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSchemaLoading(false);
    }
  };

  // 스키마 메뉴 선택시 데이터 로드
  useEffect(() => {
    if (activeMenu === "schema" && !schemaData && !schemaLoading) {
      loadSchema();
    }
  }, [activeMenu]);

  // 설정 메뉴 선택시 DB 상태 확인
  useEffect(() => {
    if (activeMenu === "settings" && !dbHealth && !healthLoading) {
      checkDbHealth();
    }
  }, [activeMenu]);

  // DB 연결 상태 확인
  const checkDbHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch("/api/db/health");
      const data = await response.json();
      setDbHealth(data);
    } catch (error) {
      setDbHealth({
        connected: false,
        message: "연결 확인 실패",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setHealthLoading(false);
    }
  };

  // 히스토리에 추가
  const addToHistory = (item: Omit<HistoryItem, "id" | "timestamp">) => {
    const historyItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setHistory((prev) => [historyItem, ...prev].slice(0, 50)); // 최대 50개 유지
  };

  // 히스토리 항목 클릭 시 쿼리로 이동
  const loadFromHistory = (item: HistoryItem) => {
    setInput(item.query);
    setActiveMenu("query");
  };

  // 히스토리 전체 삭제
  const clearHistory = () => {
    setHistory([]);
  };

  const toggleTableExpand = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    // 입력창 내용 유지 (초기화하지 않음)
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, model: selectedModel, database: selectedDb }),
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
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 히스토리에 추가
      addToHistory({
        query: input,
        sql: data.sql,
        resultCount: result?.length,
        success: true,
        model: selectedModel,
        database: selectedDb,
      });
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "오류가 발생했습니다.",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      // 실패한 쿼리도 히스토리에 추가
      addToHistory({
        query: input,
        success: false,
        model: selectedModel,
        database: selectedDb,
      });
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
    <div className="h-screen flex bg-gray-100">
      {/* Left Sidebar - 10% */}
      <aside className="w-[10%] min-w-[120px] bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Query Agent</h1>
        </div>
        <nav className="flex-1 p-2">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full text-left px-3 py-3 rounded-lg mb-1 flex items-center gap-2 transition-colors ${
                activeMenu === item.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm">{item.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar - AI & DB Selectors */}
        <header className="bg-white border-b px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">AI Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Database:</label>
            <select
              value={selectedDb}
              onChange={(e) => setSelectedDb(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DATABASES.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex p-4 gap-4 overflow-hidden">
          {activeMenu === "query" && (
            <>
              {/* Input Box - 44% */}
              <div className="w-[44%] flex flex-col bg-white rounded-xl shadow-sm border">
                <div className="px-5 py-4 border-b">
                  <h2 className="font-semibold text-gray-800">명령 입력</h2>
                  <p className="text-xs text-gray-500 mt-1">자연어로 데이터베이스를 조회하세요</p>
                </div>
                <div className="flex-1 p-5 flex flex-col">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="예: 모든 테이블 목록을 보여줘&#10;&#10;users 테이블에서 최근 가입자 10명을 조회해줘&#10;&#10;주문 금액이 100만원 이상인 고객 목록..."
                    className="flex-1 w-full border rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={loading}
                  />
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? "처리 중..." : "실행"}
                    </button>
                    <button
                      onClick={() => setInput("")}
                      disabled={loading || !input}
                      className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="입력 초기화"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              </div>

              {/* Response Box - 56% */}
              <div className="w-[56%] flex flex-col bg-white rounded-xl shadow-sm border">
                <div className="px-5 py-4 border-b">
                  <h2 className="font-semibold text-gray-800">응답</h2>
                  <p className="text-xs text-gray-500 mt-1">쿼리 결과가 여기에 표시됩니다</p>
                </div>
                <div className="flex-1 p-5 overflow-auto">
                  {messages.filter((m) => m.role === "assistant").length === 0 && !loading && (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <p>아직 응답이 없습니다</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {messages.filter((msg) => msg.role === "assistant").map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-lg p-4 bg-gray-50 border border-gray-200"
                      >
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

                        {msg.sql && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">SQL:</p>
                            <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded overflow-x-auto">
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
                            <table className="min-w-full text-xs border">
                              <thead className="bg-gray-100">
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
                    ))}

                    {loading && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="text-sm text-gray-500 ml-2">처리 중...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeMenu === "schema" && (
            <div className="w-full flex flex-col bg-white rounded-xl shadow-sm border">
              {/* Schema Header */}
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">데이터베이스 스키마</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {schemaData
                      ? `마지막 업데이트: ${new Date(schemaData.lastUpdated).toLocaleString("ko-KR")}`
                      : "스키마 정보를 불러오는 중..."}
                  </p>
                </div>
                <button
                  onClick={() => loadSchema(true)}
                  disabled={schemaLoading}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {schemaLoading ? "로딩 중..." : "새로고침"}
                </button>
              </div>

              {/* Schema Tabs */}
              <div className="px-5 py-3 border-b flex gap-2">
                {[
                  { id: "tables" as const, label: "테이블", count: schemaData ? Object.keys(schemaData.tables).length : 0 },
                  { id: "procedures" as const, label: "저장 프로시저", count: schemaData ? Object.keys(schemaData.storedProcedures).length : 0 },
                  { id: "views" as const, label: "뷰", count: schemaData ? Object.keys(schemaData.views).length : 0 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSchemaTab(tab.id)}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      schemaTab === tab.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Schema Content */}
              <div className="flex-1 p-5 overflow-auto">
                {schemaLoading && (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="text-sm text-gray-500 ml-2">스키마 로딩 중...</span>
                    </div>
                  </div>
                )}

                {schemaError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                    <p className="font-medium">스키마 로드 실패</p>
                    <p className="text-sm mt-1">{schemaError}</p>
                  </div>
                )}

                {schemaData && !schemaLoading && (
                  <div className="space-y-2">
                    {/* Tables Tab */}
                    {schemaTab === "tables" &&
                      Object.values(schemaData.tables).map((table) => (
                        <div key={table.fullName} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleTableExpand(table.fullName)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">{expandedTables.has(table.fullName) ? "▼" : "▶"}</span>
                              <span className="font-medium text-gray-800">{table.fullName}</span>
                              <span className="text-xs text-gray-500">({table.columns.length} columns)</span>
                            </div>
                          </button>
                          {expandedTables.has(table.fullName) && (
                            <div className="p-4 bg-white">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-gray-500 text-xs">
                                    <th className="pb-2 font-medium">컬럼명</th>
                                    <th className="pb-2 font-medium">타입</th>
                                    <th className="pb-2 font-medium">NULL</th>
                                    <th className="pb-2 font-medium">키</th>
                                    <th className="pb-2 font-medium">참조</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.columns.map((col) => (
                                    <tr key={col.name} className="border-t">
                                      <td className="py-2 font-mono text-gray-800">{col.name}</td>
                                      <td className="py-2 text-gray-600">
                                        {col.dataType}
                                        {col.maxLength && col.maxLength > 0 && `(${col.maxLength})`}
                                      </td>
                                      <td className="py-2">
                                        {col.isNullable ? (
                                          <span className="text-gray-400">NULL</span>
                                        ) : (
                                          <span className="text-orange-600">NOT NULL</span>
                                        )}
                                      </td>
                                      <td className="py-2">
                                        {col.isPrimaryKey && (
                                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">PK</span>
                                        )}
                                        {col.isForeignKey && (
                                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded ml-1">FK</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-xs text-gray-500 font-mono">
                                        {col.foreignKeyRef || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}

                    {/* Stored Procedures Tab */}
                    {schemaTab === "procedures" &&
                      Object.values(schemaData.storedProcedures).map((sp) => (
                        <div key={sp.fullName} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleTableExpand(sp.fullName)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">{expandedTables.has(sp.fullName) ? "▼" : "▶"}</span>
                              <span className="font-medium text-gray-800">{sp.fullName}</span>
                              <span className="text-xs text-gray-500">({sp.parameters.length} params)</span>
                            </div>
                          </button>
                          {expandedTables.has(sp.fullName) && (
                            <div className="p-4 bg-white">
                              {sp.description && (
                                <p className="text-sm text-gray-600 mb-3">{sp.description}</p>
                              )}
                              {sp.parameters.length > 0 ? (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-gray-500 text-xs">
                                      <th className="pb-2 font-medium">파라미터</th>
                                      <th className="pb-2 font-medium">타입</th>
                                      <th className="pb-2 font-medium">방향</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sp.parameters.map((param) => (
                                      <tr key={param.name} className="border-t">
                                        <td className="py-2 font-mono text-gray-800">{param.name}</td>
                                        <td className="py-2 text-gray-600">{param.dataType}</td>
                                        <td className="py-2">
                                          {param.isOutput ? (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">OUTPUT</span>
                                          ) : (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">INPUT</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-sm text-gray-500">파라미터 없음</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                    {/* Views Tab */}
                    {schemaTab === "views" &&
                      Object.values(schemaData.views).map((view) => (
                        <div key={view.fullName} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleTableExpand(view.fullName)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">{expandedTables.has(view.fullName) ? "▼" : "▶"}</span>
                              <span className="font-medium text-gray-800">{view.fullName}</span>
                              <span className="text-xs text-gray-500">({view.columns.length} columns)</span>
                            </div>
                          </button>
                          {expandedTables.has(view.fullName) && (
                            <div className="p-4 bg-white">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-gray-500 text-xs">
                                    <th className="pb-2 font-medium">컬럼명</th>
                                    <th className="pb-2 font-medium">타입</th>
                                    <th className="pb-2 font-medium">NULL</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {view.columns.map((col) => (
                                    <tr key={col.name} className="border-t">
                                      <td className="py-2 font-mono text-gray-800">{col.name}</td>
                                      <td className="py-2 text-gray-600">
                                        {col.dataType}
                                        {col.maxLength && col.maxLength > 0 && `(${col.maxLength})`}
                                      </td>
                                      <td className="py-2">
                                        {col.isNullable ? (
                                          <span className="text-gray-400">NULL</span>
                                        ) : (
                                          <span className="text-orange-600">NOT NULL</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}

                    {/* Empty States */}
                    {schemaTab === "tables" && Object.keys(schemaData.tables).length === 0 && (
                      <p className="text-center text-gray-500 py-8">테이블이 없습니다</p>
                    )}
                    {schemaTab === "procedures" && Object.keys(schemaData.storedProcedures).length === 0 && (
                      <p className="text-center text-gray-500 py-8">저장 프로시저가 없습니다</p>
                    )}
                    {schemaTab === "views" && Object.keys(schemaData.views).length === 0 && (
                      <p className="text-center text-gray-500 py-8">뷰가 없습니다</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === "history" && (
            <div className="w-full flex flex-col bg-white rounded-xl shadow-sm border">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">쿼리 히스토리</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {history.length > 0 ? `총 ${history.length}개의 쿼리` : "실행한 쿼리가 없습니다"}
                  </p>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="px-4 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    전체 삭제
                  </button>
                )}
              </div>
              <div className="flex-1 p-5 overflow-auto">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <span className="text-4xl mb-3">📋</span>
                    <p>아직 실행한 쿼리가 없습니다</p>
                    <p className="text-sm mt-1">쿼리를 실행하면 여기에 기록됩니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 line-clamp-2">{item.query}</p>
                            {item.sql && (
                              <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
                                {item.sql}
                              </pre>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {item.success ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                성공 {item.resultCount !== undefined && `(${item.resultCount}건)`}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">실패</span>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(item.timestamp).toLocaleString("ko-KR", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {AI_MODELS.find((m) => m.id === item.model)?.name || item.model}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {DATABASES.find((d) => d.id === item.database)?.name || item.database}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === "settings" && (
            <div className="w-full flex flex-col bg-white rounded-xl shadow-sm border">
              <div className="px-5 py-4 border-b">
                <h2 className="font-semibold text-gray-800">설정</h2>
                <p className="text-xs text-gray-500 mt-1">애플리케이션 설정 및 연결 상태</p>
              </div>
              <div className="flex-1 p-5 overflow-auto">
                <div className="max-w-2xl space-y-6">
                  {/* 데이터베이스 연결 상태 */}
                  <div className="border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-800">데이터베이스 연결</h3>
                      <button
                        onClick={checkDbHealth}
                        disabled={healthLoading}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {healthLoading ? "확인 중..." : "연결 확인"}
                      </button>
                    </div>
                    {healthLoading ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="text-sm ml-2">연결 상태 확인 중...</span>
                      </div>
                    ) : dbHealth ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              dbHealth.connected ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className={dbHealth.connected ? "text-green-700" : "text-red-700"}>
                            {dbHealth.connected ? "연결됨" : "연결 안 됨"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{dbHealth.message}</p>
                        {dbHealth.error && (
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{dbHealth.error}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">연결 확인 버튼을 눌러주세요</p>
                    )}
                  </div>

                  {/* 현재 설정 */}
                  <div className="border rounded-lg p-5">
                    <h3 className="font-medium text-gray-800 mb-4">현재 설정</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-gray-600">선택된 AI 모델</span>
                        <span className="text-sm font-medium text-gray-800">
                          {AI_MODELS.find((m) => m.id === selectedModel)?.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-gray-600">선택된 데이터베이스</span>
                        <span className="text-sm font-medium text-gray-800">
                          {DATABASES.find((d) => d.id === selectedDb)?.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-gray-600">히스토리 저장 개수</span>
                        <span className="text-sm font-medium text-gray-800">{history.length} / 50</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">스키마 캐시</span>
                        <span className="text-sm font-medium text-gray-800">
                          {schemaData ? (
                            <span className="text-green-600">로드됨</span>
                          ) : (
                            <span className="text-gray-400">로드 안 됨</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI 모델 정보 */}
                  <div className="border rounded-lg p-5">
                    <h3 className="font-medium text-gray-800 mb-4">지원 AI 모델</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {AI_MODELS.map((model) => (
                        <div
                          key={model.id}
                          className={`p-3 rounded-lg border ${
                            selectedModel === model.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200"
                          }`}
                        >
                          <p className="font-medium text-gray-800">{model.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 데이터베이스 정보 */}
                  <div className="border rounded-lg p-5">
                    <h3 className="font-medium text-gray-800 mb-4">지원 데이터베이스</h3>
                    <div className="space-y-2">
                      {DATABASES.map((db) => (
                        <div
                          key={db.id}
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            selectedDb === db.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-gray-800">{db.name}</p>
                            <p className="text-xs text-gray-500">Microsoft SQL Server</p>
                          </div>
                          {selectedDb === db.id && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              사용 중
                            </span>
                          )}
                        </div>
                      ))}
                      <div className="p-3 rounded-lg border border-dashed border-gray-300 text-center">
                        <p className="text-sm text-gray-400">PostgreSQL, MySQL 추가 예정</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
