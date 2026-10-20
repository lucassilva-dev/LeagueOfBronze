import {
  ClipboardCheck,
  Coins,
  DatabaseBackup,
  Gamepad2,
  KeyRound,
  LayoutDashboard,
  Radio,
  Shield,
  SlidersHorizontal,
  Swords,
  Trophy,
  UsersRound,
} from "lucide-react";

import type { AdminTab } from "@/components/admin/shared";
import type { Icone } from "@/components/lob/icones";

/**
 * O ícone de cada seção do painel — o mesmo no trilho, na doca do celular, no seletor de
 * seções e no cabeçalho da própria seção. Um lugar só para ele nunca divergir entre telas.
 *
 * Escolhidos pelo que a pessoa FAZ ali, não pelo nome da aba:
 *  - Times (cadastro) é o brasão; Times e vagas, da 4ª, é gente a distribuir;
 *  - Jogadores é o controle (quem joga); Usuários é a chave (quem entra no painel);
 *  - Séries são confrontos (espadas); Draft ao vivo é transmissão (rádio).
 */
export const ICONE_DA_SECAO: Record<AdminTab, Icone> = {
  overview: LayoutDashboard,
  tournament: Trophy,
  teams: Shield,
  players: Gamepad2,
  series: Swords,
  backup: DatabaseBackup,
  users: KeyRound,
  "e4-inscritos": ClipboardCheck,
  "e4-pagamentos": Coins,
  "e4-times": UsersRound,
  "e4-draft": Radio,
  "e4-config": SlidersHorizontal,
};
