import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { LOCALE_COOKIE, resolveLocale, type Locale } from "@/lib/i18n/config";
import {
  atributosDoCookie,
  contaDeJogadorDisponivel,
  emitirCookieDeJogador,
  pepperDeSenhaJogador,
} from "@/lib/jogadores/auth";
import { cadastroJogadorSchema, traduzirMensagemDaConta } from "@/lib/jogadores/schema";
import {
  concluirTentativaJogador,
  contarTentativasJogador,
  criarJogador,
  reservarTentativaJogador,
  TENTATIVA_CADASTRO,
  type ReservaDeTentativa,
} from "@/lib/jogadores/store";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { hashPassword, MENSAGENS_DE_SENHA_FRACA, motivoDeSenhaFraca } from "@/lib/security/password";
import {
  descontarPropriaReserva,
  evaluateLoginRateLimit,
  reservasDoIpContamNoTeto,
  TENTATIVA_ERRO_INTERNO,
} from "@/lib/security/rate-limit";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { comPisoDeTempo, lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Textos das respostas, nos dois idiomas.
 *
 * O formulário mostra o `error` da resposta tal como vem. No site em inglês, o jogador
 * lia "Já existe uma conta com esse e-mail…" e "A senha precisa ter pelo menos 5
 * caracteres." em português. O idioma é o mesmo que o site usa (cookie `lob_locale` >
 * Accept-Language > pt) — resolvido aqui porque o proxy não roda nas rotas de API.
 *
 * Cada recusa também leva um `codigo` estável, para a tela poder traduzir por conta própria.
 */
const TEXTOS = {
  pt: {
    indisponivel: "Contas ainda não estão disponíveis.",
    camposInvalidos: "Confira os campos destacados.",
    muitasTentativas: "Muitas tentativas. Tente novamente mais tarde.",
    emailExiste: "Já existe uma conta com esse e-mail. Entre com ela ou fale com a organização.",
    falhaAgora: "Não foi possível criar a conta agora.",
    falha: "Não foi possível criar a conta.",
  },
  en: {
    indisponivel: "Accounts are not available yet.",
    camposInvalidos: "Check the highlighted fields.",
    muitasTentativas: "Too many attempts. Please try again later.",
    emailExiste: "An account with this e-mail already exists. Sign in with it or talk to the organisers.",
    falhaAgora: "We couldn't create the account right now.",
    falha: "We couldn't create the account.",
  },
} as const satisfies Record<Locale, Record<string, string>>;

/**
 * Criação de conta de jogador.
 *
 * Sem confirmação por e-mail, de propósito: a verificação de verdade é a organização
 * conferir a pessoa à mão, item por item do regulamento. Confirmar e-mail não
 * acrescentaria nada e exigiria infraestrutura de envio que o projeto não tem.
 *
 * A conta sozinha não dá NADA — nem vaga, nem capitania. É só o cadeado que garante
 * que a escolha do draft sai de quem tem a sessão, e não de quem soube o nome de
 * alguém.
 */
export async function POST(request: NextRequest) {
  const inicio = Date.now();
  const locale = resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
  const t = TEXTOS[locale];

  if (!contaDeJogadorDisponivel()) {
    return NextResponse.json({ error: t.indisponivel, codigo: "indisponivel" }, { status: 503 });
  }

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = cadastroJogadorSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    const problemas = parsed.error.issues.slice(0, 6).map((i) => ({
      campo: i.path.join(".") || "formulario",
      mensagem: traduzirMensagemDaConta(i.message, locale) ?? i.message,
    }));
    return NextResponse.json(
      { error: t.camposInvalidos, codigo: "campos_invalidos", problemas },
      { status: 400 },
    );
  }

  const { email, nome, senha } = parsed.data;

  const motivo = motivoDeSenhaFraca(senha);
  if (motivo) {
    const fraca = MENSAGENS_DE_SENHA_FRACA[locale][motivo];
    return NextResponse.json(
      { error: fraca, codigo: motivo, problemas: [{ campo: "senha", mensagem: fraca }] },
      { status: 400 },
    );
  }

  const ipHash = hashIp(getClientIp(request.headers));

  // A reserva é fechada em TODO caminho de saída. Os caminhos normais fecham com o
  // resultado real; se algo estourar depois dela (contagem que não foi lida, conta que não
  // foi gravada), o `finally` fecha com `erro_interno`, que não conta. Antes, a linha
  // ficava `em_andamento` e pesava como tentativa no teto por IP.
  let reserva: ReservaDeTentativa = null;
  let concluida = false;
  const concluir = (success: boolean, reason: string) => {
    concluida = true;
    return concluirTentativaJogador(reserva, { email, ipHash, success, reason });
  };

  try {
    // O mesmo freio do login vale aqui: sem ele, um script cria contas em série. O
    // contador de "falhas" recebe também as criações, então quem repete demais para.
    //
    // A tentativa é RESERVADA antes de contar (ver `descontarPropriaReserva`): contando
    // antes de gravar, 12 cadastros simultâneos do mesmo IP criavam 12 contas, com o teto
    // em 5.
    //
    // A leitura do contador FALHA FECHADA (ela estoura quando o banco não responde, para o
    // limitador nunca ficar desligado em silêncio), e por isso precisa do try: fora dele o
    // erro escapava da rota e virava um 500 cru, sem o código de referência que
    // `respostaDeErro` gera para o log.
    let decisao;
    try {
      reserva = await reservarTentativaJogador({ email, ipHash });
      // Aqui toda reserva em voo do IP pesa no teto por IP (`reservasDoIpContamNoTeto`):
      // cada cadastro concluído conta nele, de qualquer e-mail.
      decisao = evaluateLoginRateLimit(
        reservasDoIpContamNoTeto(
          descontarPropriaReserva(await contarTentativasJogador(email, ipHash), reserva !== null),
        ),
      );
    } catch (error) {
      // Com o MESMO piso de tempo dos outros returns desta rota: um caminho de erro
      // que responde mais rapido que os demais vira canal de medicao.
      return comPisoDeTempo(inicio, respostaDeErro("api/conta/cadastro", error, t.falhaAgora));
    }
    if (!decisao.allowed) {
      await concluir(false, decisao.reason);
      return comPisoDeTempo(
        inicio,
        NextResponse.json(
          { error: t.muitasTentativas, codigo: "muitas_tentativas" },
          { status: 429, headers: { "Retry-After": String(decisao.retryAfterSeconds) } },
        ),
      );
    }

    try {
      const conta = await criarJogador({
        email,
        displayName: nome,
        passwordHash: await hashPassword(senha, pepperDeSenhaJogador()),
      });

      if (!conta) {
        // E-mail já cadastrado. Isto REVELA que a conta existe, e é uma escolha: num
        // grupo fechado de ~50 conhecidos, "esse e-mail já tem conta" é o recado que
        // resolve o problema da pessoa. Esconder aqui só a deixaria travada sem saber
        // por quê. Conta como falha no contador, então não vira sonda de e-mails.
        await concluir(false, "email_duplicado");
        return comPisoDeTempo(
          inicio,
          NextResponse.json({ error: t.emailExiste, codigo: "email_existe" }, { status: 409 }),
        );
      }

      // ⚠ success:false, e não true, mesmo tendo dado certo.
      //
      // O campo alimenta `ipHadRecentSuccess` em evaluateLoginRateLimit, que DESLIGA o teto
      // de falhas por conta. Como criar conta é auto-serviço e grátis, marcar sucesso aqui
      // deixava qualquer um fabricar o selo de "IP confiável" com um e-mail descartável.
      // Hoje o selo é do PAR (e-mail, IP), e `contarTentativasJogador` aceita esta linha
      // como selo só da conta que ela criou — quem criou a conta neste IP não é trancado
      // fora dela por quem sabe o e-mail. Registrar como falha é o que faz a criação em
      // série contar no teto por IP, que é o freio que este trecho já prometia ter.
      await concluir(false, TENTATIVA_CADASTRO);

      const cookie = await emitirCookieDeJogador(conta, request);
      const resposta = NextResponse.json({
        ok: true,
        jogador: { email: conta.email, displayName: conta.display_name },
      });
      resposta.cookies.set({ name: cookie.name, value: cookie.value, ...atributosDoCookie(cookie.maxAge) });

      return comPisoDeTempo(inicio, resposta);
    } catch (error) {
      return respostaDeErro("api/conta/cadastro", error, t.falha);
    }
  } finally {
    if (reserva && !concluida) {
      await concluir(false, TENTATIVA_ERRO_INTERNO).catch((e: unknown) =>
        console.error("[api/conta/cadastro] falha ao fechar a reserva da tentativa:", e),
      );
    }
  }
}
