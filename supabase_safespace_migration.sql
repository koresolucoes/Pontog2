-- =====================================================================
-- MIGRATION: SISTEMA DE ESPAÇO SEGURO (SAFE SPACE) & AVALIAÇÕES LGBTQ+
-- =====================================================================
-- Esta migração cria a tabela de avaliações de segurança, índices de
-- performance e políticas de Row Level Security (RLS) para o Supabase.

-- 1. Criação da tabela de avaliações de segurança
CREATE TABLE IF NOT EXISTS public.venue_safety_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id UUID NOT NULL, -- ID do local (referenciando a tabela venues)
    user_id UUID NOT NULL,  -- ID do usuário (referenciando auth.users ou profiles)
    staff_respect INT NOT NULL CHECK (staff_respect >= 1 AND staff_respect <= 5),
    inclusive_bathrooms BOOLEAN NOT NULL DEFAULT FALSE,
    safety_assistance INT NOT NULL CHECK (safety_assistance >= 1 AND safety_assistance <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Restrição de unicidade para garantir que cada usuário avalie um local apenas uma vez (com upsert)
    CONSTRAINT unique_venue_user_safety UNIQUE (venue_id, user_id)
);

-- 2. Índices de performance para busca rápida por local
CREATE INDEX IF NOT EXISTS idx_venue_safety_reviews_venue_id 
ON public.venue_safety_reviews(venue_id);

-- 3. Habilita o Row Level Security (RLS) para segurança de dados
ALTER TABLE public.venue_safety_reviews ENABLE ROW LEVEL SECURITY;

-- 4. Política de Leitura: Qualquer pessoa (público ou autenticado) pode ver as médias e avaliações
CREATE POLICY "Permitir leitura pública das avaliações de segurança" 
ON public.venue_safety_reviews FOR SELECT 
USING (true);

-- 5. Política de Inserção: Usuários autenticados podem publicar suas próprias avaliações
CREATE POLICY "Permitir aos usuários autenticados criar suas próprias avaliações" 
ON public.venue_safety_reviews FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 6. Política de Atualização: Usuários autenticados só podem modificar suas próprias avaliações
CREATE POLICY "Permitir aos usuários autenticados atualizar suas próprias avaliações" 
ON public.venue_safety_reviews FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. Política de Exclusão: Usuários autenticados só podem deletar suas próprias avaliações
CREATE POLICY "Permitir aos usuários autenticados excluir suas próprias avaliações" 
ON public.venue_safety_reviews FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- =====================================================================
-- SEÇÃO ADICIONAL: TABELA DE AVALIAÇÕES DE EXPERIÊNCIA COM COMENTÁRIOS
-- =====================================================================

-- 8. Criação da tabela de avaliações de experiência
CREATE TABLE IF NOT EXISTS public.venue_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id UUID NOT NULL,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    photos TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    likes_count INT DEFAULT 0,
    replies_count INT DEFAULT 0
);

-- 9. Índices de performance para busca rápida de avaliações por local
CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue_id 
ON public.venue_reviews(venue_id);

-- 10. Habilita o Row Level Security (RLS) para as avaliações de experiência
ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;

-- 11. Políticas de RLS para public.venue_reviews
CREATE POLICY "Permitir leitura pública das avaliações" 
ON public.venue_reviews FOR SELECT 
USING (true);

CREATE POLICY "Permitir aos usuários autenticados criar suas próprias avaliações" 
ON public.venue_reviews FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir aos usuários autenticados atualizar suas próprias avaliações" 
ON public.venue_reviews FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir aos usuários autenticados excluir suas próprias avaliações" 
ON public.venue_reviews FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
