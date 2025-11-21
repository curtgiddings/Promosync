import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase credentials
// You got these from Supabase Project Settings > API
const supabaseUrl = 'https://evxzwarehweamiqyuyij.supabase.co'  // looks like: https://xxxxx.supabase.co
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eHp3YXJlaHdlYW1pcXl1eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjAyMDcsImV4cCI6MjA3OTIzNjIwN30.pd0P0R9B9Eg__3tgQar5YyvpuCUtH5gXYaWSNyTYX8g'  // long string starting with eyJ...

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
