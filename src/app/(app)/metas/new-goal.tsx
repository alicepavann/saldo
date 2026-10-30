"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui/primitives";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function NewGoal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus /> Nova meta
        </Button>
      </DialogTrigger>
      <DialogContent title="Nova meta" description="Defina o valor e a data. O painel calcula quanto guardar por mês.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            toast("Meta criada", { description: String(f.get("name") || "Sem nome") });
            (e.currentTarget.closest("[role=dialog]")?.querySelector("[aria-label=Fechar]") as HTMLButtonElement)?.click();
          }}
        >
          <label className="block">
            <span className="label">Nome</span>
            <Input name="name" className="mt-1.5" placeholder="Ex.: Intercâmbio" required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Valor-alvo (R$)</span>
              <Input name="target" type="number" min={1} className="num mt-1.5" placeholder="10000" required />
            </label>
            <label className="block">
              <span className="label">Data-alvo</span>
              <Input name="date" type="date" className="num mt-1.5 [color-scheme:dark]" required />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary">
              Criar meta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
