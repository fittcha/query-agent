import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================
// 타입 정의
// ============================================

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
}

export interface LLMProvider {
  name: string;
  isConfigured: () => boolean;
  chat: (messages: LLMMessage[], systemPrompt: string) => Promise<LLMResponse>;
}

// ============================================
// Claude Provider (Anthropic)
// ============================================

const createClaudeProvider = (modelId: string, modelName: string): LLMProvider => {
  const anthropic = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  return {
    name: modelName,
    isConfigured: () => !!process.env.ANTHROPIC_API_KEY,
    chat: async (messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse> => {
      if (!anthropic) {
        throw new Error("Anthropic API key not configured");
      }

      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      return {
        content: content.text,
        provider: "claude",
        model: modelId,
      };
    },
  };
};

// ============================================
// Groq Provider (Llama)
// ============================================

const createGroqProvider = (): LLMProvider => {
  const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  return {
    name: "Llama 3.3 70B",
    isConfigured: () => !!process.env.GROQ_API_KEY,
    chat: async (messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse> => {
      if (!groq) {
        throw new Error("Groq API key not configured");
      }

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_tokens: 4096,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from Groq");
      }

      return {
        content,
        provider: "groq",
        model: "llama-3.3-70b-versatile",
      };
    },
  };
};

// ============================================
// Gemini Provider (Google)
// ============================================

const createGeminiProvider = (): LLMProvider => {
  const genAI = process.env.GOOGLE_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
    : null;

  return {
    name: "Gemini 2.5 Flash",
    isConfigured: () => !!process.env.GOOGLE_API_KEY,
    chat: async (messages: LLMMessage[], systemPrompt: string): Promise<LLMResponse> => {
      if (!genAI) {
        throw new Error("Google API key not configured");
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-05-20",
        systemInstruction: systemPrompt,
      });

      // Gemini 형식으로 메시지 변환
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({ history });
      const lastMessage = messages[messages.length - 1];

      const result = await chat.sendMessage(lastMessage.content);
      const content = result.response.text();

      if (!content) {
        throw new Error("Empty response from Gemini");
      }

      return {
        content,
        provider: "gemini",
        model: "gemini-2.5-flash-preview-05-20",
      };
    },
  };
};

// ============================================
// Provider Registry
// ============================================

export type ProviderKey = "claude-opus" | "claude-sonnet" | "groq" | "gemini";

const providers: Record<ProviderKey, LLMProvider> = {
  "claude-opus": createClaudeProvider("claude-opus-4-20250514", "Claude Opus 4.5"),
  "claude-sonnet": createClaudeProvider("claude-sonnet-4-20250514", "Claude Sonnet 4"),
  "groq": createGroqProvider(),
  "gemini": createGeminiProvider(),
};

export function getProvider(key: ProviderKey): LLMProvider {
  const provider = providers[key];
  if (!provider) {
    throw new Error(`Unknown provider: ${key}`);
  }
  return provider;
}

export function getAvailableProviders(): { id: ProviderKey; name: string; configured: boolean }[] {
  return (Object.keys(providers) as ProviderKey[]).map((key) => ({
    id: key,
    name: providers[key].name,
    configured: providers[key].isConfigured(),
  }));
}

export { providers };
