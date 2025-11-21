# PromoSync - Architecture Overview

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         SUPABASE                             │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐          │
│  │   reps     │  │  accounts  │  │    promos    │          │
│  ├────────────┤  ├────────────┤  ├──────────────┤          │
│  │ id         │  │ id         │  │ id           │          │
│  │ name       │  │ name       │  │ name         │          │
│  │ email      │  │ territory  │  │ start_date   │          │
│  │ is_admin   │  └────────────┘  │ end_date     │          │
│  └────────────┘                   │ target       │          │
│                                   └──────────────┘          │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │  account_promos    │  │   transactions     │            │
│  ├────────────────────┤  ├────────────────────┤            │
│  │ account_id ────────┼──┤ account_id         │            │
│  │ promo_id ──────────┼──┤ promo_id           │            │
│  │ target_units       │  │ rep_id             │            │
│  └────────────────────┘  │ units_sold         │            │
│                          │ date               │            │
│                          └────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ Supabase Client
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                     REACT APP (PromoSync)                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               supabaseClient.js                       │  │
│  │  (Database connection - used by all components)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ▲                               │
│                              │                               │
│  ┌──────────────────────────┴───────────────────────────┐  │
│  │              AuthContext.js                           │  │
│  │  (Login state - accessible from any component)        │  │
│  │  • user (current logged in user)                      │  │
│  │  • signIn() function                                  │  │
│  │  • signOut() function                                 │  │
│  │  • isAdmin flag                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ▲                               │
│                              │                               │
│  ┌──────────────────────────┴───────────────────────────┐  │
│  │                     App.js                            │  │
│  │  (Main router - decides what to show)                 │  │
│  │  IF user logged in → Dashboard                        │  │
│  │  IF NOT logged in → Login                             │  │
│  └───────────────────────────────────────────────────────┘  │
│           │                                  │                │
│           ▼                                  ▼                │
│  ┌─────────────────┐              ┌──────────────────────┐  │
│  │   Login.js      │              │   Dashboard.js       │  │
│  │  • Email input  │              │   (Main app page)    │  │
│  │  • Password     │              │                      │  │
│  │  • Submit       │              │  ┌────────────────┐  │  │
│  └─────────────────┘              │  │  QuickEntry    │  │  │
│                                   │  │  (Log units)   │  │  │
│                                   │  └────────────────┘  │  │
│                                   │  ┌────────────────┐  │  │
│                                   │  │  ProgressCard  │  │  │
│                                   │  │  (Show prog.)  │  │  │
│                                   │  └────────────────┘  │  │
│                                   │  ┌────────────────┐  │  │
│                                   │  │    Filters     │  │  │
│                                   │  │  (Territory)   │  │  │
│                                   │  └────────────────┘  │  │
│                                   │  ┌────────────────┐  │  │
│                                   │  │  AdminPanel    │  │  │
│                                   │  │  (If admin)    │  │  │
│                                   │  └────────────────┘  │  │
│                                   │  ┌────────────────┐  │  │
│                                   │  │ TransactionLog │  │  │
│                                   │  │  (View all)    │  │  │
│                                   │  └────────────────┘  │  │
│                                   └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Relationships

### What Each Component Does

**supabaseClient.js**
- Connects to your Supabase database
- Imported and used by all components that need data
- You add your credentials here

**AuthContext.js**
- Manages login state across entire app
- Provides `user` object to any component that needs it
- Any component can call `signIn()` or `signOut()`
- Wraps the entire app in `App.js`

**App.js**
- Entry point after index.js
- Wraps everything in AuthContext
- Shows Login if no user, Dashboard if logged in

**Login.js**
- Form with email and password
- Calls `signIn()` from AuthContext
- On success, App.js automatically shows Dashboard

**Dashboard.js**
- Main page after login
- Container for all features
- Fetches and displays data
- You'll add your components here

**QuickEntry.js** (YOU BUILD)
- Form to log units
- Fetches accounts and promos for dropdowns
- Inserts into transactions table
- Used by reps multiple times per day

**ProgressCard.js** (YOU BUILD)
- Shows account progress
- Queries transactions to calculate totals
- Displays progress bar
- Color codes based on percentage

**Filters.js** (YOU BUILD)
- Dropdown filters for territory, promo, rep
- Updates Dashboard's displayed accounts
- Helps reps find their accounts quickly

**AdminPanel.js** (YOU BUILD)
- Only visible if user.is_admin = true
- Forms to create promos, accounts, reps
- Assign accounts to promos
- Management functions

**TransactionLog.js** (YOU BUILD)
- Lists all transactions
- Shows who logged what and when
- Audit trail for the team
- Can filter and sort

## Data Flow Examples

### Logging Units (QuickEntry)
```
User fills form in QuickEntry
       ↓
QuickEntry calls supabase.from('transactions').insert()
       ↓
Supabase adds row to transactions table
       ↓
QuickEntry shows success message
       ↓
Dashboard refreshes and shows updated totals
```

### Showing Progress (ProgressCard)
```
ProgressCard component mounts
       ↓
Queries transactions table for account_id + promo_id
       ↓
Sums up units_sold from all reps
       ↓
Queries account_promos for target_units
       ↓
Calculates: (total_units / target_units) * 100
       ↓
Renders progress bar with color
```

### Login Flow
```
User enters credentials in Login.js
       ↓
Clicks Submit
       ↓
Login calls signIn() from AuthContext
       ↓
AuthContext queries reps table
       ↓
If match: sets user in state
       ↓
App.js sees user exists
       ↓
Renders Dashboard instead of Login
```

## File Organization

```
promosync/
├── public/
│   └── index.html
├── src/
│   ├── index.js              # Entry point
│   ├── index.css             # Global styles
│   ├── App.js                # Main app with routing
│   ├── App.css               # App styles
│   ├── supabaseClient.js     # Database connection
│   ├── AuthContext.js        # Login state manager
│   ├── Login.js              # Login page
│   ├── Dashboard.js          # Main dashboard
│   ├── ExampleComponent.js   # Reference pattern
│   │
│   └── (Files YOU create:)
│       ├── QuickEntry.js
│       ├── ProgressCard.js
│       ├── Filters.js
│       ├── AdminPanel.js
│       ├── TransactionLog.js
│       └── ChatPanel.js (v1.5)
│
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Key Concepts

### React State
Components use `useState` to store data:
```javascript
const [accounts, setAccounts] = useState([])
// accounts = current value
// setAccounts = function to update it
```

### useEffect
Runs code when component loads:
```javascript
useEffect(() => {
  fetchAccounts()  // Runs once on mount
}, [])
```

### Supabase Queries
Pattern for fetching data:
```javascript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('field', value)
```

Pattern for inserting:
```javascript
const { error } = await supabase
  .from('table_name')
  .insert({ field1: value1, field2: value2 })
```

### Component Communication
- Use AuthContext to share user data
- Pass data via props: `<ProgressCard accountId={account.id} />`
- Refresh parent data after child updates

## Mental Model

Think of it like:
- **Supabase** = Your Excel file (but better)
- **Components** = Worksheets/tabs in Excel
- **State** = Current values in cells
- **Functions** = Formulas that calculate
- **Props** = Cell references (A1, B2, etc.)

The difference: Multiple people can use it at once, it's real-time, has validation, and looks way better!

## Next Steps

1. Get skeleton running
2. Build QuickEntry (data input)
3. Build ProgressCard (data display)
4. Connect them in Dashboard
5. Add filters, admin panel, log

Each component is independent but uses the same patterns. Build one, copy the pattern for the next.

You got this! 🚀
