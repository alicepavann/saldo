import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkPassword, createSession, isAuthed, verifySession } from "./auth";

describe("auth", () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = "senha-forte-123";
    process.env.AUTH_SECRET = "segredo-de-teste";
  });
  afterEach(() => {
    delete process.env.APP_PASSWORD;
    delete process.env.AUTH_SECRET;
  });

  it("confere a senha", async () => {
    expect(await checkPassword("senha-forte-123")).toBe(true);
    expect(await checkPassword("senha-forte-12")).toBe(false);
    expect(await checkPassword("")).toBe(false);
  });

  it("aceita sessão válida e recusa adulterada ou vencida", async () => {
    const now = 1_800_000_000_000;
    const t = await createSession(now);
    expect(await verifySession(t, now)).toBe(true);
    const [exp, sig] = t.split(".");
    expect(await verifySession(`${Number(exp) + 1}.${sig}`, now)).toBe(false);
    expect(await verifySession(t, now + 31 * 864e5)).toBe(false);
    expect(await verifySession("lixo", now)).toBe(false);
  });

  it("sessão de outro segredo não vale", async () => {
    const t = await createSession();
    process.env.AUTH_SECRET = "outro";
    expect(await verifySession(t)).toBe(false);
  });

  it("isAuthed lê o cookie da requisição", async () => {
    const t = await createSession();
    expect(await isAuthed(new Request("http://x", { headers: { cookie: `a=1; saldo_session=${t}` } }))).toBe(true);
    expect(await isAuthed(new Request("http://x"))).toBe(false);
  });
});
