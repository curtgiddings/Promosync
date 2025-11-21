# PromoSync - Skeleton App

## What's Built (The Skeleton)

✅ **Authentication System**
- Login/logout functionality
- User context that persists across components
- Protected routes (login required to see dashboard)

✅ **Database Connection**
- Supabase client setup
- Example data fetching pattern
- Ready to query your tables

✅ **Basic UI Structure**
- Login page with form
- Dashboard layout with header
- Dark theme styling with Tailwind CSS
- Responsive design

✅ **Component Architecture**
- Clean separation of concerns
- Reusable patterns you can follow
- Well-commented code

## Setup Instructions

### 1. Get Your Files Into Replit

**Option A: Manual (Easiest)**
1. Go to Replit.com, create a new "React JavaScript" project named "PromoSync"
2. In the file explorer (left sidebar), create each file I gave you
3. Copy/paste the contents from each file
4. Files go in the `src/` folder

**Option B: Import from GitHub**
1. Upload these files to a GitHub repo
2. In Replit, click "Import from GitHub"
3. Paste your repo URL

### 2. Add Your Supabase Credentials

Open `supabaseClient.js` and replace:
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL_HERE'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY_HERE'
```

With your actual credentials from Supabase Project Settings > API

### 3. Create a Test User in Supabase

Go to Supabase > Table Editor > reps table > Insert row:
```
name: "Curt"
email: "curt@test.com"
password_hash: "test123"  (we'll add real hashing later)
is_admin: true
```

### 4. Run the App

In Replit Shell (bottom of screen):
```bash
npm install
npm start
```

App should open in the preview window!

### 5. Test Login

Use the credentials you just created:
- Email: curt@test.com
- Password: test123

You should see the dashboard!

---

## What YOU Need to Build Next

### Priority 1: Quick Entry Form (Weekend 1)

**File to create:** `src/QuickEntry.js`

What it needs:
- Dropdown to select account (fetch from accounts table)
- Dropdown to select promo (fetch from promos table where is_active = true)
- Number input for units
- Notes field (optional)
- Submit button that inserts into transactions table

**Pattern to follow:** Look at how Dashboard.js fetches accounts - do the same for your dropdowns.

**Supabase insert example:**
```javascript
const { data, error } = await supabase
  .from('transactions')
  .insert({
    rep_id: user.id,
    account_id: selectedAccountId,
    promo_id: selectedPromoId,
    units_sold: units,
    transaction_date: new Date().toISOString().split('T')[0],
    notes: notes
  })
```

### Priority 2: Progress Calculations (Weekend 1)

**File to create:** `src/ProgressCard.js`

What it needs:
- Fetch all transactions for an account/promo combo
- Sum up total units from all reps
- Calculate: `(total_units / target_units) * 100`
- Color coding:
  - Green: >= 100%
  - Yellow: 50-99%
  - Red: < 50%

**Supabase query example:**
```javascript
const { data } = await supabase
  .from('transactions')
  .select('units_sold')
  .eq('account_id', accountId)
  .eq('promo_id', promoId)

const totalUnits = data.reduce((sum, t) => sum + t.units_sold, 0)
```

### Priority 3: Filters (Weekend 2)

Add dropdown filters to Dashboard:
- Filter by territory (Vancouver, Kelowna, etc.)
- Filter by promo
- Filter by rep (show only my entries toggle)

**Pattern:** Use state to store selected filters, then filter the accounts array before mapping.

### Priority 4: Admin Panel (Weekend 2)

**Files to create:**
- `src/AdminPanel.js`
- `src/CreatePromo.js`
- `src/AddAccount.js`

What it needs:
- Only show if `isAdmin === true`
- Forms to create new promos
- Forms to add accounts to promos
- Forms to create new rep accounts

### Priority 5: Transaction Log (Weekend 3)

**File to create:** `src/TransactionLog.js`

What it shows:
- All transactions with date, rep name, account, units
- Filterable by date range
- Sortable by date

---

## File Structure

```
src/
├── index.js           # Entry point
├── index.css          # Global styles
├── App.js             # Main app component with routing
├── App.css            # App styles
├── supabaseClient.js  # Database connection
├── AuthContext.js     # Authentication state management
├── Login.js           # Login page
└── Dashboard.js       # Main dashboard (YOU EXPAND THIS)

# Files YOU'LL CREATE:
├── QuickEntry.js      # Form to log units
├── ProgressCard.js    # Account progress display
├── Filters.js         # Filter controls
├── AdminPanel.js      # Admin functions
├── TransactionLog.js  # View all entries
└── ChatPanel.js       # AI assistant (v1.5)
```

---

## Key Patterns to Follow

### 1. Fetching Data
```javascript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchData()
}, [])

const fetchData = async () => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
  
  if (!error) setData(data)
  setLoading(false)
}
```

### 2. Inserting Data
```javascript
const handleSubmit = async () => {
  const { error } = await supabase
    .from('table_name')
    .insert({ field1: value1, field2: value2 })
  
  if (!error) {
    // Success! Maybe refresh the list
    fetchData()
  }
}
```

### 3. Conditional Rendering
```javascript
{loading ? (
  <p>Loading...</p>
) : data.length === 0 ? (
  <p>No data yet</p>
) : (
  <div>
    {data.map(item => <div key={item.id}>{item.name}</div>)}
  </div>
)}
```

---

## When You Get Stuck

1. **Check the console** - Replit shows errors at the bottom
2. **Reference the skeleton files** - They show working patterns
3. **Ping me** - I'll walk you through any blockers
4. **Start simple** - Get it working, then make it pretty

---

## Timeline

**This Weekend:**
- Get skeleton running
- Build QuickEntry form
- Build basic ProgressCard

**Next Weekend:**
- Add filters
- Build admin panel
- Polish UI

**Week After:**
- Transaction log
- Test with your team
- Deploy

**Later (v1.5):**
- Add AI chat panel
- YoY comparison data
- Advanced features

---

## Resources

- **React Docs:** https://react.dev
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **My guidance:** Just ask!

---

You've got this! The skeleton gives you the foundation - now you build the actual features that solve your team's problem. Each component follows the same patterns I showed you, so once you build one, the rest will be easier.

Start with QuickEntry - that's the core of the app. Get that working and everything else builds from there.
