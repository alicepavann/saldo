"use client";

import { useState } from "react";
import { FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/primitives";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export function ImportB3() {
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  return (
    <Dialog onOpenChange={(o) => !o && setFile(null)}>
      <DialogTrigger asChild>
        <Button>
          <Upload /> Importar da B3
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Importar posição da B3"
        description="Para ativos que não chegam pelo Open Finance. Na Área do Investidor, vá em Extratos › Posição e exporte em Excel."
      >
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            setFile(e.dataTransfer.files[0] ?? null);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed px-6 py-10 text-center transition-colors",
            over ? "border-rose bg-rose-soft" : "border-line-strong hover:border-ink-4",
          )}
        >
          <FileUp className="mb-3 size-5 text-ink-3" strokeWidth={1.6} />
          <p className="text-[13px] text-ink">{file ? file.name : "Arraste o arquivo .xlsx aqui"}</p>
          <p className="mt-1 text-xs text-ink-3">{file ? `${Math.round(file.size / 1024)} KB` : "ou clique para escolher"}</p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <p className="mt-3 text-xs text-ink-3">
          Ativos que já vêm pela Pluggy são ignorados na importação, para não duplicar.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="primary"
              disabled={!file}
              onClick={() => toast("Importação simulada", { description: "No protótipo nenhum dado é gravado." })}
            >
              Importar
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
