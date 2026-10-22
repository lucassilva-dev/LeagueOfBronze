/**
 * Navegação de página INTEIRA (não a do next/link): depois de entrar, sair ou trocar a
 * senha, o cabeçalho e as telas com sessão precisam ser remontados com o cookie novo.
 *
 * Mora num módulo à parte só para os testes poderem trocá-la: o jsdom não navega, e
 * `window.location.assign` não aceita espião (a propriedade não é configurável).
 */
export function navegarPara(destino: string): void {
  window.location.assign(destino);
}

/** A tela onde o jogador troca a própria senha (app/conta/senha). */
export const CAMINHO_TROCA_DE_SENHA = "/conta/senha";

/**
 * A troca de senha levando junto para onde a pessoa ia — um destino já conferido pela
 * lista fechada de lib/destino-de-volta.ts, nunca o que veio cru na URL.
 */
export function caminhoDaTrocaDeSenha(volta: string | null): string {
  return volta ? `${CAMINHO_TROCA_DE_SENHA}?volta=${volta}` : CAMINHO_TROCA_DE_SENHA;
}
