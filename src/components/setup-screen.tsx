import { Logo } from "@/components/shell/logo";

export function SetupScreen({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-lg">
        <Logo />
        <div className="card mt-8 p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-rose" />
            <p className="label">Configuração da Pluggy</p>
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          <p className="mt-2 text-[13px] leading-6 text-ink-2">{hint}</p>
          <div className="mt-6 rounded-[10px] border border-line bg-surface-2 p-4">
            <p className="text-xs text-ink-3">Para voltar aos dados de exemplo, use no .env.local:</p>
            <pre className="mono mt-2 text-xs text-ink">DATA_SOURCE=mock</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
