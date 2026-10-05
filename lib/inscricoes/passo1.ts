/**
 * Conferência do passo 1 do formulário de inscrição, no navegador.
 *
 * Por que existe: nick, tag, nome e Discord moram no passo 1, mas o servidor só os vê no
 * envio final, no passo 3. Se o servidor recusar um deles lá, o erro aponta para um campo
 * que já não está na tela — a pessoa lê "Confira os campos destacados" sem nada
 * destacado. Conferir aqui, antes de sair do passo, é o que evita isso.
 *
 * Sem zod de propósito (o mesmo motivo de `turnos.ts`): este arquivo vai para o bundle
 * do cliente. As regras são uma CÓPIA das de `schema.ts`, e quem garante que a cópia não
 * se desgarra é `tests/inscricoes/passo1.test.ts`, que roda os mesmos exemplos nos dois
 * lados. A validação que vale continua sendo a do servidor.
 */

export const LIMITES_INSCRICAO = {
  nick: 32,
  tag: 8,
  nome: 120,
  email: 254,
  discord: 64,
  whatsapp: 24,
  texto: 500,
} as const;

export type CamposPasso1 = Readonly<{
  nick: string;
  tag: string;
  nome: string;
  discord: string;
  whatsapp: string;
}>;

export type MensagensPasso1 = Readonly<{
  campoObrigatorio: string;
  nomeIncompleto: string;
  nickCurto: string;
  nickComHash: string;
  tagInvalida: string;
  textoLongo: string;
}>;

/** Os nomes de campo são os do corpo da inscrição — os mesmos que o servidor devolve. */
export type CampoPasso1 = "nick" | "tag" | "nomeReal" | "discord" | "whatsapp";

export type ProblemaPasso1 = { campo: CampoPasso1; mensagem: string };

export function problemasDoPasso1(c: CamposPasso1, m: MensagensPasso1): ProblemaPasso1[] {
  const problemas: ProblemaPasso1[] = [];
  const falha = (campo: CampoPasso1, mensagem: string) => problemas.push({ campo, mensagem });

  const nick = c.nick.trim();
  if (!nick) falha("nick", m.campoObrigatorio);
  else if (nick.includes("#")) falha("nick", m.nickComHash);
  else if (nick.length < 3) falha("nick", m.nickCurto);
  else if (nick.length > LIMITES_INSCRICAO.nick) falha("nick", m.textoLongo);

  // Um `#` no começo é tolerado (o servidor o tira), como quem copia "#BR1" do cliente.
  const tag = c.tag.trim().replace(/^#/, "");
  if (!tag) falha("tag", m.campoObrigatorio);
  else if (tag.length < 2 || tag.length > LIMITES_INSCRICAO.tag || !/^[A-Za-z0-9]+$/.test(tag)) {
    falha("tag", m.tagInvalida);
  }

  const nome = c.nome.trim();
  if (nome.length < 3 || nome.split(/\s+/).filter(Boolean).length < 2) falha("nomeReal", m.nomeIncompleto);
  else if (nome.length > LIMITES_INSCRICAO.nome) falha("nomeReal", m.textoLongo);

  // A ordem importa: tira os espaços, DEPOIS o @, depois os espaços de novo — " @" é vazio.
  const discord = c.discord.trim().replace(/^@+/, "").trim();
  if (!discord) falha("discord", m.campoObrigatorio);
  else if (discord.length > LIMITES_INSCRICAO.discord) falha("discord", m.textoLongo);

  if (c.whatsapp.trim().length > LIMITES_INSCRICAO.whatsapp) falha("whatsapp", m.textoLongo);

  return problemas;
}
