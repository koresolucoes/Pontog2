# Ponto G — Roadmap de Lançamento

## Sequência executiva

### Sprint 0 — Segurança e contenção
- Fechar todos os P0 da Issue #1.
- Separar superfície pública e privada de perfil.
- Corrigir Storage, RPCs privilegiadas, B2B, payments e admin auth.
- Criar middleware central de autenticação/autorização.

### Sprint 1 — Core product freeze
- Confirmar funcionalidades obrigatórias de lançamento.
- Remover/deferir features experimentais de alto risco.
- Completar jornadas críticas E2E.

### Sprint 2 — UX/UI pass
- Consolidar design system.
- Revisar onboarding, discovery, perfil, chat, álbuns, check-in e trust & safety.
- Cobrir loading/empty/error/offline.

### Sprint 3 — Performance/realtime
- Bundle, lazy loading, media pipeline e renderização.
- Consolidar RLS/policies e índices.
- Revisar todas as subscriptions realtime.
- Rodar testes em rede móvel e aparelhos intermediários.

### Sprint 4 — Trust, safety e compliance
- Denúncia, bloqueio, ban, apelação e moderação.
- Privacidade, termos, consentimentos, retenção e exclusão.
- Incident response e auditoria administrativa.

### Sprint 5 — Monetização e analytics
- Free/Premium simples.
- Pagamentos idempotentes.
- Eventos, funil, activation, retention, reports e error monitoring.

### Sprint 6 — Beta fechado
- 50–150 usuários convidados.
- Uma região/cidade.
- Operação diária de feedback, erros, segurança e suporte.

### Sprint 7 — Beta público local
- Parcerias locais e aquisição concentrada.
- Referral controlado.
- Validar densidade e retenção antes de escalar.

### Sprint 8 — Release Candidate
- Feature freeze.
- Security regression.
- Load test.
- Backup/restore e rollback testados.
- Preview homologado.

### Sprint 9 — Launch
- Promote do release candidate validado.
- War room de 7 dias.
- Apenas fixes P0/P1 durante estabilização.

## Dependências críticas
Security → Core Product → UX → Performance → Trust & Safety → Analytics → Beta → RC → Launch.

Growth e parcerias podem avançar em paralelo, mas aquisição ampla só começa após o beta fechado.
