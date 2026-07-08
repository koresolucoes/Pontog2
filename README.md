# Ponto G - Plataforma de Encontros e Estilo de Vida Gay

O **Ponto G** é uma plataforma inovadora, rápida, direta e discreta desenvolvida para a comunidade gay moderna. Focada em conexões reais baseadas em proximidade geográfica e interesses imediatos, a plataforma funciona como um Progressive Web App (PWA) de alto desempenho, oferecendo uma experiência fluida de aplicativo nativo diretamente no navegador.

---

## 🚀 Funcionalidades do Sistema

### 1. Conexões e Interação em Tempo Real
*   **Modo Agora (Instant Now 🔥)**: Uma área de encontros relâmpago. O usuário ativa o modo publicando uma foto e descrevendo o que busca no momento. O post fica ativo no topo por exatamente **1 hora (60 minutos)**, ideal para interações imediatas ("quem quer agora").
*   **Mensagens Diretas (Real-time Chat)**: Canal de comunicação integrado com suporte a mensagens em tempo real (Supabase Realtime) e indicador de digitação.
*   **Winks (Piscadelas 😉)**: Envio de interações rápidas para demonstrar interesse sem a necessidade de iniciar um chat de imediato.
*   **Mídia Temporária (View Once Photo)**: Envio de fotos de visualização única no chat privado que se autodestróem após serem abertas, garantindo máxima privacidade.

### 2. Geolocalização e Guia de Hotspots
*   **Mapa Interativo (baseado em Leaflet)**: Exibe estabelecimentos parceiros e de interesse da comunidade (saunas, bares, cinemas, pontos de cruising, clubes).
*   **Check-in e Presença**: Usuários podem fazer check-in nos locais e outros usuários conseguem ver quem está presente no momento (para locais parceiros/vetted).
*   **Modo Viajante (Travel Mode ✈️)**: Permite que usuários simulem localização em qualquer cidade do mundo para explorar a cena gay local antes mesmo de viajar.
*   **Rotas e Distâncias**: Cálculo de rotas e distâncias reais em quilômetros até os pontos de encontro.

### 3. Comunidade e Conteúdo
*   **Comunidades Temáticas**: Fórum de discussões com feeds de posts de acordo com tribos (Ursinhos, Geeks, Discretos, Twinks, etc.), permitindo curtidas e comentários.
*   **Vídeos (Reels / Shorts)**: Aba dedicada ao compartilhamento e reprodução de vídeos curtos para engajamento da comunidade.
*   **G News & Blog**: Feed integrado de notícias globais, artigos editoriais e dicas de estilo de vida, saúde e cultura pop LGBT.

### 4. Privacidade e Segurança de Elite
*   **Álbuns Privados (Private Galleries)**: Fotos mais reservadas podem ser guardadas em álbuns protegidos por senha ou chave de acesso. Outros usuários devem enviar uma solicitação de acesso para visualizá-las.
*   **Verificação Facial por Biometria (Selo Azul)**: Utiliza `face-api.js` para capturar a biometria facial em tempo real no dispositivo e o modelo **Gemini** para validar a foto de perfil com a selfie, atribuindo o selo de verificação azul para perfis autênticos.
*   **Moderação e Denúncias**: Ferramentas robustas para reportar perfis falsos, abusos ou conteúdo impróprio, com bloqueio mútuo instantâneo.

### 5. Monetização e Fidelização
*   **Planos Premium (Ponto G Plus / VIP)**: Assinaturas mensais para desbloquear recursos como filtros avançados (busca por tribos, idade, somente ativos agora), Modo Viajante e navegação sem anúncios.
*   **Doações & Apoio**: Integração com MercadoPago para recebimento de doações que apoiam a manutenção dos servidores.
*   **Anúncios Integrados**: Exibição de anúncios contextualizados (AdSense e parcerias locais) para monetização de usuários free.

### 6. Painéis de Controle Dedicados

#### 🛠️ Painel de Administração (`/admin`)
Painel completo de controle operacional da plataforma:
*   **Dashboard Executivo**: Métricas chave em tempo real (usuários ativos, novas assinaturas, faturamento, denúncias pendentes).
*   **Gestão de Usuários e Moderadores**: Ativação, suspensão ou banimento de contas, e controle de selos de verificação.
*   **Controle de Assinaturas e Planos**: Concessão manual de acesso Premium e auditoria de pagamentos via MercadoPago.
*   **Auditoria e Segurança (Audit Logs)**: Registro imutável de todas as ações administrativas para máxima conformidade.
*   **Segurança MFA (TOTP)**: Configuração de autenticação multifator para acesso à conta de administrador.

#### 🏢 Painel do Proprietário de Estabelecimento (`/owner`)
Ferramenta para donos de locais físicos parceiros (saunas, bares, etc.):
*   **Reivindicação de Locais (Claims)**: Permite que donos reais reivindiquem o controle do seu ponto no mapa.
*   **Estatísticas do Local**: Gráficos de visitas, check-ins e engajamento da comunidade com o estabelecimento.
*   **Promoções Push Georeferenciadas**: Disparo de campanhas promocionais em tempo real (ex: "Double Chopp nos próximos 30 minutos!") enviadas diretamente via notificação push para todos os usuários que estão em um raio próximo.

---

## 🛠️ Tecnologias Utilizadas

O ecossistema do Ponto G foi projetado com uma stack moderna de alto desempenho:

| Categoria | Tecnologia / Biblioteca | Descrição |
| :--- | :--- | :--- |
| **Frontend Core** | `React 19` + `TypeScript` | Base da aplicação com renderização eficiente de componentes declarativos. |
| **Ferramenta de Build**| `Vite` | Setup de desenvolvimento ágil e empacotamento otimizado para produção. |
| **Estilização** | `Tailwind CSS` | Estilização por classes utilitárias para um design responsivo, leve e customizado. |
| **Animações** | `Motion` (Framer Motion) | Micro-interações sofisticadas e transições de tela altamente fluídas. |
| **Estado Global** | `Zustand` | Gerenciamento de estado leve, rápido e de baixíssima sobrecarga. |
| **Banco de Dados & Realtime** | `Supabase` (PostgreSQL) | Armazenamento de dados relacionais com subscrições websocket para chat e geolocalização. |
| **Autenticação** | `Supabase Auth` | Fluxo seguro de registro, login e validação de tokens JWT. |
| **Inteligência Artificial** | `@google/genai` (Gemini API) | Moderação automática de posts, textos e assistência na verificação de identidade. |
| **Biometria Facial** | `face-api.js` | Detecção e análise facial diretamente no browser para verificação de perfil. |
| **Mapas** | `Leaflet` + `OpenStreetMap` | Renderização do mapa de hotspots com customização de marcadores e rotas. |
| **Virtualização** | `@tanstack/react-virtual` | Virtualização de listas longas (feeds e chats) para excelente performance em mobile. |
| **Notificações Push** | `Service Workers` + `Web Push` | Notificações push nativas enviadas do servidor mesmo com o app fechado. |
| **Internacionalização** | `i18next` + `react-i18next` | Tradução dinâmica e contextualizada para Português, Inglês e Espanhol. |
| **Pagamentos** | `MercadoPago SDK` | Integração completa com checkout para assinaturas recorrentes e doações. |

---

## 📲 Como Instalar (Progressive Web App - PWA)

Como o Ponto G é um PWA completo:
1.  Acesse a plataforma pelo navegador do celular.
2.  Um botão **"Instalar App"** estará disponível no menu superior/perfil ou através de um banner popup inferior.
3.  No iOS, clique no botão "Compartilhar" do Safari e selecione **"Adicionar à Tela de Início"**.
4.  No Android, basta clicar no banner de instalação automática.
