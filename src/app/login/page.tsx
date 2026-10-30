"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { cn } from "@/lib/cn";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Não deu certo.");
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPw("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="animate-in w-full max-w-sm">
      <h1 className="display text-[54px] leading-none text-ink">
        Oi de novo<span className="text-rose">.</span>
      </h1>
      <p className="mt-3 text-[14px] text-ink-3">Digite sua senha para abrir o painel.</p>

      <div
        className={cn(
          "mt-10 flex items-center border-b transition-colors",
          error ? "border-neg" : "border-line-strong focus-within:border-rose",
        )}
      >
        <input
          type={show ? "text" : "password"}
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(null);
          }}
          autoFocus
          autoComplete="current-password"
          placeholder="senha"
          aria-label="Senha"
          className="h-14 flex-1 bg-transparent text-[20px] text-ink placeholder:text-ink-4 focus:outline-none focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid size-10 place-items-center text-ink-3 hover:text-ink"
          aria-label={show ? "Esconder senha" : "Mostrar senha"}
        >
          {show ? <EyeOff className="size-4" strokeWidth={1.6} /> : <Eye className="size-4" strokeWidth={1.6} />}
        </button>
        <button
          type="submit"
          disabled={!pw || loading}
          className="grid size-10 place-items-center rounded-full bg-rose text-[#22070f] transition-all hover:bg-rose-strong disabled:bg-surface-3 disabled:text-ink-4"
          aria-label="Entrar"
        >
          <ArrowRight className={cn("size-4", loading && "animate-pulse")} />
        </button>
      </div>
      <p className="mt-3 h-5 text-[13px] text-neg" role="alert">
        {error}
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-14">
        <Logo />
        <div className="flex flex-1 items-center py-16">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="text-[11px] text-ink-4">Dados via Open Finance, só leitura.</p>
      </div>

      <div className="relative hidden overflow-hidden bg-surface lg:block">
        <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 9 }, (_, i) => (
            <circle
              key={i}
              cx="640"
              cy="200"
              r={90 + i * 70}
              fill="none"
              stroke={i === 3 ? "var(--rose)" : "var(--line-strong)"}
              strokeOpacity={i === 3 ? 0.6 : 0.55}
              strokeWidth="1"
            />
          ))}
          <circle cx={640 - 300 * Math.cos(0.9)} cy={200 + 300 * Math.sin(0.9)} r="4" fill="var(--rose)" />
        </svg>
        <div className="relative flex h-full flex-col justify-end p-14">
          <p className="display max-w-md text-[48px] leading-[1.05] text-ink">
            Quanto entrou, quanto saiu e quanto <em className="text-rose-ink">ficou</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
