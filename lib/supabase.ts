
import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente são injetadas pelo Vercel (ou seu bundler como o Vite)
// Use VITE_ para variáveis que precisam ser expostas ao cliente (navegador)
// FIX: Hardcoded credentials temporarily as requested.
const supabaseUrl = "https://wwmiqdovqgysncmqnmvp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU";

if (!supabaseUrl || !supabaseAnonKey) {
    // This provides a clear error during development if variables are missing.
    console.error("Supabase URL and Anon Key must be provided.");
}


export const supabase = createClient(supabaseUrl!, supabaseAnonKey!) as any;

const BUCKET_NAME = 'user_uploads';

interface ImageOptions {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Constrói a URL pública para um arquivo no Supabase Storage.
 * @param path O caminho do arquivo no bucket (ex: user_id/image.png)
 * @param options Opções de transformação de imagem (largura, altura, redimensionamento)
 * @returns A URL pública completa para a imagem.
 */
export const getPublicImageUrl = (path: string | null | undefined, options?: ImageOptions): string => {
    // Retorna um placeholder elegante se não houver caminho
    if (!path) return 'https://placehold.co/400x400/1f2937/d1d5db/png?text=G'; 
    
    // Se já for uma URL completa, retorna ela mesma.
    if (path.startsWith('http')) {
        return path;
    }
    
    // Configurações de transformação para otimização
    const transformOptions = options ? {
        transform: {
            width: options.width,
            height: options.height,
            resize: options.resize || 'cover',
            quality: 80, // Otimização de qualidade padrão
            format: 'origin', // Tenta manter o formato ou usar WebP se suportado pelo browser
        }
    } : undefined;

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path, transformOptions);

    // OTIMIZAÇÃO DE PERFORMANCE:
    // Removemos o timestamp (?t=...) para permitir que o navegador faça cache das imagens.
    return data.publicUrl;
};
