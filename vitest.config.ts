import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // A trava "server-only" é de build (impede a chave de serviço vazar para o
      // cliente). Em teste Node ela lançaria erro, então é substituída por um vazio.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // `.tsx` também: as telas do painel são testadas com renderToStaticMarkup, que é
    // o jeito de exercitar o render inteiro sem navegador nem login.
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // Os testes de tela renderizam o painel inteiro no jsdom (~1 s cada sozinhos). Com os 58
    // arquivos rodando em paralelo, um deles passava dos 5 s padrão sem nada de errado — só
    // a máquina ocupada. Folga para o teste falhar por defeito, não por fila de CPU.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
    },
  },
});
