import { definir } from "@/lib/i18n/definir";

/**
 * Os textos do tema Os 5 Sem Ping (lib/temas/os-5-sem-ping.ts), somados ao bloco paginasHome
 * (lib/i18n/messages/paginas-home.ts): `tema.textos` aponta para estas chaves. Um arquivo por
 * time para cada tema mudar só o seu. Chaves com o prefixo do time, para nunca colidirem.
 *
 * A página é a call de madrugada do time. O adesivo «999 ms? Nunca nem vi.» fica em português
 * nos dois idiomas (a página o marca com lang="pt-BR"), como o FIADO dos Galácticos.
 */
export const textosOs5SemPing = definir({
  pt: {
    temaSemPingLema: "Câmera ligada, microfone aberto, ping zero.",
    temaSemPingCameras: "CÂMERAS LIGADAS",
    temaSemPingAviso: "Ninguém travou. Ainda.",
    temaSemPingCapitao: "ADM DA CALL",
    temaSemPingConectados: "CONECTADOS {periodo}",
    temaSemPingEncerrada: "Chamada encerrada · quedas: 0 · ping médio: 0 ms",
    temaSemPingNuncaNemVi: "999 ms? Nunca nem vi.",
    temaSemPingFecho: "Travou? Tira da tomada e conta até dez.",
    temaSemPingMesmaCall: "NA MESMA CALL",
  },
  en: {
    temaSemPingLema: "Cameras on, mics open, zero ping.",
    temaSemPingCameras: "CAMERAS ON",
    temaSemPingAviso: "Nobody's frozen. Yet.",
    temaSemPingCapitao: "CALL ADMIN",
    temaSemPingConectados: "ONLINE {periodo}",
    temaSemPingEncerrada: "Call ended · drops: 0 · average ping: 0 ms",
    temaSemPingNuncaNemVi: "999 ms? Nunca nem vi.",
    temaSemPingFecho: "Lagging? Unplug it and count to ten.",
    temaSemPingMesmaCall: "IN THE SAME CALL",
  },
});
