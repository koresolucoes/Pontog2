# App Shell 2.0 — Validation checklist

## Automated
- [ ] Architecture typecheck
- [ ] Application build

## Navigation
- [ ] Explorar abre Home/Discovery
- [ ] Mapa mantém a experiência Leaflet acessível
- [ ] Agora abre o feed Agora
- [ ] Conversas preserva badge de não lidas
- [ ] Você usa o avatar e abre o perfil
- [ ] Avatar da Context Bar abre a Central da Conta

## Mobile / PWA
- [ ] Bottom safe-area respeitada
- [ ] Top safe-area respeitada
- [ ] Dock não cobre composer/chat ou modais críticos
- [ ] Dock é ocultado durante chat e fluxos full-screen já identificados

## Accessibility
- [ ] `aria-label` em ações icon-only
- [ ] `aria-current` no destino ativo
- [ ] focus ring perceptível
- [ ] ações principais >= 44px

## Visual follow-up
A validação visual em browser real deve ser executada quando houver um deployment/preview que realmente rode o build. Status verde de Vercel com Ignored Build Step não conta como smoke test visual.
