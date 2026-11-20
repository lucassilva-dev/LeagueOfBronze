import s from "@/components/stats/carregando.module.css";

/**
 * O instante entre o clique no menu e a /stats chegar: o fundo da própria página e o emblema
 * sobre a brasa. Nada de esqueleto de cartões — a troca pela Forja (ou pela porta dela) não pisca.
 */
export default function Loading() {
  return (
    <div className={s.carregando} aria-busy="true">
      <span className={s.enfBrasa} aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.emblema} src="/emblema-recortado.png" alt="" width={512} height={512} decoding="async" />
    </div>
  );
}
