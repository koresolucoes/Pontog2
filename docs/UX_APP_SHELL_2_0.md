# Ponto G — App Shell 2.0

## Mensagem central

**Perto. Agora. Conectados.**

A navegação do Ponto G deve comunicar uma cidade viva ao redor da pessoa usuária: descobrir quem está perto, enxergar o contexto local, perceber quem está disponível agora e transformar presença em conexão.

## Pulse Dock

Navegação primária:

1. **Explorar** — descoberta de pessoas e lugares.
2. **Mapa** — contexto geográfico e atividade local.
3. **Agora** — intenção e disponibilidade em tempo real; é o pulso visual central do app.
4. **Conversas** — conexões e continuidade.
5. **Você** — identidade, presença e conta.

### Regras visuais

- O dock é uma superfície OLED translúcida, não uma barra retangular de sistema.
- `Agora` emerge do centro e utiliza exclusivamente o Pulse Pink / Purple da marca.
- Labels aparecem no item ativo para reduzir carga cognitiva sem poluir a navegação.
- Conversas usa badge discreto, sem animação permanente.
- Você usa o avatar real, não um ícone genérico.
- Safe areas de iOS/Android/PWA são parte do componente.
- Focus ring e `aria-current` fazem parte do contrato de acessibilidade.

## Context Bar

A barra superior deixa de ser um hamburger global. Cada destino principal comunica seu contexto:

- Explorar → “Perto de você”
- Mapa → “Radar local”
- Agora → “Pulso ao vivo”
- Conversas → “Conexões”
- Você → “Sua presença”

O avatar no canto superior abre a Central da Conta/Sidebar. O sidebar deixa de ser a navegação primária do produto.

## Linguagem de estado

- **Neutro:** exploração — preto, branco, cinza.
- **Presença:** online — verde controlado.
- **Agora:** intenção — Pulse Pink + movimento semântico.
- **Premium/comercial:** dourado somente quando necessário.

## Motion

- Pulse = algo vivo/agora.
- Scale = interação.
- Slide = navegação.
- Glow = prioridade.
- Skeleton = carregamento.

Movimento decorativo permanente deve ser evitado.

## Rollback

Esta entrega é isolada na branch `ux/01b-pulse-dock`. O rollback pode ser feito revertendo o PR correspondente sem alterar regras de negócio, schema ou RLS.
