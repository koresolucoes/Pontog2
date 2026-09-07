import { createClient } from '@supabase/supabase-js';

const viteEnv = ((import.meta as any).env ?? {}) as Record<string, string | undefined>;
const nodeEnv = typeof process !== 'undefined' ? (process.env ?? {}) : {};

const supabaseUrl =
    viteEnv.VITE_SUPABASE_URL ||
    nodeEnv.VITE_SUPABASE_URL ||
    nodeEnv.SUPABASE_URL ||
    'https://wwmiqdovqgysncmqnmvp.supabase.co';

const supabaseAnonKey =
    viteEnv.VITE_SUPABASE_ANON_KEY ||
    nodeEnv.VITE_SUPABASE_ANON_KEY ||
    nodeEnv.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey) as any;

const BUCKET_NAME = 'user_uploads';

interface ImageOptions {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Constrói a URL pública para um arquivo no Supabase Storage.
 * Use somente para mídia deliberadamente pública.
 */
export const getPublicImageUrl = (path: string | null | undefined, options?: ImageOptions): string => {
    void options;
    if (!path) return 'https://placehold.co/400x400/1f2937/d1d5db/png?text=G';

    if (path.startsWith('http') || path.startsWith('/') || path.startsWith('./') || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
};
