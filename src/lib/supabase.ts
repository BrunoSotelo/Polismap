
import { createClient } from '@supabase/supabase-js';

// These should be in .env files eventually
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

import type { Database } from '../types/database.types';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
