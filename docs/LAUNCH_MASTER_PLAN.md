# Ponto G — Launch Master Plan

Status: Draft operativo
Owner: Produto / Engenharia / Growth
Data-base: 2026-09-05

## Objetivo
Lançar o Ponto G com qualidade de produto, segurança, performance, UX, operação e aquisição suficientes para suportar usuários reais sem depender de correções emergenciais pós-lançamento.

## Princípios de lançamento
1. Segurança e privacidade como gate de release, não como backlog posterior.
2. Beta fechado antes de qualquer aquisição agressiva.
3. UX mobile-first, com foco em descoberta, confiança, comunicação e segurança do usuário.
4. Observabilidade antes de escala.
5. Cada nova feature precisa ter owner, métrica, evento de analytics e critério de aceite.
6. Produção só recebe código vindo de preview validado.

## Fase 0 — Contenção e baseline
Objetivo: eliminar riscos P0/P1 e criar baseline confiável.

### Segurança
- [ ] Resolver Issue #1 integralmente nos P0.
- [ ] Revogar RPCs SECURITY DEFINER expostas indevidamente.
- [ ] Separar perfil público de atributos privados/sensíveis.
- [ ] Fechar Storage público com mutação anônima.
- [ ] Fechar tabelas financeiras/B2B para anon.
- [ ] Remover fallback de credencial admin.
- [ ] Revisar grants, schemas expostos e Data API.
- [ ] Revisar check-ins/localização para minimizar rastreamento.
- [ ] Hardening de álbuns privados + signed URLs.

### Backend
- [ ] Middleware único requireUser().
- [ ] Camada authorize(resource, action).
- [ ] Rate limit para auth, admin, push, mensagens e criação de conteúdo.
- [ ] Idempotência para pagamentos/webhooks.
- [ ] Operações financeiras atômicas/transacionais.
- [ ] Padronizar erros sem vazar stack/segredos.

### Infra
- [ ] Branch protection em main.
- [ ] Preview obrigatório para PR.
- [ ] Checklist de smoke test antes de promote.
- [ ] Rollback documentado e testado.
- [ ] Secrets separados por Development / Preview / Production.

Gate: nenhum P0 aberto; nenhuma superfície sensível pública; rollback testado.

## Fase 1 — Produto essencial
Objetivo: definir o que realmente entra no lançamento e congelar escopo.

### Core do lançamento
- [ ] Cadastro/login/recuperação de conta.
- [ ] Onboarding curto e progressivo.
- [ ] Perfil público e controles de privacidade.
- [ ] Descoberta por pessoas/mapa sem exposição de localização exata.
- [ ] Favoritos/conexões/winks conforme regra final.
- [ ] Chat 1:1 estável.
- [ ] Bloquear/reportar usuário.
- [ ] Álbuns privados com consentimento explícito.
- [ ] Comunidades/Agora apenas se estabilidade for comprovada.
- [ ] Check-in em locais com opt-in e expiração clara.
- [ ] Push notification com preferências do usuário.
- [ ] Exclusão de conta e dados.

### Não-core / pós-lançamento
Features experimentais, gamificação excessiva, novos formatos sociais, monetização complexa e integrações secundárias devem ficar fora do launch scope se ameaçarem estabilidade.

Gate: escopo congelado, fluxos E2E definidos e critérios de aceite por feature.

## Fase 2 — UX/UI e Design System
Objetivo: tornar o app intuitivo, consistente, acessível e confiável.

### Design System
- [ ] Tokens de cor, tipografia, spacing, radius, elevation e motion.
- [ ] Estados padrão: loading, empty, error, disabled, success, offline.
- [ ] Componentes únicos para botão, input, modal, sheet, toast, avatar, card e skeleton.
- [ ] Contraste WCAG e tamanho mínimo de toque.
- [ ] Dark mode consistente se fizer parte do produto final.

### Jornadas prioritárias
- [ ] Primeiro acesso em menos de 3 minutos.
- [ ] Editar perfil sem formulários gigantes.
- [ ] Descoberta → perfil → interação em poucos toques.
- [ ] Conversa → álbum privado com consentimento compreensível.
- [ ] Bloquear/reportar sempre acessível.
- [ ] Voltar/fechar modal previsível em Android/PWA.
- [ ] Feedback imediato para ações assíncronas.

### Trust & Safety UX
- [ ] Explicar claramente visibilidade de localização/check-in.
- [ ] Controles de quem pode ver/contatar.
- [ ] Confirmação antes de compartilhar conteúdo privado.
- [ ] Status de denúncia e bloqueio sem ambiguidade.
- [ ] Linguagem não culpabilizante em erros e segurança.

Gate: testes moderados com usuários + zero fluxo crítico sem empty/loading/error state.

## Fase 3 — Performance e Realtime
Objetivo: experiência rápida em dispositivos móveis reais.

### Frontend
- [ ] Bundle audit e lazy loading por rota/feature.
- [ ] Virtualização/infinite scroll onde necessário.
- [ ] Compressão e resize de imagens/vídeos.
- [ ] Skeletons no lugar de telas bloqueadas.
- [ ] Remover renderizações e subscriptions redundantes.

### Supabase
- [ ] Consolidar policies duplicadas.
- [ ] Corrigir auth_rls_initplan.
- [ ] Adicionar índices de FK baseados em queries reais.
- [ ] Revisar índices duplicados/obsoletos.
- [ ] Auditar Realtime por tabela/evento; não assinar tudo.
- [ ] Paginação server-side em feeds e listas.

### Metas iniciais
- p75 LCP mobile <= 2.5s nas telas públicas/principais.
- Interação primária perceptível < 200ms quando local.
- API p95 objetivo <= 500ms para fluxos comuns, excluindo terceiros.
- Erro de frontend < 1% das sessões no beta.

Gate: teste em 4G/dispositivo intermediário e carga controlada do backend.

## Fase 4 — Trust, Safety, Compliance e Privacidade
Objetivo: reduzir risco humano, jurídico e reputacional.

- [ ] Política de privacidade clara.
- [ ] Termos de uso.
- [ ] Consentimentos separados para dados sensíveis e localização.
- [ ] Política de retenção e exclusão.
- [ ] Fluxo de exportação/exclusão de conta.
- [ ] Canal de denúncia e resposta operacional.
- [ ] Regras para conteúdo proibido e abuso.
- [ ] Processo de ban/suspensão/apelação.
- [ ] Auditoria administrativa registrada.
- [ ] Plano de incidente e vazamento.
- [ ] Matriz de acesso interno mínimo necessário.

Gate: nenhum dado sensível coletado sem finalidade, controle de acesso e política de retenção.

## Fase 5 — Monetização
Objetivo: validar receita sem contaminar o core.

- [ ] Definir Free vs Premium.
- [ ] Paywall simples e transparente.
- [ ] Restaurar/verificar assinatura.
- [ ] Webhook idempotente.
- [ ] Entitlements derivados do servidor.
- [ ] Métricas de conversão, churn e falhas de pagamento.

Regra: não lançar múltiplos tiers complexos antes de validar disposição a pagar.

## Fase 6 — Parcerias e distribuição
Objetivo: adquirir usuários com densidade local, não downloads espalhados.

### Prioridade
1. Bares, clubs, festas e eventos LGBTQIA+.
2. Organizadores/produtores e coletivos locais.
3. Criadores de conteúdo e microinfluenciadores com comunidade real.
4. ONGs/projetos de saúde e prevenção para ações educativas, sem usar dados privados para segmentação.
5. Marcas e negócios alinhados ao público para benefícios patrocinados no futuro.

### Modelo de parceria inicial
- QR/landing exclusiva por parceiro.
- Perfil/local verificado.
- Evento/check-in oficial.
- Benefício para primeiros usuários.
- Métricas de aquisição agregadas, nunca dados sensíveis individuais.

Gate: pelo menos 3 parceiros-âncora na cidade-piloto antes do beta aberto.

## Fase 7 — Analytics e observabilidade
Objetivo: saber o que acontece sem invadir privacidade.

### Eventos mínimos
- signup_started / signup_completed
- onboarding_completed
- profile_completed
- discovery_viewed
- profile_viewed
- connection_started
- conversation_started
- message_sent
- album_access_requested / granted
- report_created
- subscription_started / converted / failed

### Métricas norte
- Activation: usuário completa perfil + primeira interação relevante.
- D1/D7 retention.
- Conversas iniciadas por usuário ativo.
- Taxa de resposta.
- Reports por 1.000 usuários ativos.
- Crash/error-free sessions.
- Tempo de resposta de denúncia.

Gate: dashboard mínimo disponível antes do beta fechado.

## Fase 8 — Beta fechado
Objetivo: validar comportamento real com risco controlado.

### Cohort inicial
50–150 usuários convidados em uma única cidade/região.

### Testes
- [ ] Auth e recuperação.
- [ ] Onboarding.
- [ ] Discovery/mapa.
- [ ] Chat/push/realtime.
- [ ] Álbuns privados.
- [ ] Bloqueio/denúncia.
- [ ] Check-in.
- [ ] Pagamento sandbox + produção controlada.
- [ ] Exclusão de conta.

### Saída do beta fechado
- 0 P0.
- P1 apenas com workaround aceitável e owner definido.
- D7 e activation mensuráveis.
- Suporte consegue resolver incidentes.
- Nenhum padrão grave de abuso sem resposta.

## Fase 9 — Beta público local
Objetivo: criar densidade em uma cidade antes de expandir.

- [ ] Landing/waitlist.
- [ ] Programa de convite/referral controlado.
- [ ] Parcerias locais ativas.
- [ ] Eventos de lançamento.
- [ ] Conteúdo social orgânico.
- [ ] Monitoramento diário de segurança, reports, erro e retenção.

Gate: densidade e retenção suficientes para que descoberta/chat não pareçam vazios.

## Fase 10 — Launch Candidate
- [ ] Feature freeze.
- [ ] Security regression completa.
- [ ] Dependency audit.
- [ ] Backup/restore testado.
- [ ] Disaster recovery walkthrough.
- [ ] Teste de carga.
- [ ] Teste E2E em mobile real.
- [ ] Smoke test de preview.
- [ ] Promote do build validado, sem rebuild surpresa.
- [ ] Rollback candidate confirmado.

## Fase 11 — Lançamento
### D-7
- Congelamento de features.
- Apenas fixes P0/P1.
- Conferência de parceiros e suporte.

### D-1
- Backup.
- Smoke E2E final.
- Status page/canais operacionais prontos.
- Checklist de rollback.

### D0
- Promote do release candidate validado.
- Monitorar auth, API, DB, realtime, pagamentos, crashes e reports.
- Evitar deploys cosméticos.

### D+1 a D+7
- Daily launch review.
- Correções priorizadas por impacto.
- Sem novas features até estabilização.

## Workstreams
### A. Security & Privacy — prioridade máxima
Owner: Engenharia/backend
Gate de lançamento: obrigatório.

### B. Core Product
Owner: Produto + Engenharia
Gate: jornadas essenciais funcionando E2E.

### C. UX/UI & Design System
Owner: Design + Frontend
Gate: consistência, acessibilidade e confiança.

### D. Performance & Reliability
Owner: Engenharia
Gate: SLOs e rollback.

### E. Trust & Safety
Owner: Produto/Operações
Gate: bloqueio, denúncia e resposta operacional.

### F. Growth & Partnerships
Owner: Growth/Founder
Gate: densidade local e parceiros-âncora.

### G. Monetization
Owner: Produto/backend
Gate: pagamentos seguros e idempotentes.

### H. Analytics & Operations
Owner: Produto/Engenharia
Gate: visibilidade dos KPIs e incidentes.

## Regra de decisão
Se uma feature nova ameaçar segurança, estabilidade, tempo de lançamento ou clareza do produto, ela vai para pós-lançamento. O lançamento é do **produto confiável**, não do backlog inteiro.
