/**
 * Quando uma inscrição espera o pagamento do jogador — a regra que decide se a tela mostra
 * o Pix e o botão "JÁ PAGUEI".
 *
 * Sem dependências: a rota (servidor) e a "Minha inscrição" (navegador) usam a mesma.
 */
export function inscricaoEsperaPagamento(
  inscricao: Readonly<{
    situacao: string;
    pagamento: { estado: string } | null;
    /**
     * O lugar na fila (D1). Ausente = tela ou resposta de antes da fila: vale como titular.
     * `indefinido` = a leitura da fila falhou: não cobra.
     */
    fila?: { tipo: string } | null;
  }>,
): boolean {
  // Recusar ou registrar desistência mexe só na ficha — o pagamento continua "aguardando"
  // até alguém cancelar à mão. Para quem está fora, a cobrança não vale mais.
  if (estaFora(inscricao.situacao)) return false;
  // Reserva só paga se for chamado (D2): nem Pix, nem «JÁ PAGUEI», nem prazo na tela. E na
  // dúvida (o lugar na fila não pôde ser lido), também não: quem cobra é quem sabe que é titular.
  if (inscricao.fila?.tipo === "reserva" || inscricao.fila?.tipo === "indefinido") return false;
  return inscricao.pagamento?.estado === "aguardando";
}

/** O fuso do campeonato: todo prazo é lido no horário de Brasília. */
const FUSO_DO_PRAZO = "America/Sao_Paulo";

/** Hora e minuto de um instante no horário de Brasília (24 h). */
function horaEMinutoEmBrasilia(data: Date): { hora: number; minuto: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_DO_PRAZO,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? NaN);
  return { hora: valor("hour"), minuto: valor("minute") };
}

/**
 * O prazo vence no FIM de um dia em Brasília (23:59)? É o caso do prazo único dos titulares
 * (D3: 31/10 às 23:59:59): ler «até 31/10» é ler certo. Qualquer outro instante — o «agora +
 * 48 h» do reserva chamado depois dele (D4), ou os dias contados do envio — vence no meio do
 * dia, e só a data faria o jogador pagar às 20 h de um prazo que acabou às 15:37.
 */
export function prazoNoFimDoDia(iso: string): boolean {
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return false;
  const { hora, minuto } = horaEMinutoEmBrasilia(data);
  return hora === 23 && minuto === 59;
}

/**
 * Um prazo de pagamento escrito, no fuso de Brasília e no idioma da tela.
 *
 * Sem o fuso, o fim de 31/10 em Brasília (02:59 de 01/11 em UTC) aparecia como 01/11 para
 * quem lê de fora do Brasil, ou num servidor em UTC — o prazo é o do campeonato.
 *
 * Prazo no fim do dia (o de 31/10): só a data, «31/10/2026». Qualquer outro leva a hora,
 * «02/11/2026 às 20:00 (horário de Brasília)» — o reserva chamado tem 48 h contadas do
 * chamado, e às 20 h do último dia o painel já oferece passar a vaga dele (D5).
 *
 * `ano: false` tira o ano («02/11»); `fuso: false` tira o «horário de Brasília», para quem
 * já está no painel da organização, onde toda data é de Brasília.
 */
export function dataDoPrazo(
  iso: string,
  localeTag: string,
  opcoes: Readonly<{ ano?: boolean; fuso?: boolean }> = {},
): string {
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return iso;
  const dia = data.toLocaleDateString(localeTag, {
    timeZone: FUSO_DO_PRAZO,
    day: "2-digit",
    month: "2-digit",
    ...(opcoes.ano !== false && { year: "numeric" }),
  });
  if (prazoNoFimDoDia(iso)) return dia;
  const { hora, minuto } = horaEMinutoEmBrasilia(data);
  const hhmm = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
  const portugues = localeTag.toLowerCase().startsWith("pt");
  const comHora = `${dia} ${portugues ? "às" : "at"} ${hhmm}`;
  if (opcoes.fuso === false) return comHora;
  return `${comHora} (${portugues ? "horário de Brasília" : "Brasília time"})`;
}

/**
 * Cobrança que não vale mais: a pessoa foi recusada ou desistiu e ainda não pagou.
 *
 * Derivado na LEITURA, de propósito — nada é gravado. O pagamento continua "aguardando"
 * no banco até alguém cancelar à mão; o painel só deixa de contar esse valor como "a
 * receber" e de listar a pessoa entre os vencidos. Gravar sozinho exigiria desfazer
 * sozinho quando a organização voltasse atrás, e mexer no caixa sem ninguém do
 * financeiro ter clicado.
 */
export function foraDaCobranca(situacao: string, estadoDoPagamento: string | null | undefined): boolean {
  return estaFora(situacao) && estadoDoPagamento === "aguardando";
}

/**
 * Recusado, desistente ou excluído pela organização: não joga mais esta edição.
 *
 * A regra ÚNICA de "fora": a conta de times (`contaParaTimes`), a fila de reserva
 * (`montarFila`), a cobrança e o caixa usam esta. Sem dependências, para valer igual no
 * servidor e no navegador.
 */
export function estaFora(situacao: string): boolean {
  return situacao === "recusado" || situacao === "desistiu" || situacao === "excluido";
}
