/**
 * Aviso de que a sessão mudou.
 *
 * O cabeçalho descobre quem está logado buscando `/api/sessao` quando a rota muda.
 * Isso cobre navegar, mas NÃO cobre o caso mais comum: o login do painel acontece
 * dentro da própria página, sem trocar de rota nenhuma. O resultado era o cabeçalho
 * continuar dizendo "ENTRAR" depois de a pessoa entrar, e só se corrigir no F5.
 *
 * Um evento no `window` resolve sem acoplar as telas ao cabeçalho: quem entra ou sai
 * avisa, e quem se importa escuta. Nenhum dos dois lados precisa conhecer o outro.
 */
export const EVENTO_SESSAO = "lob:sessao-mudou";

/** Chame depois de entrar ou sair, em qualquer tela. */
export function avisarSessaoMudou() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_SESSAO));
}
