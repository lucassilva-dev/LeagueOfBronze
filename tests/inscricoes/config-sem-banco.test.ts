import { afterEach, describe, expect, it, vi } from "vitest";

import { lerConfigOuNulo } from "@/lib/inscricoes/store";

describe("lerConfigOuNulo sem banco configurado", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // Sem as chaves (desenvolvimento local) não há configuração — e isso não é erro: o
  // console.error virava a tela vermelha do Next em todo carregamento da home local.
  it("devolve null sem registrar erro", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(lerConfigOuNulo()).resolves.toBeNull();
    expect(erro).not.toHaveBeenCalled();
  });
});
