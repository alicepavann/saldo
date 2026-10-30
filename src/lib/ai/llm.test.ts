import { describe, expect, it } from "vitest";
import { GROQ_BASE_URL, GROQ_DEFAULT_MODEL, resolveProvider } from "./llm";

const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

describe("resolveProvider", () => {
  it("sem chave, sem IA", () => {
    expect(resolveProvider(env({}))).toBeNull();
  });
  it("Groq tem prioridade e usa o modelo padrão", () => {
    const p = resolveProvider(env({ GROQ_API_KEY: "gsk_x", ANTHROPIC_API_KEY: "sk-ant" }));
    expect(p).toMatchObject({ kind: "openai", name: "Groq", baseUrl: GROQ_BASE_URL, model: GROQ_DEFAULT_MODEL });
  });
  it("respeita GROQ_MODEL e AI_PROVIDER", () => {
    expect(resolveProvider(env({ GROQ_API_KEY: "g", GROQ_MODEL: "llama-3.3-70b-versatile" }))).toMatchObject({ model: "llama-3.3-70b-versatile" });
    expect(resolveProvider(env({ GROQ_API_KEY: "g", ANTHROPIC_API_KEY: "a", AI_PROVIDER: "anthropic" }))).toMatchObject({ kind: "anthropic" });
  });
  it("aceita outra API compatível com OpenAI", () => {
    expect(resolveProvider(env({ AI_BASE_URL: "https://api.cerebras.ai/v1/", AI_API_KEY: "c", AI_MODEL: "m" }))).toMatchObject({
      kind: "openai",
      name: "api.cerebras.ai",
      baseUrl: "https://api.cerebras.ai/v1",
    });
  });
});
