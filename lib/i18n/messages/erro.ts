import { definir } from "@/lib/i18n/definir";

/**
 * Tela de falha (app/error.tsx e app/global-error.tsx).
 *
 * Arquivo à parte, e pequeno, de propósito: as duas telas são componentes de CLIENTE e
 * importam este bloco direto — puxar o dicionário inteiro (MESSAGES) para o navegador só
 * para mostrar meia dúzia de frases pesaria em toda página.
 *
 * O texto não promete nada que a página não sabe: a causa mais comum é o banco oscilar
 * (Supabase pausado ou lento), e isso costuma passar sozinho — daí o "tentar de novo".
 */
export const erro = definir({
  pt: {
    sobretitulo: "Falha ao carregar",
    titulo: "ALGO SAIU DO LUGAR",
    texto:
      "Não conseguimos carregar esta página agora. Costuma ser passageiro: tente de novo em alguns segundos.",
    tentarDeNovo: "TENTAR DE NOVO",
    voltarAoInicio: "VOLTAR AO INÍCIO",
    codigo: "Código do erro",
    tituloDaAba: "Erro · League of Bronze",
  },
  en: {
    sobretitulo: "Failed to load",
    titulo: "SOMETHING WENT WRONG",
    texto: "We couldn't load this page right now. It's usually temporary — try again in a few seconds.",
    tentarDeNovo: "TRY AGAIN",
    voltarAoInicio: "BACK TO HOME",
    codigo: "Error code",
    tituloDaAba: "Error · League of Bronze",
  },
});
