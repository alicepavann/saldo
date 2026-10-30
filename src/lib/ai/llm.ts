import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Camada única para falar com a IA. Escolhe o provedor pelo .env.local:
 *  - GROQ_API_KEY       → Groq (grátis, compatível com OpenAI)
 *  - AI_BASE_URL + AI_API_KEY → qualquer API compatível com OpenAI (Cerebras, OpenRouter…)
 *  - ANTHROPIC_API_KEY  → Claude
 * Sem nenhuma chave, devolve null e a tela usa as regras fixas.
 */

export type Provider =
  | { kind: "openai"; name: string; baseUrl: string; apiKey: string; model: string }
  | { kind: "anthropic"; name: string; apiKey: string; model?: string };

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

export function resolveProvider(env: NodeJS.ProcessEnv = process.env): Provider | null {
  const pick = (v?: string) => v?.trim() || undefined;
  const forced = pick(env.AI_PROVIDER)?.toLowerCase();

  const groqKey = pick(env.GROQ_API_KEY);
  const genericKey = pick(env.AI_API_KEY);
  const genericUrl = pick(env.AI_BASE_URL);
  const anthropicKey = pick(env.ANTHROPIC_API_KEY);

  if ((forced === "groq" || !forced) && groqKey) {
    return { kind: "openai", name: "Groq", baseUrl: GROQ_BASE_URL, apiKey: groqKey, model: pick(env.GROQ_MODEL) ?? GROQ_DEFAULT_MODEL };
  }
  if ((forced === "openai" || !forced) && genericKey && genericUrl) {
    return { kind: "openai", name: new URL(genericUrl).hostname, baseUrl: genericUrl.replace(/\/$/, ""), apiKey: genericKey, model: pick(env.AI_MODEL) ?? "" };
  }
  if ((forced === "anthropic" || !forced) && anthropicKey) {
    return { kind: "anthropic", name: "Claude", apiKey: anthropicKey, model: pick(env.ANTHROPIC_MODEL) };
  }
  return null;
}

export class AiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function chatJson(p: Extract<Provider, { kind: "openai" }>, system: string, user: string, jsonSchema: object | null) {
  const body = {
    model: p.model,
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: jsonSchema
      ? { type: "json_schema", json_schema: { name: "analise", strict: false, schema: jsonSchema } }
      : { type: "json_object" },
  };
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AiError(text.slice(0, 300) || res.statusText, res.status);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  // Alguns modelos embrulham o JSON em ```json … ```
  const clean = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  return JSON.parse(clean) as unknown;
}

let anthropicModel: string | null = null;

/** Gera um objeto no formato do `schema`. Lança AiError em falhas de rede/chave/formato. */
export async function generateObject<T extends z.ZodType>(
  schema: T,
  system: string,
  user: string,
  provider = resolveProvider(),
): Promise<{ data: z.infer<T>; model: string; provider: string } | null> {
  if (!provider) return null;

  if (provider.kind === "anthropic") {
    const client = new Anthropic({ apiKey: provider.apiKey });
    let model = provider.model ?? anthropicModel;
    if (!model) {
      const ids: string[] = [];
      for await (const m of client.models.list({ limit: 50 })) ids.push(m.id);
      model = anthropicModel = ids.find((id) => id.includes("sonnet")) ?? ids[0];
    }
    try {
      const msg = await client.messages.parse({
        model,
        max_tokens: 3000,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(schema) },
      });
      if (!msg.parsed_output) throw new AiError("Resposta sem o formato esperado");
      return { data: msg.parsed_output as z.infer<T>, model, provider: provider.name };
    } catch (err) {
      if (err instanceof AiError) throw err;
      throw new AiError((err as Error).message, (err as { status?: number }).status);
    }
  }

  // Compatível com OpenAI (Groq etc.): tenta JSON Schema; se o modelo não suportar, cai para JSON simples.
  const jsonSchema = z.toJSONSchema(schema) as object;
  const userWithSchema = `${user}\n\nResponda SOMENTE com um JSON válido neste formato (JSON Schema):\n${JSON.stringify(jsonSchema)}`;
  let raw: unknown;
  try {
    raw = await chatJson(provider, system, user, jsonSchema);
  } catch (err) {
    if (err instanceof AiError && err.status === 400) {
      raw = await chatJson(provider, system, userWithSchema, null);
    } else {
      throw err;
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new AiError("A IA respondeu fora do formato esperado");
  return { data: parsed.data, model: provider.model, provider: provider.name };
}
