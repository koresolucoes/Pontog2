# Ponto G — Arquitetura Oficial: Monólito Modular

Status: arquitetura alvo obrigatória
Data-base: 2026-09-05
Escopo: frontend, backend Vercel, Supabase, Realtime, Storage, integrações e futuras extensões

## Decisão arquitetural

O Ponto G será evoluído como **monólito modular**, com uma única aplicação/deploy principal e uma única plataforma de dados, porém com fronteiras internas explícitas.

A arquitetura padrão é:

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

## 1. Core / Kernel

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

## 2. Engines

Engine é uma capacidade horizontal reutilizável por vários módulos.

### Security Engine
- autenticação de request;
- sessão;
- secrets/config fail-closed;
- rate limit primitives;
- proteção anti-abuso básica;
- helpers de segurança comuns.

### Authorization Engine
- `requireUser()`;
- `authorize(subject, action, resource)`;
- ownership/membership;
- RBAC/ABAC quando necessário;
- policy adapters para Supabase/RLS;
- decisão de autorização auditável.

### Realtime Engine
- criação/registro central de channels;
- naming único;
- lifecycle/subscription cleanup;
- deduplicação;
- reconnect/backoff;
- métricas de conexão;
- adapters por módulo.

### Notification Engine
- push/email/in-app no futuro;
- templates server-side;
- preferências do usuário;
- destinatário derivado de recurso autorizado;
- retries/deduplicação;
- provider adapters.

### Media/Storage Engine
- validação MIME/tamanho;
- paths ownership-scoped;
- public/private classification;
- signed URLs;
- upload/delete abstractions;
- futuras transformações/thumbnail adapters.

### Payment Engine
- provider adapter (Mercado Pago hoje; outros amanhã);
- idempotência;
- webhook verification;
- ledger primitives;
- transações atômicas;
- entitlements confirmados pelo servidor.

### Moderation Engine
- report/block/ban/suspension primitives;
- rules/hooks;
- audit trail;
- futuras integrações de detecção automática.

### Location/Privacy Engine
- localização aproximada;
- regras de visibilidade;
- check-in TTL/consentimento;
- minimização de coordenadas;
- políticas por contexto.

### Observability Engine
- structured logging;
- correlation IDs;
- métricas;
- eventos de segurança;
- redaction de dados sensíveis;
- adapters de providers futuros.

## 3. Domain Modules

Cada módulo é uma vertical slice de negócio e deve possuir fronteira clara.

Estrutura alvo de um módulo:

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

## 4. Regras de dependência

Permitido:

```text
Core <- Engines <- Modules <- Plugins
          ^          |
          └──────────┘ via contratos públicos
```

Regras obrigatórias:
1. Core não importa Engines, Modules ou Plugins.
2. Engine depende apenas de Core e adapters externos.
3. Module pode depender de Core + Engines.
4. Module não importa internals de outro Module.
5. Integração Module → Module usa `public.ts`, command/query contract ou domain event.
6. Plugin usa somente Plugin SDK/contracts e APIs públicas.
7. UI não acessa `service_role` nem infraestrutura privilegiada.
8. Handler/API não contém regra complexa; delega para application service/engine.
9. Repository não decide autorização de negócio sozinho.
10. Supabase/RLS continua defense-in-depth mesmo quando o backend autoriza.

## 5. Data ownership

Continuaremos com um único Supabase/Postgres, porém cada domínio deve possuir ownership explícito das suas tabelas e migrations.

Objetivo progressivo:
- schemas/tabelas classificados por módulo;
- tabelas sensíveis fora da superfície pública quando possível;
- views/RPCs públicas mínimas e intencionais;
- RLS como fronteira de dados;
- nenhuma tabela compartilhada usada como "atalho" entre módulos sem contrato documentado.

Não é obrigatório mover todas as tabelas para schemas novos imediatamente. A migração será incremental e rollbackável.

## 6. Plugin model

No primeiro momento, plugins serão **in-process/compile-time**, dentro do monólito. Isso mantém deploy, debugging e segurança simples.

Contrato futuro mínimo:

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

Um plugin poderá registrar, conforme capabilities autorizadas:
- routes;
- commands/queries;
- event handlers;
- notification templates;
- admin panels;
- UI slots;
- scheduled jobs;
- provider adapters.

Plugin **não recebe acesso irrestrito ao banco, service role, secrets ou Core internals**.

## 7. Eventos e desacoplamento

Para efeitos internos que cruzam módulos, preferir eventos explícitos.

Exemplo:

```text
Messaging: MessageCreated
      │
      ├── Notification Engine → push
      ├── Analytics → metric/event
      └── Moderation Engine → optional safety hook
```

Isso substitui duplicação do tipo `send-message + send-push + analytics + moderation` espalhada em diferentes componentes.

Eventos devem ser versionáveis e possuir payload mínimo necessário.

## 8. API padrão

Todo endpoint segue:

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

## 9. Frontend padrão

Frontend também será modular.

- `core/`: app shell, routing contracts, session, feature flags, shared primitives.
- `engines/`: realtime client, notification client, media client, telemetry.
- `modules/`: telas, stores e regras de apresentação do domínio.
- `shared/ui/`: design system puro.

Stores globais devem ser mínimos. Estado de domínio fica no módulo correspondente.

## 10. Estratégia de migração

Não haverá big-bang refactor.

Usaremos **Strangler Pattern interno**:
1. criar contrato/motor novo;
2. adaptar implementação antiga atrás dele;
3. migrar callers gradualmente;
4. validar comportamento;
5. remover implementação duplicada apenas no final.

Cada mudança deve ser rollbackável de forma independente.

## 11. Aplicação imediata à Parte 1 — Segurança

A sequência de segurança passa a construir a arquitetura alvo:

- Step 01 Admin → `Security Engine` + config fail-closed.
- Step 02 DB containment → boundaries de dados + `Authorization Engine` contracts.
- Step 03 Storage → `Media/Storage Engine`.
- Step 04 Privacy → `Location/Privacy Engine` + Profiles/Albums modules.
- Step 05 Messaging/Push → `Authorization Engine` + `Notification Engine` + Messaging module.
- Step 06 Financeiro → `Payment Engine` + Subscriptions/B2B modules.
- Step 07 Cleanup → enforcement das regras de dependência e eliminação de duplicações.
- Step 08 Regression → testes por contrato/módulo/engine.
- Step 09 Observability → `Observability Engine`.

## 12. Gates arquiteturais para qualquer PR

Todo PR de feature deve responder:
- Qual módulo é owner?
- Qual Engine compartilhado é usado?
- Existe novo contrato público?
- Há import cross-module indevido?
- Há acesso direto ao Supabase que deveria passar por repository/engine?
- Há autorização por recurso?
- Há evento de domínio quando necessário?
- Há feature flag se a mudança for de risco?
- Há teste unitário/contrato/E2E correspondente?
- Como fazer rollback?

## 13. O que não faremos

- microservices prematuros;
- duplicar engines dentro de módulos;
- "utils.ts" como depósito de regra de negócio;
- acesso de módulo aos internals de outro módulo;
- service role no frontend;
- endpoints contendo toda a regra de negócio;
- plugins com acesso irrestrito;
- mudanças de banco irreversíveis sem fase de compatibilidade;
- dependências circulares entre módulos.

## Resultado esperado

O Ponto G continua simples operacionalmente — um monólito, um deploy principal, uma plataforma de dados — mas passa a ter fronteiras que permitem:
- evolução centralizada;
- correções globais por Engine;
- módulos substituíveis;
- plugins futuros;
- testes isolados;
- menor drift de segurança;
- manutenção mais previsível;
- eventual extração de um módulo para serviço separado somente se escala/negócio realmente justificar.
