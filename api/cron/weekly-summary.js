// /api/cron/weekly-summary.js
// Vercel Cron Job - Runs every Monday at 8am PST
// Add to vercel.json: { "crons": [{ "path": "/api/cron/weekly-summary", "schedule": "0 16 * * 1" }] }
// Note: 16:00 UTC = 8:00 AM PST

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  // Verify cron secret (optional but recommended)
  // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' })
  // }

  try {
    // Get reps who want weekly summaries
    const { data: reps, error: repsError } = await supabase
      .from('reps')
      .select('id, name, email, territories')
      .eq('notify_weekly_summary', true)
      .not('email', 'is', null)

    if (repsError) throw repsError

    if (reps.length === 0) {
      return res.status(200).json({ message: 'No reps opted in', count: 0 })
    }

    // Get active quarter
    const { data: quarter } = await supabase
      .from('quarters')
      .select('*')
      .eq('is_active', true)
      .single()

    // Calculate quarter progress
    let quarterProgress = 50
    let daysLeft = 0
    if (quarter) {
      const start = new Date(quarter.start_date)
      const end = new Date(quarter.end_date)
      const now = new Date()
      const totalDays = (end - start) / (1000 * 60 * 60 * 24)
      const daysPassed = (now - start) / (1000 * 60 * 60 * 24)
      quarterProgress = Math.round((daysPassed / totalDays) * 100)
      daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
    }

    // Get all account promo data
    const { data: accountPromos } = await supabase
      .from('account_promos')
      .select(`
        account_id,
        target_units,
        accounts (
          account_name,
          territory
        ),
        promos (
          promo_name
        )
      `)

    // Get all transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('account_id, units_sold')

    // Calculate progress for each account
    const accountStats = accountPromos?.map(ap => {
      const unitsSold = transactions
        ?.filter(t => t.account_id === ap.account_id)
        ?.reduce((sum, t) => sum + t.units_sold, 0) || 0
      const progress = ap.target_units > 0 ? Math.round((unitsSold / ap.target_units) * 100) : 0
      const behindPace = progress < 100 && progress < (quarterProgress - 10)
      
      return {
        accountName: ap.accounts?.account_name,
        territory: ap.accounts?.territory,
        promoName: ap.promos?.promo_name,
        target: ap.target_units,
        unitsSold,
        progress,
        behindPace,
        metTarget: progress >= 100
      }
    }) || []

    // Send personalized emails to each rep
    const emailPromises = reps.map(async (rep) => {
      // Filter accounts by rep's territories
      const repAccounts = rep.territories?.length > 0
        ? accountStats.filter(a => rep.territories.includes(a.territory))
        : accountStats

      const behindPaceCount = repAccounts.filter(a => a.behindPace).length
      const metTargetCount = repAccounts.filter(a => a.metTarget).length
      const totalAccounts = repAccounts.length
      const totalUnits = repAccounts.reduce((sum, a) => sum + a.unitsSold, 0)
      const totalTarget = repAccounts.reduce((sum, a) => sum + a.target, 0)
      const overallProgress = totalTarget > 0 ? Math.round((totalUnits / totalTarget) * 100) : 0

      // Build accounts needing attention list
      const behindPaceAccounts = repAccounts
        .filter(a => a.behindPace)
        .sort((a, b) => a.progress - b.progress)
        .slice(0, 5)

      const behindPaceHtml = behindPaceAccounts.length > 0
        ? behindPaceAccounts.map(a => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${a.accountName}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${a.territory}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #ef4444; font-weight: bold;">${a.progress}%</td>
            </tr>
          `).join('')
        : '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #22c55e;">🎉 All accounts on pace!</td></tr>'

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">📊 Weekly Summary</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0 0;">${quarter?.name || 'Current Quarter'} • ${daysLeft} days remaining</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 16px;">Hi ${rep.name},</p>
            <p style="color: #334155; font-size: 16px;">Here's your weekly promo progress summary:</p>
            
            <!-- Stats Grid -->
            <div style="display: flex; gap: 12px; margin: 20px 0;">
              <div style="flex: 1; background: white; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #1e40af;">${overallProgress}%</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Overall Progress</p>
              </div>
              <div style="flex: 1; background: white; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${behindPaceCount > 0 ? '#ef4444' : '#22c55e'};">${behindPaceCount}</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Behind Pace</p>
              </div>
              <div style="flex: 1; background: white; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #22c55e;">${metTargetCount}</p>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Target Met</p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div style="background: #e2e8f0; border-radius: 9999px; height: 12px; margin: 16px 0; overflow: hidden;">
              <div style="background: ${overallProgress >= quarterProgress ? '#22c55e' : '#ef4444'}; height: 100%; width: ${Math.min(overallProgress, 100)}%;"></div>
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 0;">Progress: ${overallProgress}% vs Quarter: ${quarterProgress}%</p>

            <!-- Accounts Needing Attention -->
            <h3 style="color: #1e293b; margin: 24px 0 12px 0;">⚠️ Accounts Needing Attention</h3>
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px; text-align: left; font-size: 12px; color: #64748b;">Account</th>
                  <th style="padding: 8px; text-align: left; font-size: 12px; color: #64748b;">Territory</th>
                  <th style="padding: 8px; text-align: left; font-size: 12px; color: #64748b;">Progress</th>
                </tr>
              </thead>
              <tbody>
                ${behindPaceHtml}
              </tbody>
            </table>
            
            <div style="margin-top: 24px;">
              <a href="https://promosync.io" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Full Dashboard</a>
            </div>
          </div>
          
          <div style="background: #1e293b; padding: 16px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">PromoSync • Weekly Summary</p>
            <p style="color: #64748b; margin: 8px 0 0 0; font-size: 11px;">You're receiving this because you opted in to weekly summaries.</p>
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
          subject: `📊 Weekly Summary: ${behindPaceCount > 0 ? `${behindPaceCount} accounts need attention` : 'All on pace!'}`,
          html: html,
        }),
      })

      // Log notification
      await supabase.from('notification_log').insert({
        rep_id: rep.id,
        notification_type: 'weekly_summary',
        subject: `Weekly Summary`,
        status: response.ok ? 'sent' : 'failed',
        details: { 
          overallProgress, 
          behindPaceCount, 
          metTargetCount,
          totalAccounts 
        }
      })

      return response.ok
    })

    const results = await Promise.all(emailPromises)
    const sentCount = results.filter(r => r).length

    return res.status(200).json({ 
      success: true, 
      message: `Sent ${sentCount} weekly summary email(s)`,
      count: sentCount 
    })

  } catch (error) {
    console.error('Weekly summary error:', error)
    return res.status(500).json({ error: 'Failed to send weekly summaries' })
  }
}
