/**
 * No teste não há o compilador do Next, e `next/font/google` não exporta nada fora dele:
 * cada fonte vira um objeto vazio (a classe e a variável ficam em branco).
 */
const fonte = () => ({ className: "", variable: "", style: { fontFamily: "" } });

export const Anton = fonte;
export const Chakra_Petch = fonte;
export const Exo_2 = fonte;
export const Permanent_Marker = fonte;
