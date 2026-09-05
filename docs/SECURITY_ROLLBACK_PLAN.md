# Ponto G — Security & Backend Rollback Plan

Status: operativo
Data-base: 2026-09-05
Parent: Issue #1 — Auditoria P0
Launch dependency: Issue #2 — Master Plan

## Objetivo
Executar a Parte 1 do Master Plan (segurança + backend) em etapas pequenas, independentes, observáveis e reversíveis. Nenhuma etapa deve depender de rollback conjunto com etapas posteriores.

## Baseline congelado
- Branch imutável: `security/launch-baseline-2026-09-05`
- Commit de origem: `c4803da9f509b5e0961afcd475e6435f75d057dd`
- Branch de integração: `security/phase-1-hardening`
- Produção somente recebe uma etapa depois de preview + smoke test + validação do banco.

### Estado crítico confirmado no baseline
- `profiles` possui SELECT público/permissivo sobre a linha inteira.
- `payments` possui INSERT para `public` com `WITH CHECK true`.
- `b2b_wallets`, `b2b_transactions` e `b2b_campaigns` possuem policies `ALL` permissivas para `public`.
- `user_uploads` possui policies antigas `full` permitindo INSERT/SELECT/UPDATE/DELETE em nível de bucket.
- `news_images` e `venues` também possuem mutations públicas herdadas.
- `get_all_users_for_admin`, `grant_album_access`, `get_or_create_conversation` e `mark_messages_as_read` são `SECURITY DEFINER` e possuem EXECUTE para `PUBLIC`/anon/authenticated.
- `user_uploads`, `news_images` e `venues` são buckets públicos; `user_uploads` não possui limite de tamanho nem allowlist MIME.

## Regra de execução
Para cada etapa:
1. Criar/usar branch exclusiva.
2. Registrar SQL/código de forward e rollback antes de aplicar.
3. Validar em Preview quando houver alteração de frontend/API.
4. Aplicar migration isolada quando houver DDL/RLS.
5. Executar smoke tests positivos e negativos.
6. Observar logs/métricas.
7. Só então avançar para a próxima etapa.

Se uma etapa falhar, reverter somente aquela etapa e retornar ao último gate verde.

---

## Etapa 00 — Baseline, inventário e guardrails
Branch: `security/step-00-baseline-inventory`
Risco funcional: mínimo.

### Forward
- Registrar policies, grants, funções privilegiadas, buckets e superfícies sensíveis atuais.
- Registrar commit/deployment de referência.
- Definir smoke tests de Auth, perfil, discovery, chat, push, upload, admin e pagamentos.
- Preparar scripts SQL de rollback para as policies/funções que serão alteradas.
- Verificar backup/restore e procedimento de rollback Vercel.

### Aceite
- Inventário reproduzível salvo.
- Baseline Git conhecido.
- Rollback SQL preparado antes da primeira migration destrutiva.

### Rollback
Não altera comportamento. Se necessário, descartar branch.

---

## Etapa 01 — Admin fail-closed
Branch: `security/step-01-admin-fail-closed`
Risco funcional: baixo/médio, restrito ao painel/admin.

### Forward
- Remover fallback `ADMIN_API_KEY || 'pontog_admin'`.
- Falhar fechado se secrets obrigatórios não existirem.
- Centralizar validação do token/admin.
- Adicionar rate limiting/backoff ao login administrativo sem alterar ainda o modelo de credenciais persistidas.
- Garantir respostas genéricas sem revelar motivo exato da falha.

### Aceite
- Secret ausente => login impossível.
- Credencial default conhecida => login impossível.
- Credencial válida configurada => fluxo administrativo continua funcionando.
- Repetidas tentativas inválidas sofrem throttle.

### Rollback
- Reverter deploy/commit desta branch no Vercel.
- Nenhuma migration de dados obrigatória nesta etapa.

---

## Etapa 02 — Contenção crítica do banco
Branch: `security/step-02-db-containment`
Risco funcional: médio.

### Forward
- Revogar EXECUTE público de `get_all_users_for_admin()`; manter apenas papel estritamente necessário ao backend.
- Remover policy pública de INSERT de `payments`.
- Remover policies `ALL true` de `b2b_wallets`, `b2b_transactions` e `b2b_campaigns`.
- Criar apenas policies mínimas necessárias para fluxos comprovados, preferindo backend/service boundary para mutations financeiras.
- Não alterar ainda `profiles` ou Storage nesta etapa.

### Aceite
- anon/authenticated não executam `get_all_users_for_admin()`.
- anon não insere em `payments`.
- anon/authenticated não alteram saldo, transação ou campanha fora da autorização explícita.
- Fluxos B2B legítimos continuam via caminho autorizado.

### Rollback
Migration reversa recria exatamente os grants/policies capturados na Etapa 00.

---

## Etapa 03 — Storage mutation lockdown
Branch: `security/step-03-storage-lockdown`
Risco funcional: médio/alto em uploads; executar separado de privacidade de leitura.

### Forward
- Remover policies legadas `full`/mutation pública de `user_uploads`, `news_images` e `venues`.
- Preservar leitura pública somente onde a mídia é realmente pública.
- Criar upload/update/delete ownership-scoped para mídia de usuário.
- Restringir news/venues a admin/owner autorizado.
- Definir MIME e limites de tamanho.
- Não tornar `user_uploads` privado inteiro ainda se isso quebrar URLs existentes; a migração de mídia privada ocorre na Etapa 04.

### Aceite
- anon não faz upload/update/delete.
- usuário A não altera/deleta objeto do usuário B.
- upload legítimo autenticado continua.
- URLs públicas esperadas continuam carregando.

### Rollback
Recriar policies anteriores e restaurar configurações de bucket registradas na Etapa 00. Não excluir objetos durante esta etapa.

---

## Etapa 04 — Privacy surface: profiles, localização e álbuns
Branch: `security/step-04-privacy-surface`
Risco funcional: alto; usar estratégia expand → migrate → contract.

### Forward A — Expand (sem quebra)
- Criar superfície pública mínima de perfil com colunas permitidas (`security_invoker` quando for view compatível).
- Criar acesso privado explícito para dados do próprio usuário.
- Criar bucket/surface privada para mídia realmente privada + signed URLs.
- Corrigir `grant_album_access`: exigir `auth.uid() IS NOT NULL`, ownership com `IS DISTINCT FROM`, search_path fixo e grants mínimos.

### Forward B — Migrate
- Alterar frontend/APIs para consumir a nova superfície pública.
- Alterar fluxo de álbum privado para URL assinada/autorização explícita.
- Remover dependências de coordenada exata no cliente quando não necessária.

### Forward C — Contract
- Remover SELECT público amplo de `profiles`.
- Restringir `venue_checkins` conforme visibilidade/consentimento.
- Revogar grants legados de álbum.

### Aceite
- Usuário público não consegue consultar campos sensíveis/exatos fora da superfície autorizada.
- Self-profile continua editável.
- Discovery continua funcional usando dados públicos mínimos.
- Álbum privado só é acessível com autorização válida.

### Rollback
Como a etapa usa expand/migrate/contract, rollback preferencial é reativar temporariamente o caminho compatível anterior sem apagar a nova estrutura. Não destruir/mover definitivamente mídia antiga até o gate permanecer verde.

---

## Etapa 05 — Authorization layer, mensagens e push
Branch: `security/step-05-authz-messaging-push`
Risco funcional: médio.

### Forward
- Criar helper central `requireUser()`.
- Criar `authorize(resource, action)`/helpers de ownership e membership.
- Corrigir `get_or_create_conversation()` para exigir caller autenticado e participante.
- Corrigir `mark_messages_as_read()` para exigir membership/recipient válido.
- Push deixa de aceitar destino/conteúdo arbitrários sem comprovação de recurso; destinatário/conteúdo devem ser derivados da mensagem/evento permitido.
- Fixar search_path e reduzir EXECUTE de RPCs alteradas.

### Aceite
- Usuário não cria conversa entre terceiros.
- Usuário não marca mensagens de conversa alheia.
- Usuário não usa API push como relay arbitrário.
- Chat/push normais continuam E2E.

### Rollback
Reverter deploy da API + migration das duas RPCs para as definições capturadas na Etapa 00. Como alterações são de autorização, nenhum dado precisa ser removido para rollback.

---

## Etapa 06 — Financial hardening e idempotência
Branch: `security/step-06-financial-hardening`
Risco funcional: médio/alto; executar com pagamentos controlados.

### Forward
- Tornar processamento de pagamento idempotente por provider/payment/event ID.
- Transformar top-up/ledger em operação transacional/atômica; evitar read → update de saldo.
- Validar ownership do wallet/recurso antes de criar preference.
- Fixar/allowlistar callback/base URLs por ambiente.
- Entitlements derivados somente do estado confirmado pelo backend.

### Aceite
- Mesmo webhook repetido N vezes gera uma única mutação financeira.
- Concorrência não perde incremento nem duplica crédito.
- Usuário não cria preferência para wallet de terceiro.
- Sandbox + transação controlada de produção passam.

### Rollback
- Feature flag/caminho antigo somente se necessário e seguro.
- Reverter API/RPC da etapa; manter registros de idempotência criados (são aditivos e não precisam ser apagados).
- Nunca executar rollback que subtraia saldo automaticamente; reconciliação financeira é explícita.

---

## Etapa 07 — SECURITY DEFINER, grants e performance-safe cleanup
Branch: `security/step-07-cleanup-regression`
Risco funcional: médio.

### Forward
- Inventariar todas as `SECURITY DEFINER` restantes.
- Revogar EXECUTE implícito de `PUBLIC` onde não necessário.
- Fixar `search_path` mínimo.
- Consolidar policies duplicadas sem mudar regra funcional.
- Corrigir `auth_rls_initplan` usando padrões atuais adequados.
- Adicionar índices FK realmente necessários com abordagem segura para produção.
- Remover apenas índices comprovadamente duplicados; não remover apenas porque aparecem como unused.

### Aceite
- Supabase Security Advisor sem exposição crítica relevante.
- Regressão funcional verde.
- Query plans críticos não pioram.
- p95 do backend não degrada.

### Rollback
Cada migration separa grants/policies de índices. Policies/grants podem ser recriados; índices novos podem ser removidos isoladamente. Não misturar cleanup irreversível com autorização.

---

## Etapa 08 — Release gate da Parte 1
Branch: `security/step-08-release-gate`

### Forward
- Security regression completa: anon, authenticated A, authenticated B, admin, service boundary.
- Rodar Supabase Security + Performance Advisors.
- Testar Auth, recovery, profile, discovery, chat, push, albums, storage, check-in e pagamentos.
- Validar Vercel Preview e logs.
- Validar backup/restore e rollback de deployment.
- Congelar P0/P1 conhecidos antes de concluir Issue #1.

### Go
- Zero P0.
- Nenhuma tabela financeira mutável por anon.
- Nenhuma RPC administrativa exposta.
- Nenhuma mídia privada publicamente legível.
- Nenhum dado sensível de perfil exposto pela superfície pública.
- Push e mensagens com authz por recurso.
- Admin fail-closed.
- Pagamentos idempotentes/atômicos.

### Rollback
Se regressão for encontrada, reverter somente a última etapa responsável e manter o último gate verde. O baseline congelado permanece como rollback total de emergência.

---

## Etapa 09 — Observabilidade pós-hardening
Branch: `security/step-09-post-hardening-observability`
Não bloqueia a correção dos P0, mas bloqueia lançamento público amplo.

- Dashboards/alertas para 401/403/429/5xx, falha de webhook, auth failures e abuso de push/storage.
- Logs de ações administrativas e financeiras com correlação.
- Alertas sem registrar tokens, secrets ou payloads sensíveis.
- Janela de estabilização antes de iniciar a próxima macrofase do Launch Master Plan.

## Ordem mandatória
`00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09`

A única exceção é trabalho preparatório que não altera comportamento. Etapas que mudam produção não devem ser promovidas fora de ordem sem registrar a justificativa na Issue #1.
