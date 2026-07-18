/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table, type PromiseExtended } from 'dexie';

// ==========================================
// 1. تعريف واجهات البيانات (Interfaces) لكل الجداول
// ==========================================

export interface User {
  id?: number;
  name: string;
  pin_code: string;
  role: 'Admin' | 'Supervisor' | 'Operator';
}

export interface Partner {
  id?: number;
  name: string;
  share_percentage: number;
  total_payouts: number;
  contribution_value: number;
  profit_percentage: number;
}

export interface Asset {
  id?: number;
  name: string;
  purchase_cost: number;
  purchase_date: string;
  useful_life: number;
  accumulated_depreciation: number;
}

export interface Production {
  id?: number;
  greenhouse_id: number;
  cycle_id: number;
  date: string;
  weight: number;
  grade: 'A' | 'B' | 'C';
}

export interface Greenhouse {
  id?: number;
  name: string;
  capacity: number;
  status: 'Active' | 'Maintenance';
}

export interface Cycle {
  id?: number;
  greenhouse_id: number;
  cycle_number: string;
  start_date: string;
  end_date?: string;
  status: 'Active' | 'Completed';
  initial_investment: number;
}

export interface InventoryItem {
  id?: number;
  date_added: string;
  item_name: string;
  quantity: number;
  unit: string;
  expiry_date?: string;
  min_stock_alert: number;
}

export interface PettyCash {
  id?: number;
  current_balance: number;
  last_updated: string;
}

export interface Transaction {
  id?: number;
  timestamp: string;
  user_id: number;
  operation_type: 'Deposit' | 'Withdrawal' | 'Correction';
  amount: number;
  balance_before: number;
  balance_after: number;
  details: string;
}

export interface Expense {
  id?: number;
  cycle_id: number;
  date: string;
  type: 'Operational' | 'Selling';
  details?: string;
  amount?: number;
  linked_inventory_item_id?: number;
  greenhouse_id?: number;
  total_boxes?: number;
  price_per_box?: number;
  customer_name?: string;
  paid_amount?: number;
  remaining_amount?: number;
  total_amount?: number;
  due_date?: string;
}

export interface OperationalLog {
  id?: number;
  cycle_id: number;
  date: string;
  temperature: number;
  humidity: number;
  co2_level: number;
  hygiene_status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  extra_notes?: string;
  operator_id: number;
  harvest_weight?: number;
  harvest_type?: string;
  harvest_grade?: 'A' | 'B' | 'C';
}

export interface Employee {
  id?: number;
  name: string;
  role?: string;
  base_salary: number;
  total_advances: number;
  total_bonuses: number;
  salary_type: 'fixed' | 'daily' | 'productivity';
  daily_rate?: number;
  productivity_price_per_box?: number;
}

// ==========================================
// 2. إعداد قاعدة بيانات Dexie والتهيئة (Offline Cache Only)
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

  override delete(closeOptions?: { disableAutoOpen: boolean }): PromiseExtended<void> {
    if (this.name === 'MushroomProdDB') {
      throw new Error("CRITICAL SAFETY ERROR: Deleting the production database (MushroomProdDB) is strictly forbidden!");
    }
    return super.delete(closeOptions);
  }

  constructor(name: string) {
    super(name);

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
    // ponytail: no encryption hooks — Firestore encrypts at rest
  }
}

export const prodDb = new MushroomFarmDatabase('MushroomProdDB');
export const demoDb = new MushroomFarmDatabase('MushroomDemoDB');
export const db = prodDb;

// ==========================================
// 3. دالة بذر البيانات الأولية (Seeding)
// ==========================================

export async function seedInitialData(database: MushroomFarmDatabase = prodDb) {
  await database.users.bulkPut([
    { id: 1, name: 'الإدارة العامة (مؤمن)', pin_code: '7391', role: 'Admin' },
    { id: 2, name: 'الإدارة العامة (محمود)', pin_code: '2846', role: 'Admin' },
    { id: 3, name: 'المشرف المناوب', pin_code: '9514', role: 'Supervisor' },
    { id: 4, name: 'المشغل الفني', pin_code: '8263', role: 'Operator' }
  ]);

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
// 4. منطق "وضع التجربة" (Demo Mode)
// ==========================================

export async function injectDemoData(database: MushroomFarmDatabase = demoDb) {
  await clearDemoData(database);

  await database.greenhouses.bulkPut([
    { id: 1, name: 'صوبة الإنتاج أ (محار أبيض)', capacity: 1500, status: 'Active' },
    { id: 2, name: 'صوبة الإنتاج ب (فطر أغاريكوس)', capacity: 2000, status: 'Active' },
    { id: 3, name: 'صوبة الحضن ج (التجهيز)', capacity: 1000, status: 'Maintenance' }
  ]);

  await database.partners.bulkPut([
    { id: 1, name: 'شريك مستثمر أ', share_percentage: 60, total_payouts: 0, contribution_value: 150000, profit_percentage: 60 },
    { id: 2, name: 'شريك مستثمر ب', share_percentage: 40, total_payouts: 0, contribution_value: 100000, profit_percentage: 40 }
  ]);

  await database.assets.bulkPut([
    { id: 1, name: 'جهاز تعقيم وحقن آلي', purchase_cost: 25000, purchase_date: '2025-01-01', useful_life: 5, accumulated_depreciation: 7500 },
    { id: 2, name: 'مكيف هواء صناعي بقوة 5 حصان', purchase_cost: 18000, purchase_date: '2025-06-01', useful_life: 6, accumulated_depreciation: 3250 },
    { id: 3, name: 'جهاز ترطيب ذكي فائق الضغط', purchase_cost: 8000, purchase_date: '2026-01-01', useful_life: 4, accumulated_depreciation: 1000 }
  ]);

  await database.petty_cash.put({
    id: 1,
    current_balance: 51500,
    last_updated: new Date().toISOString()
  });

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

  await database.employees.bulkPut([
    { id: 1, name: 'خالد أحمد', role: 'operator', base_salary: 4500, total_advances: 200, total_bonuses: 300, salary_type: 'fixed' },
    { id: 2, name: 'ياسر علي', role: 'operator', base_salary: 5000, total_advances: 0, total_bonuses: 150, salary_type: 'fixed' }
  ]);

  await database.inventory.bulkPut([
    { id: 1, date_added: '2026-06-01', item_name: 'أبواغ فطر محاري ممتاز', quantity: 150, unit: 'كيس تلقيح', expiry_date: '2026-12-01', min_stock_alert: 20 },
    { id: 2, date_added: '2026-06-01', item_name: 'مادة الجبس الزراعي الكالسي', quantity: 10, unit: 'شيكارة', min_stock_alert: 2 },
    { id: 3, date_added: '2026-06-01', item_name: 'صناديق كرتون للتعبئة', quantity: 500, unit: 'قطعة', min_stock_alert: 50 },
    { id: 4, date_added: '2026-06-01', item_name: 'محلول مطهر معقم فائق الفعالية', quantity: 5, unit: 'جالون', min_stock_alert: 3 }
  ]);

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

  await database.operational_logs.bulkPut([
    { id: 1, cycle_id: 1, date: '2026-06-20', temperature: 24, humidity: 85, co2_level: 800, hygiene_status: 'Excellent', operator_id: 4 },
    { id: 2, cycle_id: 1, date: '2026-06-21', temperature: 23, humidity: 88, co2_level: 850, hygiene_status: 'Good', operator_id: 4 }
  ]);

  await database.production.bulkPut([
    { id: 1, greenhouse_id: 1, cycle_id: 1, date: '2026-06-20', weight: 45, grade: 'A' },
    { id: 2, greenhouse_id: 1, cycle_id: 1, date: '2026-06-21', weight: 38, grade: 'B' }
  ]);
}

export async function clearDemoData(database: MushroomFarmDatabase = demoDb) {
  if (database.name === 'MushroomProdDB') {
    throw new Error("CRITICAL SAFETY ERROR: Clearing the production database (MushroomProdDB) is strictly forbidden!");
  }

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
// 5. النسخ الاحتياطي المشفر والاستعادة والمعاملات الذرية
// ==========================================

// ponytail: keep XOR file encryption for .dat exports only (file encryption, not storage encryption)
export function xorEncryptDecrypt(input: string): string {
  const key = 'mushroom_secure_vault_key_2026';
  let output = '';
  for (let i = 0; i < input.length; i++) {
    output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return output;
}

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
  await database.transaction('r', tables as any, async () => {
    for (const table of tables) {
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

  await database.transaction('rw', tables as any, async () => {
    for (const table of tables) {
      if (backupData[table]) {
        await database.table(table).clear();
        await database.table(table).bulkPut(backupData[table]);
      }
    }
  });
}

// ==========================================
// 6. Firestore Sync Integration Points
// ==========================================

const SYNC_TABLES = [
  'users', 'partners', 'greenhouses', 'cycles', 'inventory',
  'petty_cash', 'transactions', 'expenses', 'operational_logs',
  'employees', 'assets', 'production'
] as const;

type SyncTableName = typeof SYNC_TABLES[number];

let _syncWriteDoc: ((collection: string, id: string | number, data: any) => Promise<void>) | null = null;
let _syncDeleteDoc: ((collection: string, id: string | number) => Promise<void>) | null = null;

/** Register Firestore write handlers (called once from App.tsx init). */
export function registerSyncHandlers(
  writeDoc: (collection: string, id: string | number, data: any) => Promise<void>,
  deleteDoc: (collection: string, id: string | number) => Promise<void>
) {
  _syncWriteDoc = writeDoc;
  _syncDeleteDoc = deleteDoc;
}

/** Write a single document to Firestore after local mutation. */
export async function syncDocToFirestore(tableName: string, id: string | number, data: any): Promise<void> {
  if (!_syncWriteDoc) return;
  try {
    await _syncWriteDoc(tableName, id, data);
  } catch (e) {
    console.warn(`[sync] write "${tableName}/${id}" failed:`, e);
  }
}

/** Delete a single document from Firestore. */
export async function deleteDocFromFirestore(tableName: string, id: string | number): Promise<void> {
  if (!_syncDeleteDoc) return;
  try {
    await _syncDeleteDoc(tableName, id);
  } catch (e) {
    console.warn(`[sync] delete "${tableName}/${id}" failed:`, e);
  }
}
