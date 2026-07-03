import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpwxtapfivuhjlssfzls.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwd3h0YXBmaXZ1aGpsc3NmemxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwOTc4MzIsImV4cCI6MjA5ODY3MzgzMn0.RtpMeKJPEWbxUCpF4Xvghn4U3154DQLN6mMOkdO2CMo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
