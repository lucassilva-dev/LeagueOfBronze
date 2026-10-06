"use client";

import { useState } from "react";

import { QrCode } from "@/components/pix/qr-code";
import type { Messages } from "@/lib/i18n/messages";
import { pixDaInscricao } from "@/lib/pix";

type Rotulos = Messages["inscricao"];

/**
 * Como pagar a inscrição: QR code, "Pix copia e cola" e a chave, com o valor já dentro.
 *
 * O mesmo bloco na tela de "inscrição recebida" e na "Minha inscrição", para quem se
 * inscreveu e voltou para pagar depois ver exatamente o mesmo código.
 *
 * NÃO vai no passo 3 do formulário, de propósito: pagar antes de a inscrição existir
 * deixaria um Pix sem dono se o envio falhasse (nick repetido, rede caindo).
 */
export function PagamentoPix({
  t,
  chave,
  valorCentavos,
}: Readonly<{ t: Rotulos; chave: string; valorCentavos: number }>) {
  const [copiado, setCopiado] = useState<"codigo" | "chave" | null>(null);

  // Uma chave malformada no painel não pode derrubar a tela do jogador: sem código
  // gerável, sobra a chave para copiar à mão.
  let codigo: string | null = null;
  try {
    codigo = pixDaInscricao(chave, valorCentavos);
  } catch {
    codigo = null;
  }

  async function copiar(texto: string, qual: "codigo" | "chave") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
    } catch {
      // Sem permissão de área de transferência o texto continua na tela para copiar à
      // mão — não vale quebrar o fluxo por causa disso.
      setCopiado(null);
    }
  }

  const rotuloPequeno: React.CSSProperties = { fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)" };
  const valor = (valorCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
      {codigo ? (
        <div style={{ flex: "0 0 auto", width: 200, maxWidth: "100%" }}>
          <QrCode texto={codigo} tamanho={200} rotulo={t.pixQrRotulo.replace("{valor}", valor)} />
        </div>
      ) : null}

      <div style={{ flex: "1 1 240px", minWidth: 0, display: "grid", gap: 12 }}>
        {codigo ? (
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--lob-muted)" }}>
            {t.pixQrAjuda.replace("{valor}", valor)}
          </p>
        ) : null}

        {codigo ? (
          <div>
            <div style={rotuloPequeno}>{t.pixCopiaEColaLabel}</div>
            <div
              style={{
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 4,
                border: "1px solid var(--lob-line)",
                background: "rgba(0,0,0,.3)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11.5,
                lineHeight: 1.45,
                color: "var(--lob-text)",
                overflowWrap: "anywhere",
                userSelect: "all",
              }}
            >
              {codigo}
            </div>
            <button
              type="button"
              className="lob-btn-gold"
              onClick={() => void copiar(codigo!, "codigo")}
              style={{ marginTop: 8 }}
            >
              {copiado === "codigo" ? t.pixCopiado : t.pixCopiarCodigo}
            </button>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={rotuloPequeno}>{t.pixLabel}</div>
            <div style={{ marginTop: 4, fontSize: 14, color: "var(--lob-text)", overflowWrap: "anywhere" }}>
              {chave}
            </div>
          </div>
          <button type="button" className="lob-btn-ghost" onClick={() => void copiar(chave, "chave")}>
            {copiado === "chave" ? t.pixCopiado : t.pixCopiar}
          </button>
        </div>
      </div>
    </div>
  );
}
