"use client";

import { Button } from "@/components/ui/primitives";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-6">
      <p className="label">Algo deu errado</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">Não consegui carregar esta tela.</h1>
      <p className="mt-2 text-[13px] leading-6 text-ink-3">
        {process.env.NODE_ENV === "development" ? error.message : "Veja o terminal do npm run dev para detalhes."}
      </p>
      <Button className="mt-5" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
