"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/primitives";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// O widget mexe em window/iframe: só carrega no navegador.
const PluggyConnect = dynamic(() => import("react-pluggy-connect").then((m) => m.PluggyConnect), {
  ssr: false,
});

const MEU_PLUGGY = 200;

export function PluggyConnectButton({
  itemId,
  currentItemIds,
  disabled,
}: {
  /** Se informado, abre no modo "renovar/atualizar" desta conexão. */
  itemId?: string;
  currentItemIds: string[];
  disabled?: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const open = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connect-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(itemId ? { itemId } : {}),
      });
      const data = (await res.json()) as { accessToken?: string; error?: string };
      if (!res.ok || !data.accessToken) throw new Error(data.error ?? "Falha ao gerar o token");
      setToken(data.accessToken);
    } catch (e) {
      toast.error("Não consegui abrir a Pluggy", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const envLine = (id: string) =>
    `PLUGGY_ITEM_IDS=${[...new Set([...currentItemIds, id])].join(",")}`;

  return (
    <>
      <Button size="sm" onClick={open} disabled={disabled || loading}>
        {itemId ? <RefreshCw /> : <Link2 />}
        {loading ? "Abrindo…" : itemId ? "Renovar" : "Conectar instituição"}
      </Button>

      {token ? (
        <PluggyConnect
          connectToken={token}
          updateItem={itemId}
          selectedConnectorId={itemId ? undefined : MEU_PLUGGY}
          theme="dark"
          language="pt"
          onSuccess={({ item }) => {
            setToken(null);
            if (itemId) {
              toast("Conexão renovada", { description: "Clique em Sincronizar para buscar os dados de novo." });
            } else {
              setCreated({ id: item.id, name: item.connector?.name ?? "Nova conexão" });
            }
          }}
          onError={(e) => {
            toast.error("A conexão não foi concluída", { description: e.message });
          }}
          onClose={() => setToken(null)}
        />
      ) : null}

      <Dialog open={!!created} onOpenChange={(o) => !o && (setCreated(null), setCopied(false))}>
        {created ? (
          <DialogContent
            title="Conexão criada"
            description="Ainda não temos banco de dados, então o ID precisa ir para o .env.local. Troque a linha PLUGGY_ITEM_IDS por esta e reinicie o npm run dev."
          >
            <pre className="mono scrollbar-thin overflow-x-auto rounded-[10px] border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink">
              {envLine(created.id)}
            </pre>
            <div className="mt-5 flex justify-end">
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(envLine(created.id));
                    setCopied(true);
                  } catch {
                    toast.error("Não consegui copiar. Selecione o texto e copie à mão.");
                  }
                }}
              >
                {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar linha"}
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
