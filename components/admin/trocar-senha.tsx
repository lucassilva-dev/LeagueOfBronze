"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { KeyRound } from "lucide-react";

import { useCompacto } from "@/components/admin/responsivo";
import { Banner, Button, C, Field, Input } from "@/components/admin/ui";

/**
 * Troca da própria senha, pela pessoa da organização.
 *
 * Existe porque a conta criada para outra pessoa nascia marcada como "troca pendente"
 * e não havia nada que trocasse: o único caminho era o master redefinir pelo painel,
 * o que deixa o master sabendo a senha do outro para sempre. Uma conta que a pessoa
 * não consegue tornar só dela não é dela.
 *
 * Quando a troca é obrigatória, o bloco aparece aberto e com aviso; nos outros casos
 * fica recolhido atrás de um link, para não poluir o painel de quem já trocou.
 *
 * No celular ele mora no cartão da conta, no fim da folha "Seções do painel": o link vira
 * alvo de dedo, os botões ocupam a largura toda e os campos ficam num <form> — assim o
 * "Ir" do teclado do telefone troca a senha, sem a pessoa ter de fechar o teclado para
 * achar o botão.
 */
export function TrocarSenha({
  obrigatoria,
  onTrocada,
}: Readonly<{ obrigatoria: boolean; onTrocada: () => void }>) {
  const compacto = useCompacto();
  const [aberto, setAberto] = useState(obrigatoria);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    // O "Ir" do teclado não passa pelo `disabled` do botão: sem esta guarda, dois toques
    // mandavam a troca duas vezes (e a segunda falhava com a senha atual já trocada).
    if (enviando) return;
    setErro(null);
    if (nova !== repetida) {
      setErro("As duas senhas novas não são iguais.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/senha", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: atual, senhaNova: nova }),
      });
      const corpo = (await r.json().catch(() => ({}))) as { error?: string };

      if (!r.ok) {
        setErro(corpo.error ?? "Não foi possível trocar a senha.");
        return;
      }
      setAtual("");
      setNova("");
      setRepetida("");
      setOk(true);
      onTrocada();
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <div style={{ marginTop: 10 }}>
        <Banner tone="ok" title="Senha trocada">
          As outras sessões desta conta foram encerradas. A partir daqui, só você entra com ela.
        </Banner>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        style={{
          marginTop: 10,
          padding: 0,
          border: 0,
          background: "none",
          color: C.bronze,
          fontFamily: "inherit",
          fontSize: 11,
          cursor: "pointer",
          textDecoration: "underline",
          // No celular o link de 11px era um alvo de 14px de altura no fim de uma folha
          // rolável: vira uma linha de toque, com a chave na frente.
          ...(compacto && {
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            minHeight: 40,
            marginTop: 6,
            fontSize: 13,
          }),
        }}
      >
        {compacto ? <KeyRound size={15} aria-hidden /> : null}
        Trocar minha senha
      </button>
    );
  }

  const campos = (
    <>
      {obrigatoria ? (
        <div style={{ marginBottom: 10 }}>
          <Banner tone="warn" title="Troque a senha provisória">
            Ela foi definida por outra pessoa e ainda é conhecida por quem a criou.
          </Banner>
        </div>
      ) : null}

      {/* `autoComplete` certo para o gerenciador de senhas do celular: ele preenche a atual
          e oferece uma senha forte nas duas novas, em vez de sugerir a velha em todas. */}
      <Field label="Senha atual">
        <Input
          value={atual}
          onChange={setAtual}
          type="password"
          ariaLabel="Senha atual"
          autoComplete="current-password"
        />
      </Field>
      <div style={{ height: compacto ? 12 : 8 }} />
      <Field label="Nova senha" hint="Ao menos 12 caracteres, com letras e números.">
        <Input value={nova} onChange={setNova} type="password" ariaLabel="Nova senha" autoComplete="new-password" />
      </Field>
      <div style={{ height: compacto ? 12 : 8 }} />
      <Field label="Repita a nova senha">
        <Input
          value={repetida}
          onChange={setRepetida}
          type="password"
          ariaLabel="Repita a nova senha"
          autoComplete="new-password"
        />
      </Field>

      {erro ? (
        <div style={{ marginTop: 10 }}>
          <Banner tone="danger" title="Não deu">
            {erro}
          </Banner>
        </div>
      ) : null}

      <div
        style={
          compacto
            ? { display: "grid", gap: 8, marginTop: 14 }
            : { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }
        }
      >
        <Button
          tone="gold"
          small={!compacto}
          fullWidth={compacto}
          // No celular quem envia é o <form> (botão ou "Ir" do teclado); no monitor segue o clique.
          type={compacto ? "submit" : "button"}
          onClick={compacto ? undefined : () => void enviar()}
          disabled={enviando}
        >
          {enviando ? "Trocando…" : "Trocar senha"}
        </Button>
        {obrigatoria ? null : (
          <Button tone="ghost" small={!compacto} fullWidth={compacto} onClick={() => setAberto(false)} disabled={enviando}>
            Cancelar
          </Button>
        )}
      </div>
    </>
  );

  return <Envelope compacto={compacto} onEnviar={() => void enviar()}>{campos}</Envelope>;
}

/** No celular, <form> (para o "Ir" do teclado); no monitor, o mesmo <div> de sempre. */
function Envelope({
  compacto,
  onEnviar,
  children,
}: Readonly<{ compacto: boolean; onEnviar: () => void; children: ReactNode }>) {
  if (!compacto) return <div style={{ marginTop: 12 }}>{children}</div>;
  return (
    <form
      noValidate
      style={{ marginTop: 12 }}
      onSubmit={(evento: FormEvent<HTMLFormElement>) => {
        evento.preventDefault();
        onEnviar();
      }}
    >
      {children}
    </form>
  );
}
