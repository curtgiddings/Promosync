// /api/notify-promo-assigned.js
// Sends email when account is assigned to promo

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports = async function handler(req, res) {
  // Allow GET for testing
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'API is working', method: 'Use POST to send notifications' })
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { accountId, accountName, territory, promoName, targetUnits } = req.body

  if (!accountId || !territory) {
    return res.status(400).json({ error: 'Missing accountId or territory' })
  }

  try {
    // Find reps who want territory alerts for this territory
    const { data: reps, error: repsError } = await supabase
      .from('reps')
      .select('id, name, email, territories')
      .eq('notify_territory_promos', true)
      .not('email', 'is', null)

    if (repsError) throw repsError

    // Filter reps whose territories include this account's territory
    const repsToNotify = (reps || []).filter(rep => 
      rep.territories && rep.territories.includes(territory)
    )

    if (repsToNotify.length === 0) {
      return res.status(200).json({ message: 'No reps to notify', count: 0 })
    }

    // Send emails
    const emailPromises = repsToNotify.map(async (rep) => {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎯 New Promo Assignment</h1>
          </div>
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 16px;">Hi ${rep.name},</p>
            <p style="color: #334155; font-size: 16px;">A new account in your territory has been assigned to a promo:</p>
            
            <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 8px 0;"><strong style="color: #1e40af;">Account:</strong> ${accountName}</p>
              <p style="margin: 0 0 8px 0;"><strong style="color: #1e40af;">Territory:</strong> ${territory}</p>
              <p style="margin: 0 0 8px 0;"><strong style="color: #1e40af;">Promo:</strong> ${promoName}</p>
              <p style="margin: 0;"><strong style="color: #1e40af;">Target:</strong> ${targetUnits} units</p>
            </div>
            
            <a href="https://promosync.io" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View in PromoSync</a>
          </div>
          <div style="background: #1e293b; padding: 16px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">PromoSync • Sales Promo Tracking</p>
          </div>
        </div>
      `

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PromoSync <onboarding@resend.dev>',
          to: rep.email,
          subject: `🎯 New Promo: ${accountName} assigned to ${promoName}`,
          html: html,
        }),
      })

      // Log notification
      try {
        await supabase.from('notification_log').insert({
          rep_id: rep.id,
          notification_type: 'territory_promo',
          subject: `New Promo: ${accountName} assigned to ${promoName}`,
          status: response.ok ? 'sent' : 'failed',
          details: { accountId, accountName, territory, promoName }
        })
      } catch (e) {
        console.log('Failed to log notification:', e)
      }

      return response.ok
    })

    const results = await Promise.all(emailPromises)
    const sentCount = results.filter(r => r).length

    return res.status(200).json({ 
      success: true, 
      message: `Sent ${sentCount} notification(s)`,
      count: sentCount 
    })

  } catch (error) {
    console.error('Notification error:', error)
    return res.status(500).json({ error: 'Failed to send notifications', details: error.message })
  }
}
