# Ponto G — Status de Implementação da Arquitetura

Data-base: 2026-09-05
ADR: `ARCHITECTURE_DECISION_001.md`
Issue: #16

## Estado

A arquitetura de Monólito Modular foi aprovada e registrada na `main`.

A Etapa 00.5 cria somente a foundation técnica:

- `core/` — contracts, context, events, errors e registry;
- `engines/` — contratos públicos dos motores compartilhados;
- `modules/manifest.ts` — ownership inicial dos domínios;
- `plugins/sdk.ts` — contrato capability-based para extensões futuras;
- `composition/root.ts` — único ponto de montagem arquitetural.

## O que esta etapa NÃO faz

- não altera `App.tsx`;
- não altera `server.ts`;
- não altera endpoints Vercel;
- não altera Supabase;
- não cria secrets ou env vars;
- não muda fluxo de login, chat, push, storage ou pagamento;
- não migra comportamento legado ainda.

## Próxima execução

A Security Step 01 será o primeiro Strangler migration real:

1. implementar config fail-closed e autenticação administrativa como adapter do `Security Engine`;
2. manter endpoint atual como adapter HTTP fino;
3. validar login/admin em Preview;
4. remover fallback legado;
5. manter rollback por deployment.

## Regra permanente

Toda nova feature e todo hardening devem usar Core/Engines/Modules existentes antes de criar uma implementação paralela.
