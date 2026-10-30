import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { PluggyClient } from "pluggy-sdk";
import { z } from "zod";

const Body = z.object({ itemId: z.string().uuid().optional() });

/**
 * Gera um connect token (vale 30 min) para abrir o widget Pluggy Connect.
 * Com itemId, o widget abre no modo "atualizar/renovar" dessa conexão.
 *
 * Exige a sessão (proxy.ts + checagem aqui).
 */
export async function POST(req: Request) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "Entre de novo." }, { status: 401 });
  const clientId = process.env.PLUGGY_CLIENT_ID?.trim();
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Faltam PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.local." }, { status: 500 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "itemId inválido" }, { status: 400 });

  try {
    const pluggy = new PluggyClient({ clientId, clientSecret });
    // Atenção: o 1º parâmetro é o itemId; as opções vêm no 2º.
    const { accessToken } = await pluggy.createConnectToken(parsed.data.itemId, { avoidDuplicates: true });
    return NextResponse.json({ accessToken });
  } catch (err) {
    const status = (err as { response?: { statusCode?: number } })?.response?.statusCode;
    return NextResponse.json(
      { error: status === 401 || status === 403 ? "A Pluggy recusou as credenciais." : "Não consegui gerar o token." },
      { status: 502 },
    );
  }
}
