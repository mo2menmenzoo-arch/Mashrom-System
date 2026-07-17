# Mushroom System — 6 Requirements Implementation Plan

## Overview
Fix 6 specific requirements in the existing React+Dexie.js PWA mushroom farm management system (`mushroom-system`): data sharing, employee payroll, operating expenses, refresh behavior, unified passwords, and design/image updates.

**Approach:** Minimal targeted fixes only, no refactoring of the monolith.

**Architecture:** Single-file React PWA (`App.tsx` ~6400 lines) + Dexie.js (IndexedDB) + Tailwind CSS 4 + Vite

---

## Task 1: Database Schema — Employee Salary Types (v3)

**File:** `src/db.ts`

1. Update `Employee` interface to add salary-related fields:
   ```typescript
   export interface Employee {
     id?: number;
     name: string;
     role: string;
     salary: number;
     phone?: string;
     notes?: string;
     salary_type: 'fixed' | 'daily' | 'productivity';
     daily_rate?: number;
     productivity_price_per_box?: number;
   }
   ```

2. Bump database version from `v2` to `v3` with migration:
   ```typescript
   const db = new Dexie('MushroomSystemDB');
   db.version(3).stores({
     settings: 'key',
     mushrooms: '++id, name',
     harvest: '++id, cycle_id, mushroom_id, date',
     expenses: '++id, date, cycle_id, category, greenhouse_id',
     sales: '++id, date, cycle_id, mushroom_id, greenhouse_id',
     cycles: '++id, start_date, status',
     employees: '++id, name, role',
     attendance: '++id, employee_id, date, status',
     inventory_transactions: '++id, type, reference_id, created_at',
     environmental_data: '++id, greenhouse_id, temperature, humidity, co2',
     greenhouses: '++id, name, area_m2, status',
     production_cycle: '++id, cycle_id, greenhouse_id, mushroom_id, start_date, status',
   });
   ```

3. Update seed function to include new fields:
   ```typescript
   employees: [
     { name: 'م. احمد', role: 'admin', salary: 8000, salary_type: 'fixed' },
     { name: 'م. سعيد', role: 'supervisor', salary: 5000, salary_type: 'fixed' },
     { name: 'عم سيد', role: 'operator', salary: 3000, salary_type: 'fixed' },
   ]
   ```

---

## Task 2: Session Persistence (Refresh Behavior)

**File:** `src/App.tsx`

1. Add state variables for lock screen persistence:
   ```typescript
   const [isLocked, setIsLocked] = useState(() => localStorage.getItem('isLocked') !== 'false');
   const [activeUser, setActiveUser] = useState<number | null>(() => {
     const saved = localStorage.getItem('activeUser');
     return saved ? parseInt(saved) : null;
   });
   const [activeTab, setActiveTab] = useState<string>(() => {
     return localStorage.getItem('activeTab') || 'dashboard';
   });
   ```

2. Update `handleUnlock` to persist session:
   ```typescript
   const handleUnlock = (userId: number) => {
     setActiveUser(userId);
     setIsLocked(false);
     localStorage.setItem('isLocked', 'false');
     localStorage.setItem('activeUser', userId.toString());
     localStorage.setItem('activeTab', activeTab);
   };
   ```

3. Update `handleLock` to clear session:
   ```typescript
   const handleLock = () => {
     setIsLocked(true);
     setActiveUser(null);
     localStorage.removeItem('isLocked');
     localStorage.removeItem('activeUser');
     localStorage.removeItem('activeTab');
   };
   ```

4. Update tab switching to persist:
   ```typescript
   const handleTabChange = (tab: string) => {
     setActiveTab(tab);
     localStorage.setItem('activeTab', tab);
   };
   ```

---

## Task 3: Employee & Payroll UI

**Files:** `db.ts`, `App.tsx`

### db.ts
1. Add payroll-related methods to database:
   ```typescript
   async addPayroll(employeeId: number, amount: number, cycleId: number) {
     await this.expenses.add({
       amount,
       description: `رواتب: ${employeeId}`,
       category: 'رواتب',
       date: new Date().toISOString().split('T')[0],
       notes: '',
       cycle_id: cycleId,
       greenhouse_id: null
     });
   }
   ```

### App.tsx
1. Add Employee modal with salary type selector:
   ```typescript
   const [showEmployeeModal, setShowEmployeeModal] = useState(false);
   const [employeeSalaryType, setEmployeeSalaryType] = useState<'fixed' | 'daily' | 'productivity'>('fixed');
   const [employeeDailyRate, setEmployeeDailyRate] = useState<number>(0);
   const [employeeProductivityPrice, setEmployeeProductivityPrice] = useState<number>(0);
   ```

2. Add Payroll modal:
   ```typescript
   const [showPayrollModal, setShowPayrollModal] = useState(false);
   const [payrollEmployeeId, setPayrollEmployeeId] = useState<number | null>(null);
   const [payrollAmount, setPayrollAmount] = useState<number>(0);
   const [payrollCycleId, setPayrollCycleId] = useState<number | null>(null);
   ```

3. Update Employee form to include salary type and rate fields.

4. Add Payroll calculation logic:
   ```typescript
   const calculatePayroll = async () => {
     if (!payrollEmployeeId || !payrollCycleId) return;
     const employee = await db.employees.get(payrollEmployeeId);
     if (!employee) return;
     
     let amount = 0;
     if (employee.salary_type === 'fixed') {
       amount = employee.salary;
     } else if (employee.salary_type === 'daily') {
       const attendance = await db.attendance
         .where('employee_id')
         .equals(payrollEmployeeId)
         .and(a => a.cycle_id === payrollCycleId)
         .filter(a => a.status === 'present')
         .count();
       amount = attendance * (employee.daily_rate || 0);
     } else if (employee.salary_type === 'productivity') {
       const attendance = await db.attendance
         .where('employee_id')
         .equals(payrollEmployeeId)
         .and(a => a.cycle_id === payrollCycleId)
         .filter(a => a.status === 'present')
         .count();
       const harvest = await db.harvest
         .where('cycle_id')
         .equals(payrollCycleId)
         .and(h => h.worker === employee.name)
         .count();
       amount = attendance * (employee.daily_rate || 0) + harvest * (employee.productivity_price_per_box || 0);
     }
     
     setPayrollAmount(amount);
   };
   ```

5. Update "Add Expense" modal to include greenhouse dropdown:
   ```typescript
   const [newExpenseGreenhouseId, setNewExpenseGreenhouseId] = useState<number | null>(null);
   ```

---

## Task 4: Operating Expenses + Dashboard Cards

**File:** `App.tsx`

1. Update expense form to include greenhouse selection:
   ```typescript
   <select value={newExpenseGreenhouseId || ''} onChange={e => setNewExpenseGreenhouseId(e.target.value ? parseInt(e.target.value) : null)}>
     <option value="">اختر الزجاجية (اختياري)</option>
     {greenhouses.map(g => (
       <option key={g.id} value={g.id}>{g.name}</option>
     ))}
   </select>
   ```

2. Update `addExpense` to use selected greenhouse:
   ```typescript
   const addExpense = async () => {
     if (!newExpenseAmount || !newExpenseCategory) return;
     await db.expenses.add({
       amount: newExpenseAmount,
       description: newExpenseDescription,
       category: newExpenseCategory,
       date: new Date().toISOString().split('T')[0],
       notes: '',
       cycle_id: null,
       greenhouse_id: newExpenseGreenhouseId
     });
     // ... rest of handler
   };
   ```

3. Add 3 dashboard shortcut cards at the top of dashboard:
   ```typescript
   {/* Quick Access Cards */}
   <div className="grid grid-cols-3 gap-3 mb-6">
     <button
       onClick={() => setActiveTab('sales')}
       className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4 hover:bg-emerald-900/50 transition-all"
     >
       <BarChart3 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
       <span className="text-emerald-300 text-sm font-semibold">المبيعات</span>
     </button>
     <button
       onClick={() => setActiveTab('environment')}
       className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4 hover:bg-amber-900/50 transition-all"
     >
       <Thermometer className="h-6 w-6 text-amber-400 mx-auto mb-2" />
       <span className="text-amber-300 text-sm font-semibold">التحكم البيئي</span>
     </button>
     <button
       onClick={() => setShowExpenseModal(true)}
       className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 hover:bg-blue-900/50 transition-all"
     >
       <DollarSign className="h-6 w-6 text-blue-400 mx-auto mb-2" />
       <span className="text-blue-300 text-sm font-semibold">مصروف جديد</span>
     </button>
   </div>
   ```

---

## Task 5: Logo/Image Cleanup + Meta Tags

**Files:** `index.html`, `manifest.json`, `App.tsx`

1. Delete old image files:
   ```bash
   rm public/logo.jpg public/logo_temp.jpg
   ```

2. Update `index.html`:
   - Replace all `logo.jpg` references with `logo.png`
   - Update favicons to use `logo.png`
   - Update OG meta tags with new logo path
   - Update title to "Farm Management System"

3. Update `manifest.json`:
   - Replace `logo.jpg` with `logo.png` in icons
   - Update app name and short name

4. Update `App.tsx`:
   - Change `const appLogo = '/logo_temp.jpg'` to `const appLogo = '/logo.png'`
   - Keep `/logo_preview.jpg` for OG meta tags

---

## Task 6: Visual Design (Lock Screen, Sidebar, Header)

**Files:** `App.tsx`, `index.css`

### index.css
1. Update color palette:
   ```css
   :root {
     --bg-primary: #020617;
     --bg-secondary: #0f172a;
     --bg-card: #1e293b;
     --accent-green: #10B981;
     --accent-gold: #F59E0B;
     --text-primary: #f1f5f9;
     --text-secondary: #94a3b8;
   }
   ```

2. Add utility classes:
   ```css
   .glass-card {
     background: rgba(30, 41, 59, 0.8);
     backdrop-filter: blur(12px);
     border: 1px solid rgba(148, 163, 184, 0.1);
   }
   
   .gold-accent {
     color: #F59E0B;
   }
   ```

### App.tsx
1. Update lock screen:
   ```typescript
   {/* Lock Screen */}
   <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
     <div className="text-center">
       <img src="/logo.png" alt="Logo" className="h-32 w-32 mx-auto mb-6 rounded-full border-4 border-amber-500 shadow-lg shadow-amber-500/20" />
       <h1 className="text-3xl font-bold text-white mb-2">Farm Management System</h1>
       <p className="text-slate-400 mb-8">اختر حسابك لتسجيل الدخول</p>
       
       {/* User cards */}
       <div className="space-y-3 max-w-sm mx-auto">
         {users.map(user => (
           <button
             key={user.id}
             onClick={() => handleUnlock(user.id)}
             className="w-full glass-card rounded-xl p-4 hover:bg-slate-800 transition-all border border-slate-700 hover:border-amber-500/50"
           >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                 <User className="h-5 w-5 text-amber-400" />
               </div>
               <div className="text-right">
                 <p className="text-white font-semibold">{user.name}</p>
                 <p className="text-slate-400 text-sm">{user.role === 'admin' ? 'مدير' : user.role === 'supervisor' ? 'مشرف' : 'عامل'}</p>
               </div>
             </div>
           </button>
         ))}
       </div>
     </div>
   </div>
   ```

2. Update sidebar:
   ```typescript
   <div className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col">
     {/* Logo */}
     <div className="p-4 border-b border-slate-800">
       <img src="/logo.png" alt="Logo" className="h-12 mx-auto" />
     </div>
     
     {/* Navigation */}
     <nav className="flex-1 p-4 space-y-2">
       {navItems.map(item => (
         <button
           key={item.id}
           onClick={() => handleTabChange(item.id)}
           className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
             activeTab === item.id
               ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
               : 'text-slate-400 hover:bg-slate-800 hover:text-white'
           }`}
         >
           <item.icon className="h-5 w-5" />
           <span>{item.label}</span>
         </button>
       ))}
     </nav>
     
     {/* User info + Lock button */}
     <div className="p-4 border-t border-slate-800">
       <div className="flex items-center gap-3 mb-4">
         <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
           <User className="h-5 w-5 text-amber-400" />
         </div>
         <div className="text-right">
           <p className="text-white font-semibold">{currentUser?.name}</p>
           <p className="text-slate-400 text-sm">{currentUser?.role === 'admin' ? 'مدير' : currentUser?.role === 'supervisor' ? 'مشرف' : 'عامل'}</p>
         </div>
       </div>
       <button
         onClick={handleLock}
         className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all border border-red-500/30"
       >
         <Lock className="h-4 w-4" />
         <span>قفل</span>
       </button>
     </div>
   </div>
   ```

3. Update header:
   ```typescript
   <div className="h-16 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 flex items-center justify-between px-6">
     <div className="flex items-center gap-4">
       <h2 className="text-xl font-bold text-white">{activeTabLabel}</h2>
     </div>
     <div className="flex items-center gap-4">
       <div className="text-sm text-slate-400">
         {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
       </div>
       <button
         onClick={handleLock}
         className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
       >
         <Lock className="h-5 w-5" />
       </button>
     </div>
   </div>
   ```

---

## Task 7: Data Sharing Verification

**File:** None (read-only check)

1. Verify all `useLiveQuery` calls in `App.tsx` use full table queries without user-scoped filtering.
2. Check if any data is filtered by `activeUser` when it shouldn't be.
3. If all queries are unscoped, no code changes needed.

---

## Task 8: Password Verification

**File:** None (read-only check)

1. Verify current password assignments:
   - 7391 → Admin
   - 2846 → Admin
   - 9514 → Supervisor
   - 8263 → Operator
2. These match `prompt.md` requirements — no changes needed.

---

## Execution Order

1. **Task 1** — Database schema changes (foundation)
2. **Task 2** — Session persistence (independent)
3. **Task 3** — Employee & Payroll UI (depends on Task 1)
4. **Task 4** — Operating expenses + dashboard cards (independent)
5. **Task 5** — Logo/image cleanup (independent)
6. **Task 6** — Visual design (depends on Task 5)
7. **Task 7** — Data sharing verification (final check)
8. **Task 8** — Password verification (final check)

## Verification

After each task, run `npm run lint` to ensure TypeScript compilation succeeds.

## Commit Strategy

- **Commit 1:** Tasks 1-3 (Employee & Payroll)
- **Commit 2:** Tasks 4-6 (UI/UX updates)
- **Commit 3:** Tasks 7-8 (Verification + cleanup)
