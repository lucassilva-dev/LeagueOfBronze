"use client";

import { useEffect, useRef } from "react";

/** O MESMO corte de `.lob-trailer-*` em globals.css — mudar um, mudar o outro. */
const CELULAR = "(max-width: 767px)";

/**
 * O trailer da 4ª Edição, em vídeo.
 *
 * São DOIS vídeos e o CSS mostra um só (ver `.lob-trailer-*` em globals.css): no
 * computador, o 16:9; no celular (até 767 px), o 9:16, que foi feito para a tela em pé.
 * Escolher por CSS, e não por JavaScript, evita trocar de vídeo depois da hidratação e
 * funciona com o script bloqueado. O escondido não baixa o VÍDEO (`preload="none"` só
 * busca o MP4 no play); as duas capas (`poster`) são baixadas sempre — são leves, e é o
 * preço de escolher por CSS.
 *
 * O JavaScript daqui só cuida de uma coisa que o CSS não resolve: `display: none` NÃO
 * pausa um vídeo. Quem gira o celular (ou encaixa a janela na metade da tela) com o
 * trailer tocando faria o vídeo sumir com o som continuando — e, apertando o play do
 * outro, ouviria as duas trilhas. Então: na troca, o que sai pausa e o que entra continua
 * do mesmo ponto; e dar play em um pausa o outro.
 *
 * Os arquivos ficam em /public/trailer e vêm do HTML que o Claude Design gerou
 * (divulgacao/trailer), renderizado quadro a quadro com o áudio pré-renderizado dele.
 * Servidos daqui mesmo porque a CSP só aceita mídia de 'self'.
 *
 * Sem `autoPlay`: navegador nenhum toca vídeo com som sozinho, e o trailer sem som perde
 * metade da graça.
 */
export function Trailer4a({ aria, semSuporte }: { aria: string; semSuporte: string }) {
  const largo = useRef<HTMLVideoElement>(null);
  const alto = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(CELULAR);
    const trocou = () => {
      const [sai, entra] = mq.matches ? [largo.current, alto.current] : [alto.current, largo.current];
      if (!sai || !entra || sai.paused) return;
      sai.pause();
      entra.currentTime = sai.currentTime;
      // Se o navegador recusar o play sem gesto, o vídeo fica pausado no ponto certo.
      entra.play().catch(() => {});
    };
    mq.addEventListener("change", trocou);
    return () => mq.removeEventListener("change", trocou);
  }, []);

  return (
    <div className="lob-trailer">
      <video
        ref={largo}
        className="lob-trailer-largo"
        controls
        playsInline
        preload="none"
        poster="/trailer/capa-16x9.jpg"
        aria-label={aria}
        onPlay={() => alto.current?.pause()}
      >
        <source src="/trailer/trailer-4a-16x9.mp4" type="video/mp4" />
        {semSuporte}
      </video>
      <video
        ref={alto}
        className="lob-trailer-alto"
        controls
        playsInline
        preload="none"
        poster="/trailer/capa-9x16.jpg"
        aria-label={aria}
        onPlay={() => largo.current?.pause()}
      >
        <source src="/trailer/trailer-4a-9x16.mp4" type="video/mp4" />
        {semSuporte}
      </video>
    </div>
  );
}
