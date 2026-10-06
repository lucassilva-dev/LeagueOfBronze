import { pixDaInscricao } from "@/lib/pix";

/**
 * Cobrança sem provedor de pagamento: o painel monta a mensagem, a organização envia.
 *
 * Nada aqui manda mensagem sozinho. O link `wa.me` abre o WhatsApp de quem clicou com o
 * texto pronto, e é a pessoa que aperta enviar — o site não fala com o WhatsApp e não
 * guarda nada do que for enviado.
 *
 * Sem dependência de servidor: roda no painel, no navegador.
 */

/**
 * O número no formato que o `wa.me` aceita: só dígitos, com o 55 do Brasil.
 *
 * O campo do formulário é texto livre e opcional, então chega de tudo: "(11) 98765-4321",
 * "+55 11 98765-4321", "11987654321". Aceita DDD + número (10 ou 11 dígitos) ou o mesmo
 * com o 55 na frente; qualquer outra coisa devolve `null` e o botão não aparece — melhor
 * do que abrir conversa com um número errado.
 */
export function numeroParaWhatsApp(whatsapp: string | null | undefined): string | null {
  if (!whatsapp) return null;
  const digitos = whatsapp.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return null;
}

function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diaMes(iso: string | null): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

/** O texto da cobrança. Leva o Pix pronto quando a chave está configurada. */
export function mensagemDeCobranca(args: {
  riotId: string;
  valorCentavos: number;
  chavePix: string | null;
  venceEm: string | null;
  /** A origem do site em que o painel está aberto — o de teste não pode mandar para produção. */
  origem: string;
}): string {
  const nick = args.riotId.split("#")[0] || args.riotId;
  const prazo = diaMes(args.venceEm);
  const linhas = [
    `Oi, ${nick}! Aqui é da organização do League of Bronze.`,
    `Sua inscrição na 4ª Edição está aguardando o pagamento de ${reais(args.valorCentavos)}${prazo ? `, com prazo até ${prazo}` : ""}.`,
  ];

  let pix: string | null = null;
  if (args.chavePix) {
    try {
      pix = pixDaInscricao(args.chavePix, args.valorCentavos);
    } catch {
      pix = null;
    }
  }
  if (pix) linhas.push("", "Pix copia e cola:", pix);

  linhas.push("", `Depois de pagar, clique em «Já paguei» em ${args.origem}/minha-inscricao`);
  return linhas.join("\n");
}

/** Link `wa.me` com a mensagem pronta, ou `null` se o número não serve. */
export function linkDeCobranca(args: Parameters<typeof mensagemDeCobranca>[0] & { whatsapp: string | null }): string | null {
  const numero = numeroParaWhatsApp(args.whatsapp);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagemDeCobranca(args))}`;
}

/**
 * A lista para colar no grupo: só o Riot ID de quem falta pagar.
 *
 * Nada de e-mail, WhatsApp ou Discord — o grupo é grande e quem está nele não precisa do
 * contato de ninguém para saber quem falta.
 */
export function listaDeQuemFaltaPagar(
  linhas: readonly { riotId: string; venceEm: string | null }[],
  valorCentavos: number,
): string {
  if (linhas.length === 0) return "Ninguém com pagamento pendente.";
  const itens = [...linhas]
    .sort((a, b) => (a.venceEm ?? "9999").localeCompare(b.venceEm ?? "9999") || a.riotId.localeCompare(b.riotId))
    .map((l) => {
      const prazo = diaMes(l.venceEm);
      return `• ${l.riotId}${prazo ? ` — até ${prazo}` : ""}`;
    });
  return [
    `Inscrição da 4ª Edição — falta o pagamento (${reais(valorCentavos)}):`,
    ...itens,
    "",
    "Já pagou? Clique em «Já paguei» em Minha inscrição para a organização conferir.",
  ].join("\n");
}
