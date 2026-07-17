/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table, type PromiseExtended } from 'dexie';

// ==========================================
// 0. منطق التشفير والتعمية المحلي الآمن (Encryption & Obfuscation Layer)
// ==========================================

const ENCRYPTION_KEY = 'mushroom_secure_vault_key_2026';

export function xorEncryptDecrypt(input: string): string {
  let output = '';
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    output += String.fromCharCode(charCode);
  }
  return output;
}

export function encryptValue(val: any): any {
  if (val === null || val === undefined) return val;
  const type = typeof val;
  let payload = '';
  let prefix = '';
  
  if (type === 'string') {
    if (val.startsWith('__enc__')) return val; // مشفر بالفعل
    payload = val;
    prefix = '__enc__S:';
  } else if (type === 'number') {
    payload = String(val);
    prefix = '__enc__N:';
  } else if (type === 'boolean') {
    payload = String(val);
    prefix = '__enc__B:';
  } else {
    return val; // لا نشفر الكائنات المعقدة أو المصفوفات مباشرة
  }
  
  try {
    const xored = xorEncryptDecrypt(payload);
    const b64 = btoa(unescape(encodeURIComponent(xored)));
    return prefix + b64;
  } catch (e) {
    return val;
  }
}

export function decryptValue(val: any): any {
  if (typeof val !== 'string' || !val.startsWith('__enc__')) return val;
  
  try {
    const parts = val.split(':');
    if (parts.length < 2) return val;
    const prefix = parts[0] + ':';
    const payloadB64 = parts.slice(1).join(':');
    
    const decodedB64 = decodeURIComponent(escape(atob(payloadB64)));
    const decrypted = xorEncryptDecrypt(decodedB64);
    
    if (prefix === '__enc__S:') {
      return decrypted;
    } else if (prefix === '__enc__N:') {
      return Number(decrypted);
    } else if (prefix === '__enc__B:') {
      return decrypted === 'true';
    }
  } catch (e) {
    console.error('Failed to decrypt value:', val, e);
  }
  return val;
}

const EXCLUDE_KEYS = new Set([
  'id', 'role', 'name', 'pin_code', 'greenhouse_id', 'cycle_id', 
  'date', 'start_date', 'end_date', 'status', 'grade', 
  'unit', 'expiry_date', 'date_added', 'timestamp', 
  'user_id', 'operation_type', 'operator_id', 'item_name', 
  'cycle_number', 'last_updated'
]);

export function encryptObject<T extends object>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj } as any;
  for (const key in copy) {
    if (Object.prototype.hasOwnProperty.call(copy, key)) {
      if (!EXCLUDE_KEYS.has(key)) {
        copy[key] = encryptValue(copy[key]);
      }
    }
  }
  return copy;
}

export function decryptObject<T extends object>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj } as any;
  for (const key in copy) {
    if (Object.prototype.hasOwnProperty.call(copy, key)) {
      copy[key] = decryptValue(copy[key]);
    }
  }
  return copy;
}

// ==========================================
// 1. تعريف واجهات البيانات (Interfaces) لكل الجداول
// ==========================================

export interface User {
  id?: number;
  name: string;
  pin_code: string;
  role: 'Admin' | 'Supervisor' | 'Operator'; // مدير، مشرف، مشغل
}

export interface Partner {
  id?: number;
  name: string;
  share_percentage: number; // نسبة الشراكة % (للتوافق القديم)
  total_payouts: number; // إجمالي المدفوعات والشراكة المستلمة
  contribution_value: number; // قيمة المساهمة بالجنيه
  profit_percentage: number; // نسبة الأرباح %
}

export interface Asset {
  id?: number;
  name: string; // اسم الأصل
  purchase_cost: number; // تكلفة الشراء
  purchase_date: string; // تاريخ الشراء
  useful_life: number; // العمر الافتراضي بالسنوات
  accumulated_depreciation: number; // الإهلاك المتراكم
}

export interface Production {
  id?: number;
  greenhouse_id: number; // ربط بالصوبة
  cycle_id: number; // ربط بالدورة
  date: string; // تاريخ الإنتاج والفرز اليومي
  weight: number; // الوزن الإجمالي بالكيلو
  grade: 'A' | 'B' | 'C'; // درجة الجودة والفرز (A, B, C)
}

export interface Greenhouse {
  id?: number;
  name: string; // اسم الصوبة
  capacity: number; // السعة الاستيعابية (مثلاً عدد الأكياس/الرفوف)
  status: 'Active' | 'Maintenance'; // نشط أو صيانة
}

export interface Cycle {
  id?: number;
  greenhouse_id: number; // ربط بالصوبة (1:M)
  cycle_number: string; // رقم أو اسم الدورة
  start_date: string; // تاريخ البدء
  end_date?: string; // تاريخ الانتهاء المتوقع/الفعلي
  status: 'Active' | 'Completed'; // نشطة أو مكتملة
  initial_investment: number; // الاستثمار الأولي للدورة
}

export interface InventoryItem {
  id?: number;
  date_added: string; // تاريخ الإضافة
  item_name: string; // اسم الصنف
  quantity: number; // العدد / الكمية المتاحة
  unit: string; // الوحدة (كيلو، كرتونة، كيس، لتر)
  expiry_date?: string; // تاريخ الصلاحية
  min_stock_alert: number; // تنبيه الحد الأدنى للكمية
}

export interface PettyCash {
  id?: number; // عادة ما يكون لدينا سجل واحد بمعرف 1
  current_balance: number; // الرصيد الحالي للعهدة
  last_updated: string; // تاريخ آخر تحديث
}

// السجل المالي التاريخي (Immutable Audit Trail) - لا يسمح بالتعديل أو الحذف
export interface Transaction {
  id?: number;
  timestamp: string; // وقت وتاريخ العملية
  user_id: number; // معرف المستخدم الذي قام بالعملية
  operation_type: 'Deposit' | 'Withdrawal' | 'Correction'; // إيداع، سحب، تصحيح
  amount: number; // المبلغ المعني
  balance_before: number; // الرصيد قبل العملية
  balance_after: number; // الرصيد بعد العملية
  details: string; // تفاصيل العملية
}

export interface Expense {
  id?: number;
  cycle_id: number; // ربط بالدورة المعنية
  date: string; // تاريخ المصروف
  type: 'Operational' | 'Selling'; // مصاريف تشغيلية أو مصاريف بيع
  
  // حقول مصاريف التشغيل (Type 1)
  details?: string; // التفاصيل / البيان
  amount?: number; // المبلغ
  linked_inventory_item_id?: number; // ربط بصنف المخزن الاختياري (تحديث تلقائي)
  greenhouse_id?: number; // ربط بالصوبة (اختياري)

  // حقول مصاريف البيع (Type 2)
  total_boxes?: number; // عدد الكراتين المباعة
  price_per_box?: number; // سعر الكرتونة الواحد
  customer_name?: string; // اسم العميل
  paid_amount?: number; // المبلغ المدفوع
  remaining_amount?: number; // المبلغ المتبقي / الديون والذمم المدونة
  total_amount?: number; // الإجمالي المالي (عدد الكراتين * السعر)
  due_date?: string; // تاريخ استحقاق تحصيل الديون المتبقية
}

export interface OperationalLog {
  id?: number;
  cycle_id: number; // ربط بالدورة المعنية
  date: string; // تاريخ يوم التشغيل (بحد أقصى 60 يوم)
  temperature: number; // درجة الحرارة (مئوية)
  humidity: number; // نسبة الرطوبة (%)
  co2_level: number; // مستوى ثاني أكسيد الكربون (ppm)
  hygiene_status: 'Excellent' | 'Good' | 'Fair' | 'Poor'; // تقييم نظافة الصوبة
  extra_notes?: string; // ملاحظات وتفاصيل إضافية
  operator_id: number; // معرف المشغل المسؤول عن القراءة
  harvest_weight?: number; // الوزن الإجمالي المقطوف بالكيلوجرام (اختياري)
  harvest_type?: string; // نوع الفطر المقطوف (اختياري)
  harvest_grade?: 'A' | 'B' | 'C'; // درجة الفرز والجودة (A، B، C) (اختياري)
}

export interface Employee {
  id?: number;
  name: string; // اسم الموظف
  role?: string; // الدور
  base_salary: number; // الراتب الأساسي
  total_advances: number; // إجمالي السلف
  total_bonuses: number; // إجمالي المكافآت والبدلات
  salary_type: 'fixed' | 'daily' | 'productivity'; // نوع الراتب
  daily_rate?: number; // سعر اليوم (للرواتب اليومية)
  productivity_price_per_box?: number; // سعر الكرتونة (للرواتب الإنتاجية)
}

// ==========================================
// 2. إعداد قاعدة بيانات Dexie والتهيئة
// ==========================================

export class MushroomFarmDatabase extends Dexie {
  users!: Table<User, number>;
  partners!: Table<Partner, number>;
  greenhouses!: Table<Greenhouse, number>;
  cycles!: Table<Cycle, number>;
  inventory!: Table<InventoryItem, number>;
  petty_cash!: Table<PettyCash, number>;
  transactions!: Table<Transaction, number>;
  expenses!: Table<Expense, number>;
  operational_logs!: Table<OperationalLog, number>;
  employees!: Table<Employee, number>;
  assets!: Table<Asset, number>;
  production!: Table<Production, number>;

  // ==========================================
  // صمامات أمان صارمة لمنع حذف قاعدة بيانات الإنتاج نهائياً
  // ==========================================
  override delete(closeOptions?: { disableAutoOpen: boolean }): PromiseExtended<void> {
    if (this.name === 'MushroomProdDB') {
      throw new Error("CRITICAL SAFETY ERROR: Deleting the production database (MushroomProdDB) is strictly forbidden!");
    }
    return super.delete(closeOptions);
  }

  constructor(name: string) {
    super(name);
    
    // تعريف الفهارس والمفاتيح الأساسية للجداول
    this.version(1).stores({
      users: '++id, name, pin_code, role',
      partners: '++id, name, share_percentage, total_payouts',
      greenhouses: '++id, name, capacity, status',
      cycles: '++id, greenhouse_id, cycle_number, start_date, end_date, status, initial_investment',
      inventory: '++id, date_added, item_name, quantity, unit, expiry_date, min_stock_alert',
      petty_cash: '++id, current_balance, last_updated',
      transactions: '++id, timestamp, user_id, operation_type, amount, balance_before, balance_after, details',
      expenses: '++id, cycle_id, date, type, customer_name',
      operational_logs: '++id, cycle_id, date, operator_id',
      employees: '++id, name, base_salary, total_advances, total_bonuses'
    });

    this.version(2).stores({
      users: '++id, name, pin_code, role',
      partners: '++id, name, contribution_value, profit_percentage, share_percentage, total_payouts',
      greenhouses: '++id, name, capacity, status',
      cycles: '++id, greenhouse_id, cycle_number, start_date, end_date, status, initial_investment',
      inventory: '++id, date_added, item_name, quantity, unit, expiry_date, min_stock_alert',
      petty_cash: '++id, current_balance, last_updated',
      transactions: '++id, timestamp, user_id, operation_type, amount, balance_before, balance_after, details',
      expenses: '++id, cycle_id, date, type, customer_name',
      operational_logs: '++id, cycle_id, date, operator_id',
      employees: '++id, name, base_salary, total_advances, total_bonuses',
      assets: '++id, name, purchase_cost, purchase_date, useful_life, accumulated_depreciation',
      production: '++id, greenhouse_id, cycle_id, date'
    });

    this.version(3).stores({
      users: '++id, name, pin_code, role',
      partners: '++id, name, contribution_value, profit_percentage, share_percentage, total_payouts',
      greenhouses: '++id, name, capacity, status',
      cycles: '++id, greenhouse_id, cycle_number, start_date, end_date, status, initial_investment',
      inventory: '++id, date_added, item_name, quantity, unit, expiry_date, min_stock_alert',
      petty_cash: '++id, current_balance, last_updated',
      transactions: '++id, timestamp, user_id, operation_type, amount, balance_before, balance_after, details',
      expenses: '++id, cycle_id, date, type, customer_name',
      operational_logs: '++id, cycle_id, date, operator_id',
      employees: '++id, name, role, base_salary, total_advances, total_bonuses, salary_type, daily_rate, productivity_price_per_box',
      assets: '++id, name, purchase_cost, purchase_date, useful_life, accumulated_depreciation',
      production: '++id, greenhouse_id, cycle_id, date'
    });

    // تسجيل خطافات التشفير والتعمية التلقائية لحماية البيانات محلياً (Dexie Hooks)
    const tablesToEncrypt = [
      'users', 'partners', 'greenhouses', 'cycles', 'inventory',
      'petty_cash', 'transactions', 'expenses', 'operational_logs',
      'employees', 'assets', 'production'
    ];

    tablesToEncrypt.forEach(tableName => {
      this.table(tableName).hook('creating', (primKey, obj) => {
        const encrypted = encryptObject(obj);
        Object.assign(obj, encrypted);
      });

      this.table(tableName).hook('updating', (mods) => {
        return encryptObject(mods);
      });

      this.table(tableName).hook('reading', (obj) => {
        return decryptObject(obj);
      });
    });
  }
}

export const prodDb = new MushroomFarmDatabase('MushroomProdDB');
export const demoDb = new MushroomFarmDatabase('MushroomDemoDB');

// لتجنب كسر التوافق في الأماكن الأخرى، نصدر افتراضياً db كـ prodDb
export const db = prodDb;

// ==========================================
// 3. دالة بذر البيانات الأولية (Seeding) - النواة الأساسية فقط (Clean Slate)
// ==========================================

export async function seedInitialData(database: MushroomFarmDatabase = prodDb) {
  // بذر المستخدمين الحقيقيين للمشروع وحماية الخصوصية الكاملة
  await database.users.bulkPut([
    { id: 1, name: 'الإدارة العامة (مؤمن)', pin_code: '7391', role: 'Admin' },
    { id: 2, name: 'الإدارة العامة (محمود)', pin_code: '2846', role: 'Admin' },
    { id: 3, name: 'المشرف المناوب', pin_code: '9514', role: 'Supervisor' },
    { id: 4, name: 'المشغل الفني', pin_code: '8263', role: 'Operator' }
  ]);

  // تهيئة العهدة المالية بقيمة صفر إذا لم تكن موجودة
  const pc = await database.petty_cash.get(1);
  if (!pc) {
    await database.petty_cash.put({
      id: 1,
      current_balance: 0,
      last_updated: new Date().toISOString()
    });
  }
}

// ==========================================
// 4. منطق "وضع التجربة" (Demo Mode) الديناميكي
// ==========================================

export async function injectDemoData(database: MushroomFarmDatabase = demoDb) {
  // مسح أي بيانات سابقة أولاً لتجنب التكرار
  await clearDemoData(database);

  // 1. الصوبات (Greenhouses)
  await database.greenhouses.bulkPut([
    { id: 1, name: 'صوبة الإنتاج أ (محار أبيض)', capacity: 1500, status: 'Active' },
    { id: 2, name: 'صوبة الإنتاج ب (فطر أغاريكوس)', capacity: 2000, status: 'Active' },
    { id: 3, name: 'صوبة الحضن ج (التجهيز)', capacity: 1000, status: 'Maintenance' }
  ]);

  // 2. الشركاء (Partners)
  await database.partners.bulkPut([
    { id: 1, name: 'شريك مستثمر أ', share_percentage: 60, total_payouts: 0, contribution_value: 150000, profit_percentage: 60 },
    { id: 2, name: 'شريك مستثمر ب', share_percentage: 40, total_payouts: 0, contribution_value: 100000, profit_percentage: 40 }
  ]);

  // 2. ب. الأصول الثابتة (Assets)
  await database.assets.bulkPut([
    { id: 1, name: 'جهاز تعقيم وحقن آلي', purchase_cost: 25000, purchase_date: '2025-01-01', useful_life: 5, accumulated_depreciation: 7500 },
    { id: 2, name: 'مكيف هواء صناعي بقوة 5 حصان', purchase_cost: 18000, purchase_date: '2025-06-01', useful_life: 6, accumulated_depreciation: 3250 },
    { id: 3, name: 'جهاز ترطيب ذكي فائق الضغط', purchase_cost: 8000, purchase_date: '2026-01-01', useful_life: 4, accumulated_depreciation: 1000 }
  ]);

  // 3. العهدة المالية (Petty Cash) - تبدأ بـ 50,000 ج.م ثم تعدل بحسب العمليات المضافة أدناه
  await database.petty_cash.put({
    id: 1,
    current_balance: 51500,
    last_updated: new Date().toISOString()
  });

  // إضافة العمليات التدقيقية المصاحبة لتطابق حركة الحسابات التاريخية بالكامل
  await database.transactions.bulkPut([
    {
      id: 1,
      timestamp: '2026-06-18T10:00:00.000Z',
      user_id: 1,
      operation_type: 'Withdrawal',
      amount: 2500,
      balance_before: 50000,
      balance_after: 47500,
      details: 'مصروف تشغيلي: شراء خامات بيئية ومستلزمات تعقيم'
    },
    {
      id: 2,
      timestamp: '2026-06-25T11:00:00.000Z',
      user_id: 1,
      operation_type: 'Deposit',
      amount: 4000,
      balance_before: 47500,
      balance_after: 51500,
      details: 'مبيعات لـ محل السلام للمواد الغذائية (كراتين: 50)'
    }
  ]);

  // 4. الموظفين (Employees)
  await database.employees.bulkPut([
    { id: 1, name: 'خالد أحمد', role: 'operator', base_salary: 4500, total_advances: 200, total_bonuses: 300, salary_type: 'fixed' },
    { id: 2, name: 'ياسر علي', role: 'operator', base_salary: 5000, total_advances: 0, total_bonuses: 150, salary_type: 'fixed' }
  ]);

  // 5. عينات من المخزن (Inventory) - 4 أصناف متكاملة
  await database.inventory.bulkPut([
    { id: 1, date_added: '2026-06-01', item_name: 'أبواغ فطر محاري ممتاز', quantity: 150, unit: 'كيس تلقيح', expiry_date: '2026-12-01', min_stock_alert: 20 },
    { id: 2, date_added: '2026-06-01', item_name: 'مادة الجبس الزراعي الكالسي', quantity: 10, unit: 'شيكارة', min_stock_alert: 2 },
    { id: 3, date_added: '2026-06-01', item_name: 'صناديق كرتون للتعبئة', quantity: 500, unit: 'قطعة', min_stock_alert: 50 },
    { id: 4, date_added: '2026-06-01', item_name: 'محلول مطهر معقم فائق الفعالية', quantity: 5, unit: 'جالون', min_stock_alert: 3 }
  ]);

  // 6. دورات الإنتاج (Cycles) - دورتان (2 Cycles)
  await database.cycles.bulkPut([
    {
      id: 1,
      greenhouse_id: 1,
      cycle_number: 'الدورة رقم 12 (فطر محاري)',
      start_date: '2026-06-15',
      status: 'Active',
      initial_investment: 15000
    },
    {
      id: 2,
      greenhouse_id: 2,
      cycle_number: 'الدورة رقم 11 (فطر بري)',
      start_date: '2026-05-10',
      end_date: '2026-06-10',
      status: 'Completed',
      initial_investment: 12000
    }
  ]);

  // 7. مصاريف ومبيعات تجريبية (Expenses / Sales)
  await database.expenses.bulkPut([
    {
      id: 1,
      cycle_id: 1,
      date: '2026-06-18',
      type: 'Operational',
      details: 'شراء خامات بيئية ومستلزمات تعقيم',
      amount: 2500,
      linked_inventory_item_id: 4
    },
    {
      id: 2,
      cycle_id: 1,
      date: '2026-06-25',
      type: 'Selling',
      total_boxes: 50,
      price_per_box: 120,
      customer_name: 'محل السلام للمواد الغذائية',
      paid_amount: 4000,
      remaining_amount: 2000,
      total_amount: 6000
    }
  ]);

  // 8. قراءات تشغيلية (Operational Logs)
  await database.operational_logs.bulkPut([
    { id: 1, cycle_id: 1, date: '2026-06-20', temperature: 24, humidity: 85, co2_level: 800, hygiene_status: 'Excellent', operator_id: 4 },
    { id: 2, cycle_id: 1, date: '2026-06-21', temperature: 23, humidity: 88, co2_level: 850, hygiene_status: 'Good', operator_id: 4 }
  ]);

  // 9. سجلات الإنتاج والفرز (Production Logs)
  await database.production.bulkPut([
    { id: 1, greenhouse_id: 1, cycle_id: 1, date: '2026-06-20', weight: 45, grade: 'A' },
    { id: 2, greenhouse_id: 1, cycle_id: 1, date: '2026-06-21', weight: 38, grade: 'B' }
  ]);
}

export async function clearDemoData(database: MushroomFarmDatabase = demoDb) {
  // صمام أمان لمنع مسح قاعدة بيانات الإنتاج الحقيقية
  if (database.name === 'MushroomProdDB') {
    throw new Error("CRITICAL SAFETY ERROR: Clearing the production database (MushroomProdDB) is strictly forbidden!");
  }

  // مسح وتصفير كافة الجداول تماماً لتهيئة المزرعة كمسودة بيضاء (Clean Slate)
  // مع الحفاظ التام على حسابات المدراء المشغلين والمشرفين
  await database.partners.clear();
  await database.greenhouses.clear();
  await database.cycles.clear();
  await database.inventory.clear();
  await database.petty_cash.clear();
  await database.transactions.clear();
  await database.expenses.clear();
  await database.operational_logs.clear();
  await database.employees.clear();
  await database.assets.clear();
  await database.production.clear();
}

// ==========================================
// 5. وظائف النسخ الاحتياطي المشفر والاستعادة والمعاملات الذرية
// ==========================================

export async function runAtomicTransaction<T>(
  database: MushroomFarmDatabase,
  tables: string[],
  callback: () => Promise<T>
): Promise<T> {
  return database.transaction('rw', tables as any, async () => {
    try {
      return await callback();
    } catch (error) {
      console.error('Database transaction failed, rolling back:', error);
      throw error;
    }
  });
}

export async function exportEncryptedBackup(database: MushroomFarmDatabase): Promise<{ filename: string; blob: Blob }> {
  const tables = [
    'users', 'partners', 'greenhouses', 'cycles', 'inventory',
    'petty_cash', 'transactions', 'expenses', 'operational_logs',
    'employees', 'assets', 'production'
  ];
  
  const backupData: Record<string, any[]> = {};
  
  // نستخدم معاملة قراءة فقط لضمان تماسك وتوافق البيانات
  await database.transaction('r', tables as any, async () => {
    for (const table of tables) {
      // بما أن خطافات القراءة (reading) تقوم بفك التشفير تلقائياً،
      // سنقوم هنا بالحصول على البيانات الخام غير المشفرة من الخطافات لتصديرها،
      // ثم نقوم بتشفير الملف بأكمله دفعة واحدة كطبقة حماية إضافية للنسخة الاحتياطية.
      // لتجنب خطاف reading في Dexie والحصول على النسخ المشفرة الحقيقية المخزنة،
      // يمكن استخدام map أو يمكن تشفير ملف JSON الناتج بـ xorEncryptDecrypt.
      // بما أننا نريد تشفير ملف الداتا بالكامل بصيغة .dat، فإن تشفير الـ JSON بالكامل بـ xorEncryptDecrypt ممتاز.
      backupData[table] = await database.table(table).toArray();
    }
  });
  
  const jsonString = JSON.stringify(backupData);
  const encryptedPayload = xorEncryptDecrypt(jsonString);
  
  const blob = new Blob([encryptedPayload], { type: 'application/octet-stream' });
  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
  const filename = `Mushroom_Backup_${todayStr}.dat`;
  
  return { filename, blob };
}

export async function importEncryptedBackup(database: MushroomFarmDatabase, fileContent: string): Promise<void> {
  const tables = [
    'users', 'partners', 'greenhouses', 'cycles', 'inventory',
    'petty_cash', 'transactions', 'expenses', 'operational_logs',
    'employees', 'assets', 'production'
  ];
  
  const decryptedJson = xorEncryptDecrypt(fileContent);
  const backupData = JSON.parse(decryptedJson) as Record<string, any[]>;
  
  // استيراد ذري كامل داخل معاملة كتابة
  await database.transaction('rw', tables as any, async () => {
    for (const table of tables) {
      if (backupData[table]) {
        await database.table(table).clear();
        await database.table(table).bulkPut(backupData[table]);
      }
    }
  });
}

