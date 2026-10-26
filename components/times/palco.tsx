import { CENARIOS } from "@/components/times/cenarios";
import s from "@/components/times/tema.module.css";
import { cx } from "@/components/times/util";
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * O fundo animado das páginas temáticas (time e jogador): o FUNDO do cenário do tema
 * (components/times/cenarios) dentro da câmera, mais vinheta e grão. Inteiro aria-hidden: é
 * cenário, não conteúdo. Fica sticky atrás do conteúdo e acompanha a rolagem (tema.module.css,
 * `.palco`).
 */
export function Palco({ tema }: Readonly<{ tema: TemaDoTime }>) {
  const { Fundo, classes } = CENARIOS[tema.cenario];
  return (
    <div className={s.palco} aria-hidden="true" data-cenario={tema.cenario}>
      <div className={cx(s.enfCamera, classes?.enfCamera)}>
        <Fundo />
      </div>
      <div className={s.enfVinheta} />
      <div className={s.enfGrao} />
    </div>
  );
}
