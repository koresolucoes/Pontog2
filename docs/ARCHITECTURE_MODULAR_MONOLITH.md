# Ponto G — Arquitetura Oficial: Monólito Modular

Status: arquitetura alvo obrigatória
Data-base: 2026-09-05
Escopo: frontend, backend Vercel, Supabase, Realtime, Storage, integrações e futuras extensões

## Decisão arquitetural

O Ponto G será evoluído como **monólito modular**, com uma única aplicação/deploy principal e uma única plataforma de dados, porém com fronteiras internas explícitas.

```text
Application / Composition Root
        │
        ├── Core / Kernel
        │     ├── config
        │     ├── identity/session context
        │     ├── error model
        │     ├── event bus contracts
        │     ├── module registry
        │     ├── feature flags
        │     └── telemetry/request context
        │
        ├── Engines
        │     ├── Security Engine
        │     ├── Authorization Engine
        │     ├── Realtime Engine
        │     ├── Notification Engine
        │     ├── Media/Storage Engine
        │     ├── Payment Engine
        │     ├── Moderation Engine
        │     ├── Location/Privacy Engine
        │     └── Observability Engine
        │
        ├── Domain Modules
        │     ├── Identity
        │     ├── Profiles
        │     ├── Discovery
        │     ├── Messaging
        │     ├── Albums
        │     ├── Agora/Social
        │     ├── Communities
        │     ├── Venues/Check-ins
        │     ├── Subscriptions
        │     ├── Trust & Safety
        │     ├── Partnerships/Growth
        │     └── Admin
        │
        └── Plugin Layer
              ├── Plugin contracts
              ├── manifests/capabilities
              ├── hooks/events
              ├── UI slots
              └── adapters externos
```

## Princípio central

**Core define padrões. Engines executam capacidades compartilhadas. Modules implementam negócio. Plugins estendem sem alterar o Core.**

Nenhum módulo deve criar sua própria implementação paralela de autenticação, autorização, push, pagamento, Storage, Realtime, logging ou tratamento de erro quando existir um Engine correspondente.

## Core / Kernel

O Core deve ser pequeno, estável e sem dependência de módulos de negócio.

Responsabilidades permitidas:
- configuração tipada e validação de ambiente;
- composition root / registro de módulos;
- contexto de request/usuário;
- contratos compartilhados;
- erros padronizados;
- event bus e contratos de eventos;
- feature flags;
- IDs/correlation IDs;
- contratos de plugin;
- primitives comuns sem regra de domínio.

O Core **não** contém regra de perfil, chat, venue, assinatura, álbum ou comunidade.

## Engines

### Security Engine
Autenticação de request, sessão, secrets/config fail-closed, rate limit primitives e helpers de segurança.

### Authorization Engine
`requireUser()`, `authorize(subject, action, resource)`, ownership/membership, RBAC/ABAC quando necessário, adapters para RLS e decisões auditáveis.

### Realtime Engine
Registro central de channels, naming único, lifecycle/cleanup, deduplicação, reconnect/backoff e adapters por módulo.

### Notification Engine
Push/email/in-app, templates server-side, preferências, destinatário derivado de recurso autorizado, retries/deduplicação e provider adapters.

### Media/Storage Engine
Validação MIME/tamanho, paths ownership-scoped, public/private classification, signed URLs, upload/delete e futuras transformações.

### Payment Engine
Provider adapters, idempotência, webhook verification, ledger primitives, transações atômicas e entitlements confirmados pelo servidor.

### Moderation Engine
Report/block/ban/suspension primitives, rules/hooks, audit trail e futuras integrações automáticas.

### Location/Privacy Engine
Localização aproximada, regras de visibilidade, check-in TTL/consentimento e minimização de coordenadas.

### Observability Engine
Structured logging, correlation IDs, métricas, eventos de segurança, redaction e provider adapters.

## Domain Modules

Cada módulo é uma vertical slice de negócio.

```text
modules/<module>/
  domain/
    entities.ts
    rules.ts
    events.ts
  application/
    commands.ts
    queries.ts
    service.ts
  infrastructure/
    repository.supabase.ts
    realtime.adapter.ts
  api/
    handlers.ts
  ui/
    components/
    hooks/
    store.ts
  public.ts
```

`public.ts` é o contrato público do módulo. Código externo não deve importar arquivos internos do módulo.

## Regras de dependência

1. Core não importa Engines, Modules ou Plugins.
2. Engine depende apenas de Core e adapters externos.
3. Module pode depender de Core + Engines.
4. Module não importa internals de outro Module.
5. Module → Module usa `public.ts`, command/query contract ou domain event.
6. Plugin usa somente Plugin SDK/contracts e APIs públicas.
7. UI nunca acessa `service_role` ou infraestrutura privilegiada.
8. Handler/API delega regra para application service/engine.
9. Repository não decide autorização de negócio sozinho.
10. Supabase/RLS permanece defense-in-depth.

## Data ownership

Continuamos com um único Supabase/Postgres, mas cada domínio deve possuir ownership explícito das tabelas e migrations.

Objetivo progressivo:
- schemas/tabelas classificados por módulo;
- tabelas sensíveis fora da superfície pública quando possível;
- views/RPCs públicas mínimas e intencionais;
- RLS como fronteira de dados;
- sem tabela compartilhada usada como atalho entre módulos sem contrato documentado.

A migração será incremental e rollbackável; não é obrigatório mover todas as tabelas imediatamente.

## Plugin model

Plugins começam **in-process/compile-time** dentro do monólito. Isso mantém deploy, debugging e segurança simples.

```ts
interface PontoGPlugin {
  manifest: {
    id: string;
    version: string;
    capabilities: string[];
  };
  register(ctx: PluginContext): void;
}
```

Capabilities futuras podem registrar routes, commands/queries, event handlers, notification templates, admin panels, UI slots, jobs e provider adapters.

Plugin **não recebe acesso irrestrito a banco, service role, secrets ou Core internals**.

## Eventos e desacoplamento

Efeitos que cruzam módulos devem preferir eventos explícitos.

```text
Messaging: MessageCreated
      │
      ├── Notification Engine → push
      ├── Analytics → metric/event
      └── Moderation Engine → safety hook
```

Isso evita espalhar `send-message + send-push + analytics + moderation` em vários componentes.

## API padrão

```text
HTTP handler
   ↓
parse + validate
   ↓
Security Engine / requireUser
   ↓
Authorization Engine
   ↓
Module application service
   ↓
Repository / Engine
   ↓
Domain event
   ↓
standard response/error
```

Nenhum endpoint novo deve criar cliente `service_role` e executar regra sensível diretamente sem passar pela camada padrão.

## Frontend padrão

- `core/`: app shell, routing contracts, session, feature flags, shared primitives.
- `engines/`: realtime client, notification client, media client, telemetry.
- `modules/`: telas, stores e regras de apresentação do domínio.
- `shared/ui/`: design system puro.

Stores globais devem ser mínimos. Estado de domínio fica no módulo correspondente.

## Estratégia de migração

Não haverá big-bang refactor. Usaremos Strangler Pattern interno:
1. criar contrato/motor novo;
2. adaptar implementação antiga atrás dele;
3. migrar callers gradualmente;
4. validar comportamento;
5. remover implementação duplicada apenas no final.

Cada mudança deve ser rollbackável de forma independente.

## Aplicação imediata à Parte 1 — Segurança

- Step 01 Admin → `Security Engine` + config fail-closed.
- Step 02 DB containment → boundaries de dados + `Authorization Engine` contracts.
- Step 03 Storage → `Media/Storage Engine`.
- Step 04 Privacy → `Location/Privacy Engine` + Profiles/Albums modules.
- Step 05 Messaging/Push → `Authorization Engine` + `Notification Engine` + Messaging module.
- Step 06 Financeiro → `Payment Engine` + Subscriptions/B2B modules.
- Step 07 Cleanup → enforcement das regras de dependência e eliminação de duplicações.
- Step 08 Regression → testes por contrato/módulo/engine.
- Step 09 Observability → `Observability Engine`.

## Gate arquitetural de todo PR

Todo PR deve responder:
- Qual módulo é owner?
- Qual Engine compartilhado é usado?
- Existe novo contrato público?
- Existe import cross-module indevido?
- Há acesso direto ao Supabase que deveria passar por repository/engine?
- Há autorização por recurso?
- Há evento de domínio quando necessário?
- Há feature flag se a mudança for de risco?
- Há teste unitário/contrato/E2E?
- Como fazer rollback?

## O que não faremos

- microservices prematuros;
- duplicar Engines dentro de módulos;
- `utils.ts` como depósito de regra de negócio;
- acesso de módulo aos internals de outro módulo;
- service role no frontend;
- endpoints contendo toda a regra de negócio;
- plugins com acesso irrestrito;
- mudanças de banco irreversíveis sem fase de compatibilidade;
- dependências circulares.

## Resultado esperado

O Ponto G continua simples operacionalmente — um monólito, um deploy principal, uma plataforma de dados — mas passa a ter fronteiras que permitem evolução centralizada, correções globais por Engine, módulos substituíveis, plugins futuros, testes isolados, menor drift de segurança e eventual extração de um módulo somente se escala ou negócio realmente justificar.
