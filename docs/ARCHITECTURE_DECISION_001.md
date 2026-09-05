# ADR-001 — Monólito Modular com Core, Engines, Modules e Plugins

Status: ACCEPTED
Data: 2026-09-05

## Contexto

O Ponto G cresceu com frontend React/Vite, APIs Vercel e Supabase em uma única solução operacional. Existem responsabilidades horizontais repetidas ou distribuídas em endpoints e utilitários independentes, especialmente autenticação/autorização, push, pagamentos, Storage, Realtime e administração.

Migrar para microserviços antes do lançamento aumentaria custo operacional, latência, observabilidade e superfície de falha. Ao mesmo tempo, manter uma estrutura sem fronteiras aumenta drift de segurança e dificulta evolução.

## Decisão

Adotar **Monólito Modular** como arquitetura oficial.

Camadas:
1. **Core/Kernel** — contratos, contexto, configuração, eventos, feature flags e primitives.
2. **Engines** — capacidades horizontais centralizadas e reutilizáveis.
3. **Modules** — domínios verticais de negócio com ownership explícito.
4. **Plugins** — extensões por contratos/capabilities, inicialmente in-process.
5. **Composition Root** — único ponto que registra e conecta Core, Engines, Modules e Plugins.

## Regras invariantes

- Core não depende de Engines/Modules/Plugins.
- Engine não conhece regras específicas de módulos.
- Module usa Engines; não recria Engines locais.
- Module não importa internals de outro Module.
- Integração entre módulos ocorre por API pública, command/query ou evento.
- Plugin não acessa internals, secrets ou service role diretamente.
- APIs HTTP são adapters finos; regra de negócio fica em application/domain services.
- Supabase/RLS é defesa em profundidade e ownership de dados é explícito por módulo.
- Toda nova feature declara módulo owner, Engines consumidos e rollback.
- Extração futura para serviço independente só ocorre com evidência de escala/isolamento, preservando contratos.

## Consequências positivas

- Mudanças horizontais centralizadas.
- Menor duplicação e drift de segurança.
- Testes e rollback por unidade arquitetural.
- Evolução futura por módulos/plugins.
- Deploy simples.
- Possibilidade de extração futura sem redesenhar contratos.

## Trade-offs aceitos

- Disciplina de import/dependência será obrigatória.
- O banco continua compartilhado e precisa de ownership rigoroso.
- Alguns adapters legados coexistirão temporariamente durante migração.
- Plugin system começa interno/compile-time; não é marketplace de código remoto no lançamento.

## Estratégia de adoção

Migração incremental por Strangler Pattern interno:
1. criar Engine/contrato;
2. colocar adapter sobre implementação atual;
3. migrar consumers;
4. validar;
5. remover duplicação antiga;
6. preservar rollback até estabilização.

Referência detalhada: `docs/ARCHITECTURE_MODULAR_MONOLITH.md`.
