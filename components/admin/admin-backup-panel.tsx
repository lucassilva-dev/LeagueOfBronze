"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";

import type { TournamentDataset } from "@/lib/schema";
import {
  ActionCard,
  Banner,
  BotaoExportarBackup,
  Button,
  C,
  Check,
  Chip,
  Field,
  ScrollX,
  SectionHead,
  Textarea,
  tabular,
} from "@/components/admin/ui";

/**
 * Importar/Exportar — a tela onde um clique troca o campeonato inteiro.
 *
 * Duas coisas que esta tela precisa dizer antes de qualquer botão:
 *
 * 1. Importar SUBSTITUI os dados gravados na hora (a rota grava direto, não vira rascunho), e
 *    ainda joga fora o rascunho aberto no painel. Por isso todo caminho passa por uma prévia
 *    ("o que vai entrar" contra "o que existe hoje") e uma confirmação explícita.
 * 2. Backup primeiro. O link de exportar aparece dentro do próprio aviso, não escondido em
 *    outro cartão.
 *
 * A prévia é lida no navegador só para informar; quem valida de verdade é o servidor (zod).
 */

type AdminBackupPanelProps = Readonly<{
  onImportText: (text: string) => Promise<void>;
  onImportFile: (file: File) => Promise<void>;
  importing?: boolean;
}>;

type ResumoDataset = Readonly<{
  nome: string;
  encerrada: boolean;
  times: number;
  jogadores: number;
  series: number;
  arquivadas: number;
}>;

type LeituraJson =
  | Readonly<{ ok: true; resumo: ResumoDataset }>
  | Readonly<{ ok: false; erro: string }>;

function tamanhoDeLista(valor: unknown) {
  return Array.isArray(valor) ? valor.length : null;
}

/** Lê o essencial de um JSON de campeonato sem confiar em nada que veio do arquivo. */
function lerResumoJson(texto: string): LeituraJson {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "JSON inválido — o arquivo nem chega a ser lido pelo servidor." };
  }

  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
    return { ok: false, erro: "O conteúdo não é um objeto JSON de campeonato." };
  }

  const objeto = bruto as Record<string, unknown>;
  const times = tamanhoDeLista(objeto.teams);
  const jogadores = tamanhoDeLista(objeto.players);
  const series = tamanhoDeLista(objeto.seriesMatches);

  if (times === null || jogadores === null || series === null) {
    return {
      ok: false,
      erro: "Faltam as listas teams, players ou seriesMatches — isto não parece um backup do campeonato.",
    };
  }

  const torneio =
    objeto.tournament && typeof objeto.tournament === "object"
      ? (objeto.tournament as Record<string, unknown>)
      : {};

  return {
    ok: true,
    resumo: {
      nome: typeof torneio.name === "string" && torneio.name.trim() ? torneio.name : "(sem nome)",
      encerrada: torneio.status === "finished",
      times,
      jogadores,
      series,
      arquivadas: tamanhoDeLista(objeto.archivedSeasons) ?? 0,
    },
  };
}

function resumirDataset(dataset: TournamentDataset): ResumoDataset {
  return {
    nome: dataset.tournament.name,
    encerrada: dataset.tournament.status === "finished",
    times: dataset.teams.length,
    jogadores: dataset.players.length,
    series: dataset.seriesMatches.length,
    arquivadas: dataset.archivedSeasons.length,
  };
}

type EstadoAtual =
  | Readonly<{ situacao: "carregando" }>
  | Readonly<{ situacao: "ok"; resumo: ResumoDataset }>
  | Readonly<{ situacao: "erro"; mensagem: string }>;

/**
 * Lê o dataset GRAVADO — é ele que a importação substitui, então é contra ele que a prévia
 * compara. Relê quando `importing` volta a false (uma importação acabou de mudar o servidor).
 */
function useResumoAtual(importing: boolean) {
  const [estado, setEstado] = useState<EstadoAtual>({ situacao: "carregando" });
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setEstado({ situacao: "carregando" });

    void (async () => {
      try {
        const resposta = await fetch("/api/admin/dataset", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const dados = (await resposta.json()) as { dataset?: TournamentDataset; error?: string };
        if (cancelado) return;
        if (!resposta.ok || !dados.dataset) {
          throw new Error(dados.error || "Não foi possível ler os dados gravados.");
        }
        setEstado({ situacao: "ok", resumo: resumirDataset(dados.dataset) });
      } catch (erro) {
        if (cancelado) return;
        setEstado({
          situacao: "erro",
          mensagem: erro instanceof Error ? erro.message : "Falha ao ler os dados gravados.",
        });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [importing, recarga]);

  return { estado, recarregar: () => setRecarga((n) => n + 1) };
}

// ---------------------------------------------------------------- peças locais

const CELULA: CSSProperties = { padding: "5px 16px 5px 0", fontSize: 12.5 };

/** Prévia da troca: o que existe hoje contra o que o arquivo traz. */
function Comparacao({
  atual,
  arquivo,
}: Readonly<{ atual: ResumoDataset | null; arquivo: ResumoDataset }>) {
  const linhas: ReadonlyArray<{ campo: string; hoje: string; novo: string; perda?: boolean }> = [
    {
      campo: "Nome",
      hoje: atual?.nome ?? "?",
      novo: arquivo.nome,
    },
    {
      campo: "Situação",
      hoje: atual ? (atual.encerrada ? "encerrada" : "em andamento") : "?",
      novo: arquivo.encerrada ? "encerrada" : "em andamento",
    },
    {
      campo: "Times",
      hoje: atual ? String(atual.times) : "?",
      novo: String(arquivo.times),
      perda: atual ? arquivo.times < atual.times : false,
    },
    {
      campo: "Jogadores",
      hoje: atual ? String(atual.jogadores) : "?",
      novo: String(arquivo.jogadores),
      perda: atual ? arquivo.jogadores < atual.jogadores : false,
    },
    {
      campo: "Séries",
      hoje: atual ? String(atual.series) : "?",
      novo: String(arquivo.series),
      perda: atual ? arquivo.series < atual.series : false,
    },
    {
      campo: "Temporadas arquivadas",
      hoje: atual ? String(atual.arquivadas) : "?",
      novo: String(arquivo.arquivadas),
      perda: atual ? arquivo.arquivadas < atual.arquivadas : false,
    },
  ];

  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 3, background: "rgba(0,0,0,.24)" }}>
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${C.line}`,
          fontSize: 10,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: C.bronze,
        }}
      >
        O que vai entrar no lugar do que existe hoje
      </div>
      <div style={{ padding: "8px 12px 10px" }}>
        <ScrollX>
          <table style={{ borderCollapse: "collapse", minWidth: 380 }}>
            <thead>
              <tr>
                {["Campo", "Hoje (gravado)", "No arquivo"].map((coluna) => (
                  <th
                    key={coluna}
                    style={{
                      ...CELULA,
                      textAlign: "left",
                      fontSize: 10,
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      color: C.ink4,
                      fontWeight: 600,
                    }}
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.campo}>
                  <td style={{ ...CELULA, color: C.ink3 }}>{linha.campo}</td>
                  <td style={{ ...CELULA, color: C.ink2, ...tabular }}>{linha.hoje}</td>
                  <td
                    style={{
                      ...CELULA,
                      paddingRight: 0,
                      fontWeight: 600,
                      color: linha.perda ? C.dangerSoft : C.ink,
                      ...tabular,
                    }}
                  >
                    {linha.novo}
                    {linha.perda ? " ↓" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      </div>
    </div>
  );
}

function AvisoDeSubstituicao() {
  return (
    // #11 e #13: dizer o preço ANTES do botão — grava na hora e leva junto o rascunho aberto.
    <Banner
      tone="warn"
      title="Importar substitui o campeonato inteiro, na hora"
      actions={<BotaoExportarBackup small>Exportar backup antes</BotaoExportarBackup>}
    >
      Os dados gravados são trocados assim que a importação passa na validação — não vira
      rascunho e não dá para desfazer pelo painel. O rascunho aberto nas outras abas também é{" "}
      <strong>descartado</strong>.
    </Banner>
  );
}

// ---------------------------------------------------------------- painel

export function AdminBackupPanel({
  onImportText,
  onImportFile,
  importing,
}: AdminBackupPanelProps) {
  const ocupado = Boolean(importing);
  const { estado, recarregar } = useResumoAtual(ocupado);
  const atual = estado.situacao === "ok" ? estado.resumo : null;

  const inputArquivo = useRef<HTMLInputElement | null>(null);
  const [arquivoEscolhido, setArquivoEscolhido] = useState<File | null>(null);
  const [previaArquivo, setPreviaArquivo] = useState<ResumoDataset | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [confirmaArquivo, setConfirmaArquivo] = useState(false);

  const [texto, setTexto] = useState("");
  const [previaTexto, setPreviaTexto] = useState<ResumoDataset | null>(null);
  const [erroTexto, setErroTexto] = useState<string | null>(null);
  const [confirmaTexto, setConfirmaTexto] = useState(false);

  const escolherArquivo = async (evento: ChangeEvent<HTMLInputElement>) => {
    // #30: a referência do input tem de ser guardada ANTES de qualquer await — depois dele o
    // React já reciclou o evento e `currentTarget` é null, então a limpeza nunca acontecia e
    // escolher o MESMO arquivo de novo não disparava mais nada (falha silenciosa).
    const input = evento.currentTarget;
    const arquivo = evento.target.files?.[0] ?? null;
    input.value = "";

    setConfirmaArquivo(false);
    setPreviaArquivo(null);
    setErroArquivo(null);
    setArquivoEscolhido(arquivo);
    if (!arquivo) return;

    try {
      const conteudo = await arquivo.text();
      const lido = lerResumoJson(conteudo);
      if (!lido.ok) {
        setErroArquivo(lido.erro);
        return;
      }
      setPreviaArquivo(lido.resumo);
    } catch {
      setErroArquivo("Não consegui ler o arquivo escolhido.");
    }
  };

  const importarArquivo = async () => {
    if (!arquivoEscolhido) return;
    // A seleção NÃO é apagada depois de enviar: o pai trata o erro por conta própria, então
    // daqui não dá para saber se deu certo. Apagar às cegas faria o admin escolher o arquivo de
    // novo justamente quando a importação falhou.
    await onImportFile(arquivoEscolhido);
    setConfirmaArquivo(false);
  };

  const conferirTexto = () => {
    const lido = lerResumoJson(texto);
    if (!lido.ok) {
      setPreviaTexto(null);
      setErroTexto(lido.erro);
      return;
    }
    setErroTexto(null);
    setPreviaTexto(lido.resumo);
  };

  const importarTexto = async () => {
    // #30 (segunda metade): o texto colado era apagado mesmo quando a importação falhava, e o
    // JSON ia junto. Aqui ele fica — quem limpa é o botão "Limpar".
    await onImportText(texto);
    setConfirmaTexto(false);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <SectionHead
        eyebrow="Dados"
        title="Importar / Exportar"
        description="Exportar é seguro e pode ser feito a qualquer momento. Importar troca o campeonato inteiro — cada caminho abaixo mostra o que entra no lugar do que existe hoje."
        actions={
          <Button
            small
            onClick={recarregar}
            disabled={estado.situacao === "carregando"}
            title="Ler de novo os dados gravados no servidor"
          >
            {estado.situacao === "carregando" ? "Conferindo..." : "Reconferir o gravado"}
          </Button>
        }
      />

      {estado.situacao === "erro" ? (
        <Banner tone="danger" title="Não consegui ler os dados gravados">
          {estado.mensagem} A comparação abaixo fica sem o lado “hoje” — confira antes de
          substituir qualquer coisa.
        </Banner>
      ) : null}

      <ActionCard
        tone="gold"
        title="Exportar backup"
        badge={
          atual ? (
            <Chip tone="ok" title="Conteúdo atual do servidor">
              {atual.times} times · {atual.jogadores} jogadores · {atual.series} séries
            </Chip>
          ) : null
        }
        description="Baixa o JSON dos dados gravados no servidor (não do rascunho aberto). É o único jeito de voltar atrás depois de uma importação — exporte antes de qualquer troca."
      >
        <BotaoExportarBackup>Exportar backup agora</BotaoExportarBackup>
      </ActionCard>

      <div
        style={{
          display: "grid",
          gap: 16,
          alignItems: "start",
          gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
        }}
      >
        <ActionCard
          tone="danger"
          title="Importar de um arquivo"
          description="Escolha o .json do backup. Nada é enviado até você conferir a prévia e confirmar."
        >
          <AvisoDeSubstituicao />

          <input
            ref={inputArquivo}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(evento) => {
              void escolherArquivo(evento);
            }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => inputArquivo.current?.click()} disabled={ocupado}>
              {arquivoEscolhido ? "Trocar arquivo" : "Escolher arquivo"}
            </Button>
            {arquivoEscolhido ? (
              <Button
                onClick={() => {
                  setArquivoEscolhido(null);
                  setPreviaArquivo(null);
                  setErroArquivo(null);
                  setConfirmaArquivo(false);
                }}
                disabled={ocupado}
              >
                Descartar seleção
              </Button>
            ) : null}
          </div>

          {arquivoEscolhido ? (
            <p style={{ margin: 0, fontSize: 11.5, color: C.ink4, wordBreak: "break-all" }}>
              Selecionado: <span style={{ color: C.ink2 }}>{arquivoEscolhido.name}</span>{" "}
              <span style={tabular}>({Math.max(1, Math.round(arquivoEscolhido.size / 1024))} KB)</span>
            </p>
          ) : null}

          {erroArquivo ? (
            <Banner tone="danger" title="Este arquivo não serve">
              {erroArquivo}
            </Banner>
          ) : null}

          {previaArquivo ? (
            <>
              <Comparacao atual={atual} arquivo={previaArquivo} />
              <Check
                checked={confirmaArquivo}
                onChange={setConfirmaArquivo}
                tone="danger"
                disabled={ocupado}
              >
                Confirmo que quero substituir o campeonato gravado pelo conteúdo deste arquivo.
              </Check>
              <div>
                <Button
                  tone="danger"
                  onClick={() => {
                    void importarArquivo();
                  }}
                  disabled={ocupado || !confirmaArquivo}
                >
                  {ocupado ? "Importando..." : "Substituir pelo arquivo"}
                </Button>
              </div>
            </>
          ) : null}
        </ActionCard>

        <ActionCard
          tone="danger"
          title="Importar JSON colado"
          description="Para restaurar rápido sem arquivo local. Confira a prévia antes de substituir."
        >
          <AvisoDeSubstituicao />

          <Field label="JSON do campeonato">
            <Textarea
              value={texto}
              mono
              rows={10}
              disabled={ocupado}
              placeholder="Cole aqui um backup válido do campeonato em JSON..."
              onChange={(valor) => {
                setTexto(valor);
                // Mexeu no texto, a prévia conferida não vale mais.
                setPreviaTexto(null);
                setErroTexto(null);
                setConfirmaTexto(false);
              }}
            />
          </Field>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={conferirTexto} disabled={ocupado || !texto.trim()}>
              Conferir antes de importar
            </Button>
            <Button
              onClick={() => {
                setTexto("");
                setPreviaTexto(null);
                setErroTexto(null);
                setConfirmaTexto(false);
              }}
              disabled={ocupado || !texto}
            >
              Limpar
            </Button>
          </div>

          {erroTexto ? (
            <Banner tone="danger" title="Este JSON não serve">
              {erroTexto}
            </Banner>
          ) : null}

          {previaTexto ? (
            <>
              <Comparacao atual={atual} arquivo={previaTexto} />
              <Check
                checked={confirmaTexto}
                onChange={setConfirmaTexto}
                tone="danger"
                disabled={ocupado}
              >
                Confirmo que quero substituir o campeonato gravado por este JSON.
              </Check>
              <div>
                <Button
                  tone="danger"
                  onClick={() => {
                    void importarTexto();
                  }}
                  disabled={ocupado || !confirmaTexto}
                >
                  {ocupado ? "Importando..." : "Substituir pelo JSON colado"}
                </Button>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: C.ink4 }}>
                O texto continua aqui depois de importar — se der erro, nada se perde. Use
                “Limpar” quando terminar.
              </p>
            </>
          ) : null}
        </ActionCard>
      </div>
    </div>
  );
}
