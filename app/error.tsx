"use client";

import { useEffect } from "react";

import { PainelDeErro, idiomaDoDocumento, useIdioma } from "@/components/tela-de-erro";

/**
 * Falha dentro de uma página (o caso real: o banco fora numa instância que ainda não tinha
 * a última cópia boa em memória — ver lib/server-data.ts).
 *
 * Fica DENTRO do layout raiz, então o cabeçalho, o menu e o rodapé do SiteFrame continuam
 * na tela: a pessoa vê o site, entende que foi um tropeço e tem por onde seguir.
 *
 * "Tentar de novo" usa o `retry` do Next 16, que busca a página no servidor outra vez e
 * só então redesenha. O `reset` sozinho redesenharia o que já falhou, sem buscar nada —
 * fica de reserva para o caso de o `retry` não vir.
 */
export default function Erro({
  error,
  retry,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  retry?: () => void;
  reset: () => void;
}>) {
  const idioma = useIdioma(idiomaDoDocumento);

  useEffect(() => {
    // Erro de componente de cliente só aparece aqui; o do servidor já está no log da Vercel.
    console.error(error);
  }, [error]);

  return <PainelDeErro idioma={idioma} codigo={error.digest} onTentarDeNovo={() => (retry ?? reset)()} />;
}
