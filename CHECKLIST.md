# PromoSync - Progress Checklist

## Phase 1: Setup ✅ DONE
- [x] Supabase project created
- [x] Database schema designed
- [x] Skeleton code built
- [ ] Files uploaded to Replit
- [ ] Supabase credentials added
- [ ] Test user created
- [ ] App running successfully
- [ ] Successfully logged in

## Phase 2: Core Features (Weekend 1)
- [ ] **QuickEntry.js created**
  - [ ] Fetch accounts from database
  - [ ] Fetch active promos from database
  - [ ] Account dropdown working
  - [ ] Promo dropdown working
  - [ ] Units input field
  - [ ] Notes field (optional)
  - [ ] Submit button inserts to transactions table
  - [ ] Success message shows after submit
  - [ ] Form clears after successful submit
  - [ ] Component added to Dashboard

- [ ] **ProgressCard.js created**
  - [ ] Fetches transactions for account/promo
  - [ ] Calculates total units from all reps
  - [ ] Calculates progress percentage
  - [ ] Shows progress bar
  - [ ] Color coding (red < 50%, yellow 50-99%, green ≥ 100%)
  - [ ] Displays "units / target" text
  - [ ] Component integrated into Dashboard

## Phase 3: Enhanced UI (Weekend 2)
- [ ] **Filters.js created**
  - [ ] Territory dropdown filter
  - [ ] Promo dropdown filter
  - [ ] "Show only my entries" toggle
  - [ ] Filters actually work (accounts filter correctly)
  - [ ] Component added to Dashboard

- [ ] **AdminPanel.js created**
  - [ ] Only visible if user.is_admin = true
  - [ ] Can create new promos
  - [ ] Can add accounts
  - [ ] Can assign accounts to promos with custom targets
  - [ ] Can create new rep users
  - [ ] Component accessible from Dashboard

- [ ] **Dashboard improvements**
  - [ ] Account cards use ProgressCard component
  - [ ] QuickEntry button easily accessible
  - [ ] Filters work smoothly
  - [ ] Mobile responsive
  - [ ] Loading states for all data fetches

## Phase 4: Complete Features (Weekend 3)
- [ ] **TransactionLog.js created**
  - [ ] Lists all transactions
  - [ ] Shows rep name, account, date, units, notes
  - [ ] Sortable by date
  - [ ] Filterable by date range
  - [ ] Filterable by rep
  - [ ] Filterable by account
  - [ ] Component accessible from Dashboard

- [ ] **Data display enhancements**
  - [ ] Rep leaderboard (who logged most units)
  - [ ] Territory totals
  - [ ] YoY comparison (if historical data added)
  - [ ] Charts/graphs (using recharts)

## Phase 5: Polish & Testing
- [ ] **User Experience**
  - [ ] All buttons have hover states
  - [ ] Loading indicators everywhere needed
  - [ ] Error messages are helpful
  - [ ] Success messages are clear
  - [ ] Mobile works well
  - [ ] No console errors

- [ ] **Data Integrity**
  - [ ] Can't submit negative units
  - [ ] Can't submit to non-existent accounts
  - [ ] Dates default to today
  - [ ] All calculations are correct

- [ ] **Team Testing**
  - [ ] Created accounts for all reps
  - [ ] Imported all accounts from Excel
  - [ ] Created current promo
  - [ ] Assigned all accounts to promo
  - [ ] Each rep tested logging units
  - [ ] Progress bars show correctly
  - [ ] Everyone can see everyone's progress

## Phase 6: Deployment
- [ ] App deployed (Replit, Netlify, or Vercel)
- [ ] Team has access to URL
- [ ] Passwords changed from test defaults
- [ ] Admin account secured
- [ ] Excel file backed up one last time
- [ ] Team trained on how to use it

## Phase 7: v1.5 Features (Future)
- [ ] **AI Chat Panel**
  - [ ] ChatPanel.js created
  - [ ] Uses Claude API
  - [ ] Can query data ("show Vancouver accounts")
  - [ ] Can log units via chat
  - [ ] Provides insights

- [ ] **Historical Data**
  - [ ] Imported last year's Q4 data
  - [ ] YoY comparison shows on cards
  - [ ] Trends visible

- [ ] **Advanced Features**
  - [ ] Email notifications when targets hit
  - [ ] Weekly summary emails
  - [ ] Pacing alerts (behind target warnings)
  - [ ] Export to Excel function
  - [ ] Bulk import from CSV

## Current Status
**Last Updated:** [Date]  
**Current Phase:** Phase 1 - Setup  
**Blockers:** None  
**Next Steps:** Upload files to Replit, add credentials, test login

## Notes
- Use this checklist to track progress
- Check off items as you complete them
- Don't skip ahead - build features in order
- Test each feature before moving to next
- Ask for help if stuck on any item for >30 minutes

## Time Estimates
- Phase 1: 1 hour
- Phase 2: 4-6 hours
- Phase 3: 4-6 hours
- Phase 4: 3-4 hours
- Phase 5: 2-3 hours
- Phase 6: 1-2 hours
- **Total: ~15-22 hours** (2-3 weekends)

You got this! 🚀
