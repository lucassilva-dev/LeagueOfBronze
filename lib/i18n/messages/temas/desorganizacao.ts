import { definir } from "@/lib/i18n/definir";

/**
 * Os textos do tema Desorganização (lib/temas/desorganizacao.ts), somados ao bloco paginasHome
 * (lib/i18n/messages/paginas-home.ts): `tema.textos` aponta para estas chaves. Um arquivo por
 * time para cada tema mudar só o seu. Chaves com o prefixo do time, para nunca colidirem.
 *
 * O circo da organização do campeonato: o espetáculo que começa atrasado, as atrações, o mestre
 * de picadeiro (o capitão), a tarja «SUJEITO A ATRASO» e as reclamações que caem em nós mesmos.
 */
export const textosDesorganizacao = definir({
  pt: {
    temaDesorgLema: "Respeitável público: o espetáculo vai começar (com 40 minutos de atraso).",
    temaDesorgAtracoes: "AS ATRAÇÕES",
    temaDesorgAviso: "Não tentem isso em casa (nem no banheiro).",
    temaDesorgCapitao: "MESTRE DE PICADEIRO",
    temaDesorgSobALona: "SOB A LONA {periodo}",
    // Espaço fixo antes do «·»: quebrando em duas linhas, o ponto fica no fim da primeira.
    temaDesorgIngresso: "Meia-entrada para Bronze · proibido alimentar o leão",
    temaDesorgTarja: "SUJEITO A ATRASO",
    temaDesorgFecho: "Reclamações: falar com a organização. (Somos nós.)",
    temaDesorgTrupe: "O RESTO DA TRUPE",
  },
  en: {
    temaDesorgLema: "Ladies and gentlemen: the show is about to begin (40 minutes late).",
    temaDesorgAtracoes: "TONIGHT'S ACTS",
    temaDesorgAviso: "Don't try this at home (or in the bathroom).",
    temaDesorgCapitao: "RINGMASTER",
    temaDesorgSobALona: "UNDER THE BIG TOP {periodo}",
    temaDesorgIngresso: "Half price for Bronze · do not feed the lion",
    // A tarja fica em pt nos dois idiomas (a página marca lang="pt-BR"), como o FIADO SÓ AMANHÃ.
    temaDesorgTarja: "SUJEITO A ATRASO",
    temaDesorgFecho: "Complaints? Talk to the organizers. (That's us.)",
    temaDesorgTrupe: "THE REST OF THE TROUPE",
  },
});
