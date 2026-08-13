"use client";

import { useMemo, useState } from "react";

import type { EdicaoConfig, PropsSecao } from "@/components/admin/e4/painel-edicao";
import {
  ActionCard,
  Banner,
  BlockTitle,
  Button,
  C,
  Card,
  Chip,
  Field,
  FieldGrid,
  Input,
  Metric,
  SectionHead,
  Toolbar,
  display,
  tabular,
} from "@/components/admin/ui";
import { distribuirTimes } from "@/lib/inscricoes/schema";

/**
 * Configuração da 4ª Edição: a chave das inscrições e os parâmetros que o formulário
 * público, a conferência e o draft leem.
 *
 * Duas decisões estruturais:
 *
 * 1. ABRIR/FECHAR INSCRIÇÕES NÃO ENTRA NO "SALVAR". É a única ação daqui com efeito
 *    imediato no site público, e ninguém deveria abrir o formulário para o mundo como
 *    efeito colateral de ter mexido no prazo de pagamento. Vai em ação própria, com
 *    confirmação em dois passos na abertura.
 *
 * 2. O RESTO É UM RASCUNHO ÚNICO, salvo de uma vez só com o diff contra `dados.config`.
 *    Mandar campo por campo geraria uma linha de auditoria por tecla e faria o servidor
 *    recalcular o panorama seis vezes seguidas.
 */

// ---------------------------------------------------------------- forma do rascunho

type ChaveData =
  | "abertura_inscricoes"
  | "fechamento_inscricoes"
  | "prazo_vinculo_riot"
  | "congelamento_elo"
  | "data_draft"
  | "inicio_campeonato";

type ChaveNumero =
  | "jogadores_por_time"
  | "orcamento_por_time"
  | "min_ranqueadas"
  | "dias_no_grupo"
  | "prazo_pagamento_dias"
  | "segundos_por_escolha";

type ChaveRascunho =
  | ChaveData
  | ChaveNumero
  | "pct_campeao"
  | "taxa_reais"
  | "chave_pix"
  | "responsavel_financeiro";

/** Tudo string: é o que os campos devolvem, e é o que permite "em branco" existir. */
type Rascunho = Readonly<Record<ChaveRascunho, string>>;

const DATAS = [
  {
    chave: "abertura_inscricoes",
    rotulo: "Abertura das inscrições",
    efeito: "Item (a): o tempo de grupo é contado até esta data.",
  },
  {
    chave: "fechamento_inscricoes",
    rotulo: "Fechamento das inscrições",
    efeito: "Só distingue os avisos: com ela no passado, o site diz encerrada em vez de ainda não abriu.",
  },
  {
    chave: "prazo_vinculo_riot",
    rotulo: "Prazo do vínculo Riot",
    efeito: "Item (b): até quando dá para vincular a conta Riot ao Discord e deixá-la visível.",
  },
  {
    chave: "congelamento_elo",
    rotulo: "Congelamento do elo",
    efeito: "A partir daqui o elo vira retrato e os pontos param de mudar.",
  },
  { chave: "data_draft", rotulo: "Draft ao vivo", efeito: "Dia em que os capitães escolhem." },
  {
    chave: "inicio_campeonato",
    rotulo: "Início do campeonato",
    efeito: "Item (e) olha os 30 dias anteriores a esta data. Sem ela, (e) não é avaliável.",
  },
] as const satisfies readonly { chave: ChaveData; rotulo: string; efeito: string }[];

const NUMEROS = [
  {
    chave: "jogadores_por_time",
    rotulo: "Jogadores por time",
    min: 1,
    max: 10,
    efeito: "Divide os aprovados: quantos times fecham sai daqui.",
  },
  {
    chave: "orcamento_por_time",
    rotulo: "Orçamento por time (pontos)",
    min: 1,
    max: 999,
    efeito: "Teto de pontos do elenco, com o capitão já contando dentro.",
  },
  {
    chave: "min_ranqueadas",
    rotulo: "Mínimo de ranqueadas",
    min: 0,
    max: 999,
    efeito: "Usado nos itens (d) e (e). Só solo/duo conta; flex e normal não.",
  },
  {
    chave: "dias_no_grupo",
    rotulo: "Dias no grupo",
    min: 0,
    max: 3650,
    efeito: "Item (a): tempo mínimo no grupo oficial antes da abertura.",
  },
  {
    chave: "prazo_pagamento_dias",
    rotulo: "Prazo de pagamento (dias)",
    min: 1,
    max: 365,
    efeito: "Contado da aprovação; é o que gera o vencimento de cada pagamento.",
  },
  {
    chave: "segundos_por_escolha",
    rotulo: "Segundos por escolha",
    min: 5,
    max: 600,
    efeito: "Relógio de cada pick no draft ao vivo.",
  },
] as const satisfies readonly {
  chave: ChaveNumero;
  rotulo: string;
  min: number;
  max: number;
  efeito: string;
}[];

const PCT_CAMPEAO = { min: 0, max: 100 } as const;

// ---------------------------------------------------------------- conversões

/**
 * ISO com offset -> valor de `<input type="datetime-local">`.
 *
 * O input só entende HORA DE PAREDE, sem fuso ("2026-11-01T20:00"); o servidor exige ISO
 * com offset ("2026-11-01T23:00:00.000Z"). A tradução mora aqui e em `paraISO`, e é aqui
 * que alguém erra depois: preencher o campo com `iso.slice(0, 16)` (ou com o resultado de
 * `toISOString()`) parece funcionar e mostra a hora em UTC — no nosso fuso a hora anda três
 * horas a cada ida e volta. Os getters abaixo são os LOCAIS de propósito.
 *
 * `new Date(iso)` recebe argumento: não lê o relógio. Mesmo assim toda chamada daqui
 * acontece dentro de useMemo ou de handler, nunca solta no corpo da render, porque a regra
 * react-hooks/purity já derrubou o lint por menos.
 */
function paraCampoLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Campo local -> ISO. `null` = data limpa (estado legítimo); `undefined` = ilegível, não mande. */
function paraISO(campo: string): string | null | undefined {
  const v = campo.trim();
  if (v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * "20,00" -> 2000 centavos.
 *
 * O banco guarda centavos inteiros e a tela edita reais, senão alguém digita "2000"
 * achando que são vinte reais. A vírgula é o separador decimal; o ponto só aparece como
 * milhar ("1.200,00"), então ele só é descartado quando existe vírgula — do contrário
 * "20.50" viraria R$ 2.050,00.
 *
 * O arredondamento não é enfeite: `19.99 * 100` dá 1998.9999999999998 em ponto flutuante,
 * e truncar cobraria um centavo a menos de cada inscrito.
 */
function paraCentavos(texto: string): number | null {
  let limpo = texto.trim().replace(/^R\$/i, "").replace(/\s/g, "");
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}

/** Centavos -> "R$ 1.234,56". */
function emReais(centavos: number): string {
  const [inteiro, decimal] = (centavos / 100).toFixed(2).split(".");
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}

/** Centavos -> "1234,56", sem prefixo: é o que vai dentro do campo editável. */
function emReaisCru(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

function duracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const resto = segundos % 60;
  if (min === 0) return `${resto}s`;
  return resto === 0 ? `${min} min` : `${min} min ${resto}s`;
}

/** Inteiro dentro da faixa, ou `null`. A faixa é a mesma do `configPatchSchema`. */
function inteiroNaFaixa(bruto: string, min: number, max: number): number | null {
  const t = bruto.trim();
  if (!/^\d+$/.test(t)) return null;
  const v = Number(t);
  return v >= min && v <= max ? v : null;
}

function semear(config: EdicaoConfig): Rascunho {
  return {
    abertura_inscricoes: paraCampoLocal(config.abertura_inscricoes),
    fechamento_inscricoes: paraCampoLocal(config.fechamento_inscricoes),
    prazo_vinculo_riot: paraCampoLocal(config.prazo_vinculo_riot),
    congelamento_elo: paraCampoLocal(config.congelamento_elo),
    data_draft: paraCampoLocal(config.data_draft),
    inicio_campeonato: paraCampoLocal(config.inicio_campeonato),
    jogadores_por_time: String(config.jogadores_por_time),
    orcamento_por_time: String(config.orcamento_por_time),
    min_ranqueadas: String(config.min_ranqueadas),
    dias_no_grupo: String(config.dias_no_grupo),
    prazo_pagamento_dias: String(config.prazo_pagamento_dias),
    segundos_por_escolha: String(config.segundos_por_escolha),
    pct_campeao: String(config.pct_campeao),
    taxa_reais: emReaisCru(config.taxa_centavos),
    chave_pix: config.chave_pix ?? "",
    responsavel_financeiro: config.responsavel_financeiro ?? "",
  };
}

const textoOuNulo = (v: string): string | null => (v.trim() === "" ? null : v.trim());

// ---------------------------------------------------------------- seção

export function SecaoConfiguracao({ dados, executar, ocupado, podeConfigurar }: PropsSecao) {
  const { config, panorama } = dados;
  const bloqueado = !podeConfigurar;
  const semEscopo = bloqueado ? "Alterar a configuração exige o escopo de master." : undefined;

  /**
   * A semente é derivada de `dados.config` e o rascunho é RESSINCRONIZADO quando ela muda.
   * Sem isso o formulário continuaria mostrando o valor antigo depois de salvar — o contêiner
   * recarrega tudo a cada ação, então `config` é objeto novo a cada salvamento.
   *
   * O ajuste é feito DURANTE A RENDER, comparando a semente com a que gerou o rascunho atual,
   * e não num useEffect: `react-hooks/set-state-in-effect` proíbe setState síncrono dentro de
   * efeito (renderiza duas vezes em cascata). Este é o padrão que a própria documentação do
   * React indica para "recomeçar o estado quando uma prop muda" — o React reexecuta o
   * componente na hora, sem pintar a tela intermediária.
   */
  const semente = useMemo(() => semear(config), [config]);
  const [semeadoDe, setSemeadoDe] = useState<Rascunho>(semente);
  const [rascunho, setRascunho] = useState<Rascunho>(semente);
  const [confirmandoAbertura, setConfirmandoAbertura] = useState(false);

  if (semeadoDe !== semente) {
    setSemeadoDe(semente);
    setRascunho(semente);
    // Semente nova = recarga do servidor. Uma confirmação de abertura armada antes disso já
    // não corresponde ao que está na tela; desarmar é mais seguro do que manter.
    setConfirmandoAbertura(false);
  }

  const editar = (chave: ChaveRascunho, valor: string) =>
    setRascunho((r) => ({ ...r, [chave]: valor }));

  /**
   * O diff. Só campo que realmente mudou entra no corpo — o servidor guarda auditoria do
   * que recebeu, e mandar os dezesseis campos a cada salvamento registraria mudanças que
   * não aconteceram.
   *
   * Datas são comparadas JÁ CONVERTIDAS para o campo local, nunca pelo ISO: o banco pode
   * ter segundos ("...T00:00:30Z") que o input, de resolução de minuto, não representa.
   * Comparar ISO com ISO acusaria diferença eterna numa data que ninguém tocou.
   */
  const { corpo, problemas } = useMemo(() => {
    const p: Record<string, unknown> = {};
    const erros: string[] = [];

    for (const d of DATAS) {
      const atual = rascunho[d.chave];
      if (atual === paraCampoLocal(config[d.chave])) continue;
      const iso = paraISO(atual);
      if (iso === undefined) {
        erros.push(`${d.rotulo}: data incompleta ou inválida.`);
        continue;
      }
      p[d.chave] = iso;
    }

    for (const n of NUMEROS) {
      const valor = inteiroNaFaixa(rascunho[n.chave], n.min, n.max);
      if (valor === null) {
        erros.push(`${n.rotulo}: use um número inteiro entre ${n.min} e ${n.max}.`);
        continue;
      }
      if (valor !== config[n.chave]) p[n.chave] = valor;
    }

    const pct = inteiroNaFaixa(rascunho.pct_campeao, PCT_CAMPEAO.min, PCT_CAMPEAO.max);
    if (pct === null) erros.push("Fatia do campeão: use um inteiro de 0 a 100.");
    else if (pct !== config.pct_campeao) p.pct_campeao = pct;

    const centavos = paraCentavos(rascunho.taxa_reais);
    if (centavos === null) erros.push("Taxa de inscrição: use um valor como 20,00.");
    else if (centavos !== config.taxa_centavos) p.taxa_centavos = centavos;

    const pix = textoOuNulo(rascunho.chave_pix);
    if (pix !== textoOuNulo(config.chave_pix ?? "")) p.chave_pix = pix;

    const responsavel = textoOuNulo(rascunho.responsavel_financeiro);
    if (responsavel !== textoOuNulo(config.responsavel_financeiro ?? "")) {
      p.responsavel_financeiro = responsavel;
    }

    return { corpo: p, problemas: erros };
  }, [rascunho, config]);

  const alterado = Object.keys(corpo).length > 0;
  const podeSalvar = alterado && problemas.length === 0 && !bloqueado && !ocupado;

  // Projeção feita com o valor QUE ESTÁ NO CAMPO, e não com o salvo: é assim que dá para
  // ver o efeito de mudar "jogadores por time" antes de confirmar.
  const projecao = useMemo(() => {
    const porTime = inteiroNaFaixa(rascunho.jogadores_por_time, 1, 10) ?? config.jogadores_por_time;
    const segundos =
      inteiroNaFaixa(rascunho.segundos_por_escolha, 5, 600) ?? config.segundos_por_escolha;
    const { times, sobra } = distribuirTimes(panorama.aprovados, porTime);
    // O capitão já está no time antes do draft, então cada time escolhe (jogadores - 1).
    const porCapitao = Math.max(0, porTime - 1);
    return {
      porTime,
      porCapitao,
      times,
      sobra,
      segundos,
      escolhas: porCapitao * times,
      tempo: porCapitao * times * segundos,
      escolhasMeta: porCapitao * 10,
      tempoMeta: porCapitao * 10 * segundos,
    };
  }, [rascunho.jogadores_por_time, rascunho.segundos_por_escolha, config, panorama.aprovados]);

  const premiacao = useMemo(() => {
    const arrecadado = panorama.caixa.arrecadado;
    const pct =
      inteiroNaFaixa(rascunho.pct_campeao, PCT_CAMPEAO.min, PCT_CAMPEAO.max) ?? config.pct_campeao;
    const campeao = Math.round((arrecadado * pct) / 100);
    // O vice fica com a DIFERENÇA, e não com um segundo arredondamento: o site declara que
    // 100% do arrecadado vira prêmio, então as duas fatias têm que somar o arrecadado exato.
    return { arrecadado, pct, campeao, vice: arrecadado - campeao };
  }, [panorama.caixa.arrecadado, rascunho.pct_campeao, config.pct_campeao]);

  const alternarInscricoes = async (abrir: boolean) => {
    await executar("config", { inscricoes_abertas: abrir });
    setConfirmandoAbertura(false);
  };

  const abertas = config.inscricoes_abertas;

  return (
    <div>
      <SectionHead
        eyebrow="4ª Edição"
        title="Configuração"
        description={`Os parâmetros de "${config.nome}". O que muda aqui muda o formulário público, o que a conferência consegue avaliar e o relógio do draft.`}
        actions={
          alterado ? (
            <Chip tone="warn" title="Existem campos editados que ainda não foram enviados.">
              alterações não salvas
            </Chip>
          ) : (
            <Chip tone="off">tudo salvo</Chip>
          )
        }
      />

      {bloqueado ? (
        <Banner tone="warn" title="Somente leitura">
          Você enxerga toda a configuração, mas alterá-la é escopo de master. Peça a quem tem o
          escopo — daqui os botões só devolveriam 403.
        </Banner>
      ) : null}

      {/* ------------------------------------------------ 1. a chave das inscrições */}

      <BlockTitle>Inscrições</BlockTitle>

      <ActionCard
        tone={abertas ? "gold" : "neutro"}
        title="Formulário público"
        badge={
          <span
            style={{
              fontFamily: display,
              fontSize: 22,
              letterSpacing: ".08em",
              color: abertas ? C.ok : C.ink3,
            }}
          >
            {abertas ? "ABERTAS" : "FECHADAS"}
          </span>
        }
        description={
          abertas
            ? "Qualquer pessoa com o link consegue se inscrever agora. Fechar é reversível e não apaga nada do que já entrou."
            : "Com as inscrições fechadas, /inscricao mostra a página de espera e o servidor recusa o envio. Ao abrir, o formulário fica público na hora."
        }
      >
        {abertas ? (
          <Toolbar>
            <Button
              onClick={() => void alternarInscricoes(false)}
              disabled={bloqueado || ocupado}
              title={semEscopo}
            >
              Fechar inscrições
            </Button>
          </Toolbar>
        ) : (
          <Toolbar>
            {confirmandoAbertura ? (
              <>
                <Button
                  tone="gold"
                  onClick={() => void alternarInscricoes(true)}
                  disabled={bloqueado || ocupado}
                  title={semEscopo}
                >
                  Confirmar abertura?
                </Button>
                <Button onClick={() => setConfirmandoAbertura(false)} disabled={ocupado}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                tone="gold"
                onClick={() => setConfirmandoAbertura(true)}
                disabled={bloqueado || ocupado}
                title={semEscopo}
              >
                Abrir inscrições
              </Button>
            )}
          </Toolbar>
        )}

        {/* Dois passos só para ABRIR: a partir do clique o formulário é público, e fechar
            depois não desfaz quem já enviou. Fechar, esse sim, é reversível de graça. */}
        {confirmandoAbertura ? (
          <p style={{ margin: 0, fontSize: 12, color: C.warnSoft, lineHeight: 1.6 }}>
            Confirme e o formulário fica no ar para quem tiver o link. Fechar depois não desfaz as
            inscrições que já tiverem entrado.
          </p>
        ) : null}

        {alterado ? (
          <p style={{ margin: 0, fontSize: 12, color: C.warnSoft, lineHeight: 1.6 }}>
            Há alterações não salvas nos blocos abaixo. Abrir ou fechar recarrega os dados da
            edição e descarta esse rascunho — salve antes.
          </p>
        ) : null}
      </ActionCard>

      <FieldGrid min={150} style={{ marginTop: 12 }}>
        <Metric
          label="Inscrições recebidas"
          value={panorama.inscritos}
          detail="Sem teto nesta edição"
          small
        />
        <Metric
          label="Aprovados"
          value={panorama.aprovados}
          detail={`${panorama.pendentes} pendentes`}
          small
        />
        <Metric
          label="Times que fecham"
          value={projecao.times}
          detail={`${projecao.sobra} de sobra`}
          small
        />
      </FieldGrid>

      {/* ------------------------------------------------ 2. datas-âncora */}

      <BlockTitle>Datas-âncora</BlockTitle>

      <p
        style={{
          margin: "0 0 14px",
          fontSize: 12.5,
          color: C.ink3,
          lineHeight: 1.65,
          maxWidth: "72ch",
        }}
      >
        Data em branco é resposta, não pendência: hoje só se sabe que a edição acontece em{" "}
        <strong style={{ color: C.ink2 }}>novembro de 2026</strong>. O site mostra “a definir”, e o
        item de conferência que depende de uma data ausente fica “não avaliável” — marcar aprovado
        sem base é pior do que não marcar. Os horários são os do seu computador.
      </p>

      <FieldGrid min={240}>
        {DATAS.map((d) => {
          const valor = rascunho[d.chave];
          return (
            <div key={d.chave}>
              <Field label={d.rotulo} hint={d.efeito}>
                <Input
                  type="datetime-local"
                  value={valor}
                  onChange={(v) => editar(d.chave, v)}
                  disabled={bloqueado || ocupado}
                  ariaLabel={d.rotulo}
                  // Sem colorScheme escuro o navegador desenha o seletor nativo (e o ícone do
                  // calendário) em preto sobre preto.
                  style={{ colorScheme: "dark" }}
                />
              </Field>
              <Toolbar style={{ marginTop: 7 }}>
                {valor === "" ? <Chip tone="off">a definir</Chip> : <Chip tone="ok">definida</Chip>}
                <Button
                  small
                  onClick={() => editar(d.chave, "")}
                  disabled={valor === "" || bloqueado || ocupado}
                  title={semEscopo ?? "Deixa a data em branco: o site passa a mostrar a definir."}
                >
                  limpar
                </Button>
              </Toolbar>
            </div>
          );
        })}
      </FieldGrid>

      {/* ------------------------------------------------ 3. regulamento */}

      <BlockTitle>Parâmetros do regulamento</BlockTitle>

      <FieldGrid min={215}>
        {NUMEROS.map((n) => (
          <Field key={n.chave} label={n.rotulo} hint={n.efeito}>
            <Input
              numeric
              value={rascunho[n.chave]}
              onChange={(v) => editar(n.chave, v)}
              disabled={bloqueado || ocupado}
              ariaLabel={n.rotulo}
            />
          </Field>
        ))}
      </FieldGrid>

      <Card padding="14px 16px" style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: C.bronze,
          }}
        >
          Duração estimada do draft
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: C.ink2, lineHeight: 1.7, ...tabular }}>
          Cada time escolhe {projecao.porCapitao} jogadores (o capitão já está nele). Com os{" "}
          {panorama.aprovados} aprovados de hoje são{" "}
          <strong style={{ color: C.ink }}>{projecao.times} times</strong>, {projecao.escolhas}{" "}
          escolhas e <strong style={{ color: C.bronzeLit }}>{duracao(projecao.tempo)}</strong> só de
          relógio de pick.
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: C.ink3, lineHeight: 1.7, ...tabular }}>
          Na meta de ~50 pessoas (10 times) seriam {projecao.escolhasMeta} escolhas e{" "}
          <strong style={{ color: C.warnSoft }}>{duracao(projecao.tempoMeta)}</strong> a{" "}
          {projecao.segundos}s cada — isso sem contar conversa, atraso e quem não aparece.
        </p>
      </Card>

      {/* ------------------------------------------------ 4. dinheiro */}

      <BlockTitle>Dinheiro</BlockTitle>

      <FieldGrid min={215}>
        <Field
          label="Taxa de inscrição (R$)"
          hint="Editada em reais; o banco guarda centavos. Use vírgula: 20,00."
        >
          <Input
            value={rascunho.taxa_reais}
            onChange={(v) => editar("taxa_reais", v)}
            placeholder="20,00"
            disabled={bloqueado || ocupado}
            ariaLabel="Taxa de inscrição em reais"
            style={{ ...tabular, textAlign: "center" }}
          />
        </Field>

        <Field
          label="Fatia do campeão (%)"
          hint={`O vice fica com os outros ${100 - premiacao.pct}%.`}
        >
          <Input
            numeric
            value={rascunho.pct_campeao}
            onChange={(v) => editar("pct_campeao", v)}
            disabled={bloqueado || ocupado}
            ariaLabel="Percentual do campeão"
          />
        </Field>

        <Field label="Chave Pix" hint="É o que o jogador vê na hora de pagar.">
          <Input
            value={rascunho.chave_pix}
            onChange={(v) => editar("chave_pix", v)}
            placeholder="a definir"
            disabled={bloqueado || ocupado}
            ariaLabel="Chave Pix"
          />
        </Field>

        <Field label="Responsável financeiro" hint="Quem abre o extrato e responde pelo caixa.">
          <Input
            value={rascunho.responsavel_financeiro}
            onChange={(v) => editar("responsavel_financeiro", v)}
            placeholder="a definir"
            disabled={bloqueado || ocupado}
            ariaLabel="Responsável financeiro"
          />
        </Field>
      </FieldGrid>

      <FieldGrid min={165} style={{ marginTop: 14 }}>
        <Metric
          label="Arrecadado"
          value={emReais(premiacao.arrecadado)}
          detail="Só pagamento conferido"
          small
        />
        <Metric
          label="Ainda a receber"
          value={emReais(panorama.caixa.aReceber)}
          detail="Aguardando + declarado"
          small
        />
        <Metric label={`Campeão (${premiacao.pct}%)`} value={emReais(premiacao.campeao)} small />
        <Metric label={`Vice (${100 - premiacao.pct}%)`} value={emReais(premiacao.vice)} small />
      </FieldGrid>

      <p
        style={{ margin: "10px 0 0", fontSize: 12, color: C.ink3, lineHeight: 1.7, maxWidth: "72ch" }}
      >
        O site declara publicamente que{" "}
        <strong style={{ color: C.ink2 }}>100% do arrecadado vira prêmio</strong>: campeão e vice
        acima precisam somar exatamente o arrecadado — e somam, porque o vice recebe a diferença em
        vez de um arredondamento próprio. As taxas isentas dos cinco organizadores (
        {emReais(panorama.caixa.isento)}) nunca entram nessa conta, e o que estiver marcado como
        estorno devido ainda vai sair do caixa.
      </p>

      {/* ------------------------------------------------ 5. salvar */}

      <BlockTitle right={alterado ? <Chip tone="warn">alterações não salvas</Chip> : undefined}>
        Salvar
      </BlockTitle>

      {problemas.length > 0 ? (
        <Banner tone="warn" title="Corrija antes de salvar">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {problemas.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </Banner>
      ) : null}

      <Toolbar>
        <Button
          tone="gold"
          onClick={() => void executar("config", corpo)}
          disabled={!podeSalvar}
          title={
            semEscopo ??
            (problemas.length > 0
              ? "Há campo fora da faixa aceita."
              : alterado
                ? `Envia ${Object.keys(corpo).length} campo(s) alterado(s).`
                : "Nada mudou desde o último salvamento.")
          }
        >
          {ocupado ? "Salvando..." : "Salvar alterações"}
        </Button>
        <Button onClick={() => setRascunho(semente)} disabled={!alterado || ocupado}>
          Descartar
        </Button>
        <span style={{ fontSize: 11.5, color: C.ink4 }}>
          {alterado
            ? `${Object.keys(corpo).length} campo(s) para enviar. Abrir e fechar inscrições é ação à parte, lá em cima.`
            : "Nada para enviar."}
        </span>
      </Toolbar>
    </div>
  );
}
