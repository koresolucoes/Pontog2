# Step 06 — Trust & Safety + autorização residual

Status: **aplicado no Supabase de produção; código em branch até CI/merge**.

## Objetivo

Transformar bloqueio, denúncia, moderação e interações sociais em regras de backend, não apenas estados de UI. Esta etapa mantém compatibilidade com os contratos publicados enquanto reduz acesso anônimo, vazamento de localização e credenciais administrativas fail-open.

## 06A — Least privilege e bloqueio como barreira real

Migration: `step_06a_trust_safety_least_privilege`

- `admins` e `admin_audit_logs` ficaram server-only.
- `profile_views` e `winks` ficaram RPC-only para clientes.
- `reports` ficou insert-only para usuários finais.
- `blocks`, `favorites`, `user_connections`, `venue_bans` e `messages` receberam grants mínimos compatíveis com o frontend atual.
- Policies sociais foram recriadas com `TO authenticated` e `(select auth.uid())`.
- A inserção de mensagem agora falha quando existir bloqueio em qualquer direção ou participante suspenso/banido.
- Conexões/favoritos não podem ser criados entre usuários bloqueados ou inativos.
- Constraints impedem self-block, self-favorite, self-report, self-wink e self-connection.

## 06B — RPCs sociais endurecidas

Migration: `step_06b_social_rpc_authorization`

RPCs revisadas:

- `get_daily_wink_count`
- `get_my_blocked_users`
- `get_my_favorite_users`
- `record_profile_view`
- `send_wink`
- `get_my_winks`
- `get_my_profile_viewers`

Controles:

- `anon EXECUTE` revogado.
- autenticação explícita.
- `search_path` fixo.
- bloqueio bidirecional.
- status ativo para interações.
- perfil incognito não deixa trilha de visualização.
- feeds de winks/visualizações não retornam HIV status nem coordenadas exatas.

## 06C — Fila operacional de denúncias

Migration: `step_06c_report_triage_lifecycle`

A tabela `reports` ganhou:

- `status`: `open | reviewing | resolved | dismissed`
- `reviewed_at`
- `reviewed_by`
- `resolution_notes`
- `updated_at`

Também foi adicionado índice por status/data e limites de tamanho para comentários/notas.

O endpoint `/api/admin/reports` passa a aceitar triagem auditada via `PATCH`. Suporte pode encaminhar para análise; Owner/Moderator podem resolver ou descartar.

## 06D/06E/06F — Notificações de conexão seguras

Migrations:

- `step_06d_add_connection_notification_type`
- `step_06e_connection_notification_defaults`
- `step_06f_connection_notification_events`

Mudanças:

- novo preference type `new_connection`.
- defaults criados para perfis existentes e futuros.
- `user_connections.notification_event_id` fornece identidade numérica idempotente.
- Notification Engine aceita `connection_request` e `connection_accepted` como eventos persistidos.
- `/api/send-generic-push` permanece apenas como adapter de compatibilidade: **title/body do cliente são ignorados**. O servidor resolve evento, ator, destinatário e copy a partir de `user_connections`.

## 06G — Localização e discovery compatíveis, sem coordenada exata

Migration: `step_06g_discovery_social_privacy_compat`

Os RPCs legados permanecem com a mesma assinatura para não quebrar `mapStore`, mas foram endurecidos:

- `get_nearby_profiles`
- `get_popular_profiles_paginated`
- `get_venue_checkins`
- `update_my_location`

Discovery agora:

- exige login.
- exclui bloqueados, incognito e contas não ativas.
- devolve latitude/longitude em grade aproximada de 2 casas decimais, não a coordenada armazenada.
- reduz `date_of_birth` ao ano para preservar cálculo de idade sem expor mês/dia.
- usa distância aproximada baseada na grade retornada.

## 06H — RPCs sociais residuais

Migration: `step_06h_social_rpc_anon_containment`

- Agora posts/comments passaram a exigir autenticação e respeitar blocks/status/incognito onde aplicável.
- RPCs sociais restantes deixaram de aceitar `anon` onde não há caso público legítimo.
- helpers de trigger `SECURITY DEFINER` deixaram de ser RPCs chamáveis por clientes.
- `get_all_users_for_admin` continua service-role-only e ganhou `search_path` fixo.
- funções app-owned restantes ganharam `search_path` fixo sem alterar semântica pública quando ela é intencional (ex.: planos/notícias/venues).

## 06I — Helper de vídeo e denúncia ativa

Migration: `step_06i_video_helper_anon_containment`

- `update_video_comments_count` deixou de aceitar `anon` e ganhou `search_path` fixo.
- denúncia só pode ser criada por uma conta autenticada cujo perfil esteja `active`.
- a policy continua insert-only para o usuário final; resolução permanece no backend administrativo.

## 06J — Privacidade de presença/check-in

Migration: `step_06j_checkin_presence_privacy`

`venue_checkins` deixou de ser uma tabela pública:

- `anon` não possui SELECT/INSERT/UPDATE/DELETE.
- usuário autenticado altera/remove apenas o próprio check-in.
- leitura social fica limitada a check-ins com no máximo 12h, perfis ativos, não-incognito e sem bloqueio em qualquer direção.
- a listagem detalhada de quem está no local continua passando por `get_venue_checkins`, que aplica as mesmas regras de Trust & Safety.

O comportamento de produto é preservado porque check-in é opt-in; o que foi removido foi a leitura anônima, histórica e sem contexto.

## Admin fail-closed

Código revisado:

- `api/admin/_utils.ts`
- `api/admin-login.ts`

Correções:

- removido `ADMIN_API_KEY || 'pontog_admin'`.
- removidas contas derivadas de uma chave padrão.
- `ADMIN_ACCOUNTS` é opt-in e validado; ausente/malformado resulta em zero contas fallback.
- JWT administrativo precisa carregar `email`, `name` e role reconhecida.
- token `mfa_pending` nunca é aceito como token administrativo.
- removido `decoded.role || 'owner'`.
- login por API key só funciona se `ADMIN_API_KEY` estiver explicitamente configurado.

> A migração de credenciais administrativas legadas para KDF forte e rate limit persistente continua como hardening posterior; esta etapa elimina os fail-open críticos sem inventar hashes para senhas existentes.

## Performance observada durante a auditoria

O Performance Advisor ainda aponta backlog anterior à Step 06: FKs sem índice em vários módulos, policies com `auth_rls_initplan`, policies permissivas duplicadas, índices duplicados e um bundle frontend grande. Estes itens **não são removidos/alterados às cegas nesta etapa** porque precisam ser tratados com queries e fluxos reais. Eles compõem a próxima fase de Performance & Reliability.

## Rollback

A Step 06 foi desenhada para ser **backward-compatible com o deploy da Step 05**. Se houver regressão de aplicação:

1. reverter/promover o deploy anterior no Vercel;
2. manter as migrations 06A–06J aplicadas;
3. não restaurar grants anônimos, coordenadas exatas, presença histórica ou credenciais padrão;
4. desabilitar apenas o adapter de conexão se necessário.

Não existe motivo seguro para um rollback que reabra as exposições corrigidas. O arquivo `STEP_06_TRUST_SAFETY_COMPAT_ROLLBACK.sql` documenta o rollback de compatibilidade não destrutivo.

## Verificação obrigatória

- Social SECURITY DEFINER de aplicação: `anon_exec=false` quando não há caso público legítimo.
- `admins/admin_audit_logs`: sem grants para `anon/authenticated`.
- bloqueio impede nova mensagem e novas interações sociais.
- todos os `user_connections` possuem `notification_event_id` único.
- preference `new_connection` existe.
- `venue_checkins`: sem grants anon e sem leitura histórica irrestrita.
- Architecture Check: typecheck + full build verdes.
- deployment `main` no Vercel READY e smoke HTTP 200.
- runtime sem erro/fatal após deploy.
