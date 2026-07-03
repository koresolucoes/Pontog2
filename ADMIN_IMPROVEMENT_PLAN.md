# Plano de Melhoria do Painel Administrativo - Ponto G
Este documento estabelece um plano estratégico detalhado de funcionalidades e segurança para o painel de administração do **Ponto G**, com base nas práticas mais modernas do mercado de SaaS, redes de relacionamento e plataformas de geolocalização.

---

## 📋 Sumário Executivo
O atual painel do **Ponto G** possui uma base funcional excelente, com controle de usuários, denúncias, locais, planos e notícias. No entanto, para escalar com segurança e eficiência operacional, precisamos migrar de uma estrutura de chave única de acesso para um ecossistema multi-administrador seguro, auxiliado por automações com inteligência artificial e visualizações de dados interativas.

Este plano está dividido em **4 Pilares Estratégicos**:
1. **Segurança e Proteção de Dados (Hardening)**
2. **Automação e Moderação Inteligente (IA & UX)**
3. **Business Intelligence e Métricas Avançadas (Analytics)**
4. **Controle Dinâmico do Aplicativo (Feature Flags & Configurações)**

---

## 🛡️ Pilar 1: Segurança & Infraestrutura de Acesso (Hardening)

Atualmente, o login do admin é realizado comparando uma chave estática `ADMIN_API_KEY` enviada pelo usuário e armazenando o token JWT correspondente no `localStorage` do navegador. Isso apresenta riscos de vazamento por ataques Cross-Site Scripting (XSS), falta de auditoria individual e ausência de granularidade de acesso.

### 1.1 Autenticação Multi-Administrador e RBAC (Role-Based Access Control)
*   **Problema:** Uma única chave mestre limita a rastreabilidade das ações de moderação.
*   **Solução:** Substituir a chave única por contas individuais para cada administrador, salvas em banco de dados (`admins`) com senhas criptografadas por `bcrypt`.
*   **Níveis de Acesso (Roles):**
    *   `Owner` (Dono): Acesso total, incluindo gerenciamento de outros administradores e faturamento.
    *   `Moderador`: Visualização de usuários, resposta a denúncias, aprovação de fotos e moderação de fotos de álbuns.
    *   `Suporte`: Visualização de perfis para suporte técnico, edição limitada e redefinição de status.
    *   `Financeiro`: Acesso restrito a relatórios de receita, faturamento, planos e MercadoPago webhooks.

### 1.2 Sessões Seguras via Cookies HttpOnly
*   **Problema:** Tokens armazenados no `localStorage` (via Zustand) estão expostos a roubo caso ocorra qualquer vulnerabilidade XSS no cliente.
*   **Solução:** Migrar a autenticação para **Cookies HttpOnly, Secure e SameSite=Strict**.
    *   O token JWT deixa de ser acessível via JavaScript (`document.cookie`), impedindo o roubo automático de sessões.

### 1.3 Registro de Auditoria (Audit Logs / Trilha de Ações)
*   **Problema:** Sem saber quem baniu um usuário ou concedeu uma assinatura Plus gratuitamente, a operação fica vulnerável a abusos internos.
*   **Solução:** Criar a tabela `admin_audit_logs`. Cada ação crítica executada no painel de administração será gravada de forma imutável:
    *   **Estrutura do Log:** `ID_Log`, `Admin_ID`, `Ação` (ex: "BAN_USER", "GRANT_PLUS"), `Alvo` (ex: ID do usuário afetado), `Justificativa`, `Endereço_IP`, `Data/Hora`.

### 1.4 Rate Limiting & Proteção contra Brute Force
*   **Solução:** Implementar limitação de taxa (Rate Limiting) no endpoint `/api/admin-login` usando um mecanismo de armazenamento em memória ou Redis.
    *   Bloquear tentativas consecutivas de IP por 15 minutos após 5 erros seguidos de login.

### 1.5 Autenticação de Dois Fatores (2FA) opcional
*   **Solução:** Implementar autenticação via TOTP (Google Authenticator / Authy) para contas de nível `Owner`, obrigando o envio do token temporário no login.

---

## 🤖 Pilar 2: Automação e Moderação Inteligente (IA & UX)

A moderação manual de perfis, fotos e denúncias torna-se impraticável à medida que a base de usuários cresce. Utilizaremos automação de interface e IA para tornar o processo extremamente ágil.

### 2.1 Central Inteligente de Moderação de Perfis e Fotos (Fila Rápida)
*   **Funcionalidade:** Uma tela inspirada no estilo "Tinder" de aprovação rápida de selfies e fotos de álbuns de usuários solicitando selo de verificado.
*   **UX Otimizada:** Atalhos de teclado (ex: `A` para Aprovar, `R` para Rejeitar e passar para o próximo da fila) com pré-visualização em alta resolução da selfie de verificação lado a lado com as fotos de perfil existentes.

### 2.2 Moderação Assistida por IA (Gemini Integration)
*   **Funcionalidade:** Quando uma denúncia é criada (seja por comportamento abusivo, spam, conteúdo adulto inadequado no fórum ou imagens inadequadas), o **Gemini API** será acionado em segundo plano para:
    *   **Análise de Imagens:** Avaliar se fotos enviadas para o fórum público violam os termos de uso (nudez explícita, violência).
    *   **Resumo de Denúncias:** O Gemini analisa o histórico de mensagens trocadas ou denúncias consecutivas e gera uma "Sugestão de Ação" consolidada (ex: *"Este usuário foi denunciado 3 vezes por assédio em chats privados; as conversas indicam violação da política de respeito. Recomendação: Banimento imediato"*).
    *   **Análise de Sentimento/Comportamento:** Classificar as denúncias por ordem de gravidade de forma inteligente para que o administrador priorize denúncias de assédio severo em relação a denúncias de spam leve.

### 2.3 Gerenciador Global de Mídias
*   **Funcionalidade:** Um painel visual centralizado onde o administrador visualiza todas as últimas fotos e vídeos enviados pelos usuários em tempo real (no feed do Agora, comunidades e fotos de visualização única enviadas no chat).
*   **Ação Rápida:** Deleção direta de mídia e suspensão do perfil associado com um único clique.

---

## 📊 Pilar 3: Business Intelligence & Análises Interativas (Analytics)

Atualmente, o dashboard mostra estatísticas agregadas cruciais (total de usuários, receita e assinantes), mas não permite a análise histórica de tendências para a tomada de decisões de negócios.

### 3.1 Gráficos Interativos de Linha do Tempo (Time-Series)
*   **Funcionalidade:** Gráficos interativos (utilizando a biblioteca **Recharts** que já pode ser integrada ao Vite) mostrando:
    *   **Crescimento de Usuários:** Filtro diário, semanal ou mensal de novos registros para avaliar o impacto de campanhas.
    *   **Usuários Ativos Diários e Mensais (DAU / MAU):** Acompanhamento real de engajamento da rede social.
    *   **Curva de Faturamento:** Gráfico de linha comparando receitas brutas diárias e mensais recebidas via MercadoPago e doações.

### 3.2 Análise Financeira e Gestão de Churn
*   **Funcionalidade:**
    *   **Receita Recorrente Mensal (MRR):** Projeção de faturamento com base em assinaturas ativas.
    *   **Taxa de Churn (Cancelamento):** Porcentagem de usuários que cancelam a assinatura Plus no período de 30 dias.
    *   **Exportação de Dados:** Botões para download de relatórios financeiros detalhados de transações nos formatos **CSV** e **PDF**.

### 3.3 Mapa de Calor de Geolocalização (Geo-Analytics)
*   **Funcionalidade:** Um mapa interativo utilizando a API de mapas para renderizar um mapa de calor das coordenadas de conexões ativas de usuários e locais parceiros.
    *   Facilita identificar em quais cidades ou regiões o aplicativo é mais utilizado para direcionar campanhas de tráfego pago e parcerias com Venues (Locais).

---

## ⚙️ Pilar 4: Controle Dinâmico do Aplicativo (Feature Flags & Configurações)

Evita a necessidade de atualizar o código-fonte ou realizar novos deploys para realizar ajustes operacionais simples no aplicativo.

### 4.1 Painel de Controle de Feature Flags (Chaves de Recurso)
*   **Funcionalidade:** Botões liga/desliga para ativar ou desativar recursos em tempo real para toda a base ou apenas para não-assinantes:
    *   Desativar temporariamente chats ou chamadas se houver instabilidade no serviço de infraestrutura.
    *   Ativar/Desativar eventos especiais (ex: "Modo Viagem Grátis" em finais de semana ou feriados).

### 4.2 Gerenciador Dinâmico de Monetização & Anúncios (AdManager)
*   **Funcionalidade:** Ajustar dinamicamente as configurações de anúncios e preços diretamente pelo Painel de Administração:
    *   **Frequência de Anúncios:** Configurar de quantos em quantos minutos ou ações um anúncio intersticial ou banner (`AdBanner`, `AdSenseUnit`) é exibido para usuários grátis.
    *   **Tabela de Preços:** Modificar o valor das assinaturas mensais, semestrais ou anuais que serão refletidas diretamente no fluxo de pagamento do MercadoPago.

### 4.3 Gestor Dinâmico de Locais Parceiros (Venues)
*   **Funcionalidade:** Controle completo sobre as sugestões de locais enviadas pelos usuários:
    *   Aprovar sugestões pendentes de locais com preenchimento assistido por autocompletar do Google Places.
    *   Destacar locais patrocinados no topo do mapa e da lista de busca por um período determinado.

---

## 🛠️ Arquitetura Técnica & Banco de Dados Proposto

Para implementar essas melhorias sem desestabilizar o banco atual, propomos a adição estruturada de tabelas e endpoints complementares:

### 💾 Novas Tabelas Propostas no Supabase (Drizzle/SQL)

```sql
-- Tabela de administradores individuais (Substitui o ADMIN_API_KEY estático)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'moderator', -- 'owner', 'moderator', 'financial', 'support'
    mfa_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trilha de Auditoria (Audit Logs) para rastreio total de ações
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'BAN_USER', 'APPROVE_PHOTO', 'UPDATE_PLAN_PRICE', etc.
    target_id VARCHAR(255), -- ID do usuário, local ou plano afetado
    details TEXT, -- Descrição detalhada da alteração ou justificativa
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações Dinâmicas (Feature Flags e Configurações de Monetização)
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES admins(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 🛣️ Estrutura de Endpoints de API Modificados/Novos

O diretório `/api/admin` será expandido seguindo os seguintes padrões RESTful:

| Endpoint | Método | Função | Nível Mínimo de Acesso |
| :--- | :--- | :--- | :--- |
| `/api/admin/login` | `POST` | Autentica individualmente um admin e define o cookie HTTP-Only. | Livre |
| `/api/admin/logout` | `POST` | Invalida a sessão do admin limpando o cookie seguro. | Livre |
| `/api/admin/audit-logs` | `GET` | Recupera as ações de auditoria gravadas na base. | `Owner` |
| `/api/admin/moderation/queue`| `GET` | Retorna usuários aguardando verificação de selfie/foto de perfil. | `Moderador` |
| `/api/admin/moderation/ai-verify`| `POST` | Aciona o Gemini para classificar denúncia ou imagem. | `Moderador` |
| `/api/admin/settings` | `GET/PUT`| Visualiza e atualiza Feature Flags, preço de planos e intervalos de anúncios.| `Owner` |
| `/api/admin/analytics/time-series`| `GET`| Retorna dados de crescimento de usuários e receitas agregados por data.| `Financial` ou `Owner` |

---

## 📈 Cronograma Sugerido de Implementação

Propomos uma implementação em fases para garantir testes de qualidade em ambiente de desenvolvimento antes de subir para produção:

```
[Fase 1: Infraestrutura de Segurança] ────► [Fase 2: IA & Central de Moderação] ────► [Fase 3: Analytics & BI] ────► [Fase 4: Configurações Dinâmicas]
- Criação das tabelas admins/logs           - Fila rápida de fotos (UX)                  - Integração com Recharts       - Sistema de Feature Flags
- Login individual e cookies HTTP-Only     - Integração Gemini API para denúncias       - Exportação de dados (CSV)     - Editor dinâmico de anúncios
- Trilha de auditoria em APIs              - Painel global de mídias                    - Mapa de Calor de acessos      - Gerenciador de preços e locais
```

---
*Este plano de melhorias visa transformar o painel administrativo do Ponto G em um ecossistema operacional de nível empresarial, garantindo conformidade com regras rígidas de segurança (LGPD/GDPR), simplificando a rotina da equipe de suporte e fornecendo inteligência para a tomada de decisões de negócios.*
