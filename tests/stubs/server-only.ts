// Substituto de "server-only" nos testes.
//
// O pacote real lança erro fora do contexto de Server Component do Next — ele existe
// para FALHAR O BUILD caso lib/data-store (que carrega a chave de serviço do Supabase)
// seja importado por um componente "use client". Essa proteção é de build; nos testes
// em Node ela só atrapalharia, então aqui vira um módulo vazio.
export {};
