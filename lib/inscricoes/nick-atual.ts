/**
 * O nome que a organização e o site mostram de um inscrito: o Riot ID que a conta tem HOJE.
 *
 * O robô da Riot grava `riot_id_atual` a cada consulta (lib/riot/decidir.ts). O `riot_id`
 * declarado na inscrição NÃO muda — é a prova da regra 12 (o alerta «Trocou de Riot ID»
 * compara os dois) e a chave que o draft gravou. Por isso este nome é só para MOSTRAR: quem
 * casa inscrição com draft ou com o site aceita os dois (`nomesDaInscricao`,
 * `regraDoSubstitutoPelosPrecos`).
 */
export function riotIdAtualDaInscricao(i: Readonly<{ riot_id: string; riot_id_atual?: string | null }>): string {
  const atual = i.riot_id_atual?.trim() ?? "";
  const corte = atual.indexOf("#");
  return corte > 0 && corte < atual.length - 1 ? atual : i.riot_id;
}

/**
 * As mesmas regras pelas peças que o painel tem à mão (`nick` e `tag` declarados): o Riot ID
 * para MOSTRAR — o de hoje, se a conta trocou; senão o declarado.
 */
export function riotIdParaMostrar(i: Readonly<{ nick: string; tag: string; riot_id_atual?: string | null }>): string {
  return riotIdAtualDaInscricao({ riot_id: `${i.nick}#${i.tag}`, riot_id_atual: i.riot_id_atual });
}

/** Só o nome de jogo (sem a #TAG) para mostrar: o de hoje, se a conta trocou de nick. */
export function nickParaMostrar(i: Readonly<{ nick: string; tag: string; riot_id_atual?: string | null }>): string {
  const riotId = riotIdParaMostrar(i);
  return riotId.slice(0, riotId.indexOf("#"));
}

/** Só a tag (sem o «#») para mostrar — a de hoje, que acompanha o nome de `nickParaMostrar`. */
export function tagParaMostrar(i: Readonly<{ nick: string; tag: string; riot_id_atual?: string | null }>): string {
  const riotId = riotIdParaMostrar(i);
  return riotId.slice(riotId.indexOf("#") + 1);
}
