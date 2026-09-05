# Ponto G — Launch Checklist

Use junto com `docs/LAUNCH_MASTER_PLAN.md`.

## Go/No-Go obrigatório
- [ ] Issue #1 sem P0 aberto.
- [ ] Perfil público não expõe dados sensíveis/localização exata.
- [ ] Storage privado realmente privado.
- [ ] Admin sem credenciais fallback.
- [ ] Pagamentos idempotentes e ledger server-only.
- [ ] Bloqueio, denúncia e exclusão de conta funcionando E2E.
- [ ] Preview validado antes de produção.
- [ ] Rollback testado.
- [ ] Backup/restore testado.
- [ ] Dashboard de erros, latência, auth e negócio ativo.
- [ ] Beta fechado concluído.
- [ ] Parceiros-âncora ativos na cidade-piloto.
- [ ] Feature freeze respeitado.

## KPI gates sugeridos para avançar do beta
- Activation >= 50% dos novos usuários convidados.
- Error-free sessions >= 99% no período de validação.
- API p95 dos fluxos principais <= 500 ms, excluindo terceiros.
- Zero incidente P0 de privacidade/segurança.
- Reports críticos com SLA operacional definido e testado.
- Retenção D7 medida e suficiente para sustentar a cidade-piloto antes de escalar aquisição.

## Definição de Done de uma feature de lançamento
- [ ] Regra de negócio definida.
- [ ] Permissões/autorização definidas.
- [ ] Estados loading/empty/error/success.
- [ ] Responsivo/mobile real.
- [ ] Analytics/eventos.
- [ ] Teste E2E.
- [ ] Teste de abuso/edge case.
- [ ] Documentação atualizada.
