import { createClient } from '@supabase/supabase-js';

/** Supabase URL en Anon Key: zet in .env.local als VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY. Zie docs/SUPABASE_SETUP.md. */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').toString().trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').toString().trim();

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder');

/** Convert snake_case to camelCase for Supabase responses */
export function toCamelCase<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase) as T;
  if (typeof obj !== 'object') return obj;
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {} as any) as T;
}

/** Convert camelCase to snake_case for Supabase inserts/updates */
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== 'object') return obj;
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {} as any);
}

/** Database-schema en SQL-setup: zie docs/SUPABASE_SETUP.md */
