
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Acesso seguro para evitar erros se 'process' não estiver definido
const getEnv = (key: string) => {
  try {
    return (window as any).process?.env?.[key] || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Inicialização segura: se não houver chaves, o cliente é criado com placeholders mas não quebra o app
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder-url.supabase.co');
