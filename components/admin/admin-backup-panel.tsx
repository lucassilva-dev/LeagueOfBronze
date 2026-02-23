"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdminBackupPanel({
  onImportText,
  onImportFile,
  importing,
}: {
  onImportText: (text: string) => Promise<void>;
  onImportFile: (file: File) => Promise<void>;
  importing?: boolean;
}) {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <h3 className="font-display text-lg font-bold tracking-wide">Exportar JSON</h3>
        <p className="mt-1 text-sm text-muted">
          Baixa um backup do `leagueofbronze.json` atual.
        </p>
        <div className="mt-4">
          <a
            href="/api/admin/export"
            className="inline-flex h-10 items-center rounded-xl bg-accent/90 px-4 text-sm font-semibold tracking-wide text-slate-950 shadow-glow transition hover:bg-accent"
          >
            Exportar backup
          </a>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-lg font-bold tracking-wide">Importar JSON (arquivo)</h3>
        <p className="mt-1 text-sm text-muted">
          Substitui os dados atuais pelo arquivo importado após validação.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await onImportFile(file);
              e.currentTarget.value = "";
            }}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? "Importando..." : "Selecionar arquivo"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <h3 className="font-display text-lg font-bold tracking-wide">Importar JSON (colar texto)</h3>
        <p className="mt-1 text-sm text-muted">
          Útil para restore rápido sem arquivo local.
        </p>
        <div className="mt-4">
          <Label htmlFor="import-json-text">JSON</Label>
          <Textarea
            id="import-json-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui um arquivo válido do campeonato em formato JSON..."
            className="min-h-[220px] font-mono text-xs"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              await onImportText(text);
              setText("");
            }}
            disabled={importing || !text.trim()}
          >
            {importing ? "Importando..." : "Importar texto"}
          </Button>
          <Button variant="ghost" onClick={() => setText("")} disabled={importing}>
            Limpar
          </Button>
        </div>
      </Card>
    </div>
  );
}
