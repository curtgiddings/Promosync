# PromoSync - Quick Start Guide

## 5-Minute Setup

### 1. Upload Files to Replit
- Create new React JavaScript project in Replit
- Copy all `.js` and `.css` files into `src/` folder
- Copy `package.json` and `tailwind.config.js` to root

### 2. Add Supabase Credentials
Edit `supabaseClient.js`:
```javascript
const supabaseUrl = 'https://YOUR-PROJECT.supabase.co'
const supabaseAnonKey = 'eyJ...' // Your anon key
```

### 3. Create Test User
In Supabase > reps table > Insert:
- name: "Curt"
- email: "curt@test.com"  
- password_hash: "test123"
- is_admin: true

### 4. Run It
```bash
npm install
npm start
```

### 5. Login
- Email: curt@test.com
- Password: test123

✅ **You should see the dashboard!**

---

## Your First Task: Quick Entry Form

**Goal:** Let reps log units for accounts.

**Create:** `src/QuickEntry.js`

**What it needs:**
```javascript
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

// 1. Fetch accounts and promos for dropdowns
// 2. Form with: account selector, promo selector, units input
// 3. Submit button that inserts to transactions table
// 4. Success message after submit
```

**Database insert:**
```javascript
await supabase.from('transactions').insert({
  rep_id: user.id,
  account_id: selectedAccount,
  promo_id: selectedPromo,
  units_sold: units,
  transaction_date: new Date().toISOString().split('T')[0]
})
```

**Add to Dashboard:**
```javascript
import QuickEntry from './QuickEntry'

// In Dashboard component:
<QuickEntry />
```

---

## Files You Have (Skeleton)
✅ supabaseClient.js - Database connection  
✅ AuthContext.js - Login system  
✅ Login.js - Login page  
✅ Dashboard.js - Main page  
✅ App.js - Routing  
✅ ExampleComponent.js - Pattern reference

## Files You'll Build
⏳ QuickEntry.js - Log units form  
⏳ ProgressCard.js - Show account progress  
⏳ Filters.js - Filter by territory/promo  
⏳ AdminPanel.js - Create promos/accounts  
⏳ TransactionLog.js - View all entries

---

## When Stuck

1. Check browser console for errors (F12)
2. Look at ExampleComponent.js for patterns
3. Reference Dashboard.js for data fetching
4. Ask me!

---

## Pro Tips

- Start with QuickEntry - it's the core feature
- Test each component before moving to next
- Use console.log() liberally to debug
- Copy patterns from skeleton files
- Don't worry about perfection - get it working first

You got this! 🚀
