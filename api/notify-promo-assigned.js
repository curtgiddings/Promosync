// /api/notify-promo-assigned.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Test endpoint
  if (req.method === 'GET') {
    // Check for test mode
    if (req.query.test === 'true' && req.query.email) {
      try {
        const testHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
            <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 8px;">🎯</div>
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">New Promo Assignment</h1>
            </div>
            <div style="background: white; padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #334155; font-size: 16px; margin: 0 0 24px 0;">Hi there,</p>
              <p style="color: #334155; font-size: 16px; margin: 0 0 24px 0;">A new account in your territory has been assigned to a promo:</p>
              
              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 24px 0; border-left: 4px solid #3b82f6;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Account</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">Test Account</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Territory</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">Vancouver</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Promo</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">SY125</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Target</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">125 units</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Terms</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">30/60/90</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Assigned by</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">Test User</td>
                  </tr>
                </table>
              </div>
              
              <a href="https://promosync.io" style="display: inline-block; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in PromoSync</a>
            </div>
            <div style="background: #1e293b; padding: 20px 24px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #94a3b8; margin: 0; font-size: 13px;">PromoSync • Sales Promo Tracking</p>
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
            from: 'PromoSync <notifications@promosync.io>',
            to: req.query.email,
            subject: '🎯 TEST: New Promo Assignment',
            html: testHtml,
          }),
        })

        const result = await response.json()
        return res.status(200).json({ success: true, message: 'Test email sent!', result })
      } catch (error) {
        return res.status(500).json({ error: 'Failed to send test email', details: error.message })
      }
    }

    return res.status(200).json({ 
      status: 'API is working',
      usage: 'Add ?test=true&email=your@email.com to send a test email',
      env_check: {
        has_resend_key: !!process.env.RESEND_API_KEY,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_service_key: !!process.env.SUPABASE_SERVICE_KEY
      }
    })
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { accountId, accountName, territory, promoName, targetUnits, terms, assignedBy } = req.body

  if (!accountId || !territory) {
    return res.status(400).json({ error: 'Missing accountId or territory' })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Find reps who want territory alerts for this territory
    const { data: reps, error: repsError } = await supabase
      .from('reps')
      .select('id, name, email, territories')
      .eq('notify_territory_promos', true)
      .not('email', 'is', null)

    if (repsError) {
      console.error('Supabase error:', repsError)
      return res.status(500).json({ error: 'Database error', details: repsError.message })
    }

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
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 8px;">🎯</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">New Promo Assignment</h1>
          </div>
          <div style="background: white; padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #334155; font-size: 16px; margin: 0 0 24px 0;">Hi ${rep.name},</p>
            <p style="color: #334155; font-size: 16px; margin: 0 0 24px 0;">A new account in your territory has been assigned to a promo:</p>
            
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 24px 0; border-left: 4px solid #3b82f6;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Account</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${accountName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Territory</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${territory}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Promo</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${promoName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Target</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${targetUnits} units</td>
                </tr>
                ${terms ? `<tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Terms</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${terms}</td>
                </tr>` : ''}
                ${assignedBy ? `<tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Assigned by</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${assignedBy}</td>
                </tr>` : ''}
              </table>
            </div>
            
            <a href="https://promosync.io" style="display: inline-block; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in PromoSync</a>
          </div>
          <div style="background: #1e293b; padding: 20px 24px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 13px;">PromoSync • Sales Promo Tracking</p>
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
          from: 'PromoSync <notifications@promosync.io>',
          to: rep.email,
          subject: `🎯 New Promo: ${accountName} assigned to ${promoName}`,
          html: html,
        }),
      })

      const result = await response.json()
      console.log('Resend response:', result)

      return response.ok
    })

    const results = await Promise.all(emailPromises)
    const sentCount = results.filter(r => r).length

    return res.status(200).json({ 
      success: true, 
      message: `Sent ${sentCount} notification(s)`,
      count: sentCount,
      repsFound: repsToNotify.length
    })

  } catch (error) {
    console.error('Notification error:', error)
    return res.status(500).json({ error: 'Failed to send notifications', details: error.message })
  }
}
