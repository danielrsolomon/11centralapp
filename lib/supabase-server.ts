import { createClient as createClientBase } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function createClient() {
  return createClientBase<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 