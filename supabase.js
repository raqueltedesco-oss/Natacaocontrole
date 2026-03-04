import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tbfcskeudfkwlpjhhjpj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZmNza2V1ZGZrd2xwamhoanBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzcxNDcsImV4cCI6MjA4ODIxMzE0N30.iH2u0ro-AVicE7HcJ3P2wGPvVCzw06fG4fvxDwWnUyg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
