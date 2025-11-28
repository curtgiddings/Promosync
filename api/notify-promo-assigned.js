export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'API is working',
      env_check: {
        has_resend_key: !!process.env.RESEND_API_KEY,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_service_key: !!process.env.SUPABASE_SERVICE_KEY
      }
    })
  }
  
  return res.status(200).json({ message: 'Use GET to test' })
}
