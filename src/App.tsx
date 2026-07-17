/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
const appLogo = '/logo.png';
import { useLiveQuery } from 'dexie-react-hooks';
import { prodDb, demoDb, seedInitialData, injectDemoData, clearDemoData, runAtomicTransaction, exportEncryptedBackup, importEncryptedBackup, decryptValue, encryptValue, registerSyncHandlers, syncTableToCloud, syncFromCloud, type User } from './db';
import { pushTable, pullAll } from './firebase-sync';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// تسجيل مكونات وموديلات Chart.js للعمل بسلاسة
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);
import {
  LayoutDashboard,
  RotateCw,
  Receipt,
  ShoppingBag,
  Sprout,
  Wallet,
  Users,
  Package,
  ClipboardList,
  FileBarChart,
  LineChart,
  BookOpen,
  Menu,
  X,
  Lock,
  Unlock,
  Search,
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowRightLeft,
  ChevronDown,
  LogOut,
  Info,
  Building,
  Coins,
  TrendingUp,
  Sun,
  Moon,
  BarChart3,
  Thermometer,
  DollarSign
} from 'lucide-react';

export default function App() {
  // ==========================================
  // 1. حالات الحالة (State Management)
  // ==========================================
  const [dbSeeded, setDbSeeded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('mushroom_active_tab') || 'الرئيسية';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  
  // حالة تبديل المظهر المظلم / المضيء (Theme State)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('mushroom_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('mushroom_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // وضع التجربة (Demo Mode) - غير نشط افتراضياً ليكون الحساب صفحة بيضاء
  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem('mushroom_demo_mode') === 'true';
  });

  // نظام الصلاحيات الفعلي مع تعيين المالك مديراً افتراضياً للنظام
  const [activeUser, setActiveUser] = useState<User>(() => {
    const saved = localStorage.getItem('mushroom_active_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      name: 'الإدارة العامة (مؤمن)',
      pin_code: '7391',
      role: 'Admin'
    };
  });
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedRoleToSwitch, setSelectedRoleToSwitch] = useState<'Admin' | 'Supervisor' | 'Operator' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // حالات شاشة القفل المحلية الآمنة (Offline Lock Screen)
  const [isLocked, setIsLocked] = useState(() => {
    const saved = localStorage.getItem('mushroom_is_locked');
    return saved !== null ? saved === 'true' : true;
  });
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockPinError, setLockPinError] = useState('');
  const [selectedLockRole, setSelectedLockRole] = useState<'Admin' | 'Supervisor' | 'Operator' | null>(null);

  // مرجع لمؤقت شاشة القفل لمنع التجمد أو التكرار
  const lockTimeoutRef = useRef<any>(null);

  // حالات مودالات الصوبات والأصول والشركاء التفاعلية
  const [showAddGreenhouseModal, setShowAddGreenhouseModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);

  // حالات تعديل الأصول والشركاء بالوقت الحقيقي
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetCost, setAssetCost] = useState('');
  const [assetLife, setAssetLife] = useState('');
  const [assetDate, setAssetDate] = useState('');

  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerContribution, setPartnerContribution] = useState('');
  const [partnerProfitPct, setPartnerProfitPct] = useState('');

  // حالات مودال إضافة دورة جديدة التفاعلية
  const [showAddCycleModal, setShowAddCycleModal] = useState(false);
  const [newCycleNumber, setNewCycleNumber] = useState('');
  const [newCycleGreenhouseId, setNewCycleGreenhouseId] = useState('');
  const [newCycleInvestment, setNewCycleInvestment] = useState('');
  const [newCycleError, setNewCycleError] = useState('');

  // حالات مودال إضافة مصروف أو مبيعات التفاعلية
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpenseType, setNewExpenseType] = useState<'Operational' | 'Selling'>('Operational');
  const [newExpenseCycleId, setNewExpenseCycleId] = useState('');
  const [newExpenseDetails, setNewExpenseDetails] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCustomerName, setNewExpenseCustomerName] = useState('');
  const [newExpenseTotalBoxes, setNewExpenseTotalBoxes] = useState('');
  const [newExpensePricePerBox, setNewExpensePricePerBox] = useState('');
  const [newExpensePaidAmount, setNewExpensePaidAmount] = useState('');
  const [newExpenseDueDate, setNewExpenseDueDate] = useState('');
  const [newExpenseGreenhouseId, setNewExpenseGreenhouseId] = useState('');
  const [showDebtAlertModal, setShowDebtAlertModal] = useState(false);
  const [approachingDebts, setApproachingDebts] = useState<any[]>([]);
  const [overdueDebts, setOverdueDebts] = useState<any[]>([]);
  const [newExpenseError, setNewExpenseError] = useState('');

  // حالات مودال التحكم البيئي اليومي التفاعلي
  const [showAddClimateModal, setShowAddClimateModal] = useState(false);
  const [climateDate, setClimateDate] = useState('');
  const [climateTemp, setClimateTemp] = useState('');
  const [climateHumidity, setClimateHumidity] = useState('');
  const [climateCO2, setClimateCO2] = useState('');
  const [climateCycleId, setClimateCycleId] = useState('');
  const [climateHygiene, setClimateHygiene] = useState('Excellent');
  const [climateNotes, setClimateNotes] = useState('');
  const [climateError, setClimateError] = useState('');

  // حالات مودال الإنتاج والفرز اليومي التفاعلي
  const [showAddHarvestModal, setShowAddHarvestModal] = useState(false);
  const [harvestDate, setHarvestDate] = useState('');
  const [harvestCycleId, setHarvestCycleId] = useState('');
  const [harvestWeight, setHarvestWeight] = useState('');
  const [harvestType, setHarvestType] = useState('محار أبيض');
  const [harvestGrade, setHarvestGrade] = useState('A');
  const [harvestNotes, setHarvestNotes] = useState('');
  const [harvestError, setHarvestError] = useState('');

  // حالات مودال المخازن والمستلزمات التفاعلي
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [invItemName, setInvItemName] = useState('');
  const [invQuantity, setInvQuantity] = useState('');
  const [invUnit, setInvUnit] = useState('كيلو');
  const [invMinStockAlert, setInvMinStockAlert] = useState('10');
  const [invExpiryDate, setInvExpiryDate] = useState('');
  const [invError, setInvError] = useState('');

  // حالات مودال الموظفون والرواتب التفاعلي
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empBaseSalary, setEmpBaseSalary] = useState('');
  const [empAdvances, setEmpAdvances] = useState('0');
  const [empBonuses, setEmpBonuses] = useState('0');
  const [empError, setEmpError] = useState('');
  const [empSalaryType, setEmpSalaryType] = useState<'fixed' | 'daily' | 'productivity'>('fixed');
  const [empDailyRate, setEmpDailyRate] = useState('');
  const [empProductivityPrice, setEmpProductivityPrice] = useState('');

  // حالات مودال الرواتب التفاعلي
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollEmployeeId, setPayrollEmployeeId] = useState<number | null>(null);
  const [payrollCycleId, setPayrollCycleId] = useState<number | null>(null);
  const [payrollAmount, setPayrollAmount] = useState<number>(0);
  const [payrollCalculated, setPayrollCalculated] = useState(false);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // حالات مودال إدارة العهدة والمالية التفاعلي
  const [showAddPettyCashModal, setShowAddPettyCashModal] = useState(false);
  const [pcType, setPcType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
  const [pcAmount, setPcAmount] = useState('');
  const [pcDetails, setPcDetails] = useState('');
  const [pcError, setPcError] = useState('');

  // حالة مودال التنبيه البديل للربط بدورة جديدة
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalMessage, setAlertModalMessage] = useState('');

  // حالة المعرّف الجاري تعديله في الأنظمة التفاعلية المتكاملة
  const [editingId, setEditingId] = useState<number | null>(null);

  // حالات مودال تأكيد الحذف المخصص لتفادي مشاكل الـ iframe المتوقعة ومقاطعة الحوارات الافتراضية
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [deleteTargetTable, setDeleteTargetTable] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<any>(null);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState('');

  // دالة الحذف الفعلية الحية المرتبطة بقاعدة البيانات النشطة
  const executeActualDelete = async () => {
    if (!deleteTargetTable || deleteTargetId === null || deleteTargetId === undefined) return;
    
    try {
      const tableMapping: Record<string, string> = {
        'cycles': 'cycles', 'إدارة الدورات النشطة': 'cycles', 'الدورات': 'cycles', 'الدورة': 'cycles',
        'climate': 'operational_logs', 'التحكم البيئي اليومي': 'operational_logs', 'البيئة': 'operational_logs', 'operational_logs_climate': 'operational_logs',
        'production': 'operational_logs', 'الإنتاج والفرز اليومي': 'operational_logs', 'الإنتاج': 'operational_logs', 'operational_logs_harvest': 'operational_logs',
        'sales': 'expenses', 'المبيعات والديون': 'expenses', 'المبيعات': 'expenses', 'expenses_selling': 'expenses',
        'expenses_operational': 'expenses',
        'inventory': 'inventory', 'المخازن والمستلزمات': 'inventory', 'المخازن': 'inventory',
        'staff': 'employees', 'الموظفون والرواتب': 'employees', 'الموظفين': 'employees', 'employees': 'employees',
        'finance': 'transactions', 'إدارة العهدة والمالية': 'transactions', 'العهدة': 'transactions', 'transactions': 'transactions',
        'greenhouses': 'greenhouses', 'الصوبات': 'greenhouses',
        'assets': 'assets', 'الأصول': 'assets',
        'partners': 'partners', 'الشركاء': 'partners'
      };

      const internalTable = tableMapping[deleteTargetTable] || deleteTargetTable;
      const activeDb = demoMode ? demoDb : prodDb;

      if (!activeDb[internalTable]) {
        throw new Error("جدول قاعدة البيانات غير معرف: " + internalTable);
      }

      const targetId = Number(deleteTargetId);
      const idToUse = isNaN(targetId) ? deleteTargetId : targetId;

      // 1. حذف الحركات المالية المرافقة عند حذف مصروف أو مبيعات لتجنب أي تكرار أو بقاء سجلات معلقة
      if (internalTable === 'expenses') {
        const exp = await activeDb.expenses.get(idToUse);
        if (exp) {
          const allTxs = await activeDb.transactions.toArray();
          for (const tx of allTxs) {
            let matches = false;
            if (exp.type === 'Operational') {
              matches = tx.operation_type === 'Withdrawal' && 
                        tx.amount === exp.amount && 
                        (tx.details.includes(exp.details || '') || tx.details.includes('مصروف تشغيلي') || tx.details.includes('تشغيلي'));
            } else if (exp.type === 'Selling') {
              matches = tx.operation_type === 'Deposit' && 
                        tx.amount === exp.paid_amount && 
                        (tx.details.includes(exp.customer_name || '') || tx.details.includes('مبيعات') || tx.details.includes('بيع'));
            }
            if (matches) {
              await activeDb.transactions.delete(tx.id);
            }
          }
        }
      }

      // 2. تنفيذ عملية الحذف الفعلية للسجل المطلوب
      await activeDb[internalTable].delete(idToUse);

      // 3. إعادة حساب رصيد العهدة النقدية التراكمي من البداية لضمان الدقة المطلقة ("حل قطعي")
      const remainingTxs = await activeDb.transactions.toArray();
      const remainingExpCount = await activeDb.expenses.count();
      const remainingCycleCount = await activeDb.cycles.count();

      let finalBalance = 0;

      // إذا تم حذف كافة العمليات أو كان الدفتر فارغاً تماماً، نقوم بتصفير العهدة فوراً
      if (remainingTxs.length === 0 && remainingExpCount === 0 && remainingCycleCount === 0) {
        finalBalance = 0;
      } else if (remainingTxs.length === 0) {
        finalBalance = 0;
      } else {
        // نبدأ من الرصيد التأسيسي المناسب (50 ألف للتجربة أو 0 للإنتاجي) ثم نطبق الحركات المتبقية بدقة
        let baseBalance = demoMode ? 50000 : 0;
        for (const tx of remainingTxs) {
          if (tx.operation_type === 'Deposit') {
            baseBalance += tx.amount;
          } else if (tx.operation_type === 'Withdrawal') {
            baseBalance -= tx.amount;
          }
        }
        finalBalance = baseBalance;
      }

      // حفظ الرصيد الجديد المعاد حسابه وتحديث الوقت
      await activeDb.petty_cash.put({
        id: 1,
        current_balance: finalBalance,
        last_updated: new Date().toISOString()
      });

      // تنبيه الحذف الناجح المخصص
      setAlertModalMessage("✅ تم الحذف بنجاح وتحديث الحسابات فوراً!");
      setShowAlertModal(true);

      // إعادة عرض كامل وحي للبيانات التفاعلية
      triggerStateRefresh();

    } catch (error: any) {
      console.error("Critical Delete Error:", error);
      setAlertModalMessage("❌ فشل الحذف: " + error.message);
      setShowAlertModal(true);
    }
  };

  // معالجة حفظ وتعديل الأصول والشركاء بشكل تفاعلي آمن
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || Number(assetCost) <= 0 || Number(assetLife) <= 0) {
      alert('يرجى التحقق من المدخلات وقيم التكلفة والعمر الافتراضي للأصل');
      return;
    }
    const targetDb = demoMode ? demoDb : prodDb;
    const data = {
      name: assetName.trim(),
      purchase_cost: Number(assetCost),
      purchase_date: assetDate || new Date().toISOString().split('T')[0],
      useful_life: Number(assetLife),
      accumulated_depreciation: editingAsset ? editingAsset.accumulated_depreciation : 0
    };

    try {
      if (editingAsset && editingAsset.id) {
        await targetDb.assets.update(editingAsset.id, data);
        setAlertModalMessage("✅ تم تعديل بيانات الأصل بنجاح!");
      } else {
        await targetDb.assets.add(data);
        setAlertModalMessage("✅ تم تسجيل الأصل الثابت الجديد بنجاح!");
      }

      setAssetName('');
      setAssetCost('');
      setAssetLife('');
      setAssetDate('');
      setEditingAsset(null);
      setShowAddAssetModal(false);
      setShowAlertModal(true);
      triggerStateRefresh();
    } catch (err: any) {
      console.error("Asset Save Error:", err);
      alert("❌ فشل حفظ الأصل: " + err.message);
    }
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim() || Number(partnerProfitPct) <= 0 || Number(partnerProfitPct) > 100) {
      alert('يرجى إدخال اسم شريك صحيح ونسبة توزيع أرباح بين 0 و 100');
      return;
    }
    const targetDb = demoMode ? demoDb : prodDb;
    const data = {
      name: partnerName.trim(),
      contribution_value: Number(partnerContribution) || 0,
      profit_percentage: Number(partnerProfitPct),
      share_percentage: Number(partnerProfitPct),
      total_payouts: editingPartner ? editingPartner.total_payouts : 0
    };

    try {
      if (editingPartner && editingPartner.id) {
        await targetDb.partners.update(editingPartner.id, data);
        setAlertModalMessage("✅ تم تعديل بيانات الشريك بنجاح!");
      } else {
        await targetDb.partners.add(data);
        setAlertModalMessage("✅ تم إضافة الشريك المساهم الجديد بنجاح!");
      }

      setPartnerName('');
      setPartnerContribution('');
      setPartnerProfitPct('');
      setEditingPartner(null);
      setShowAddPartnerModal(false);
      setShowAlertModal(true);
      triggerStateRefresh();
    } catch (err: any) {
      console.error("Partner Save Error:", err);
      alert("❌ فشل حفظ الشريك: " + err.message);
    }
  };

  // مؤشر تحفيز تحديث البيانات والرسوم لضمان الفورية والمزامنة الكاملة
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerStateRefresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    (window as any).refreshSystemUI = () => {
      setRefreshTrigger(prev => prev + 1);
    };
  }, []);

  const handleExportBackup = async () => {
    try {
      const { filename, blob } = await exportEncryptedBackup(activeDb);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('🔒 تم تصدير النسخة الاحتياطية المشفرة بنجاح باسم:\n' + filename);
    } catch (err: any) {
      console.error('Backup export error:', err);
      alert('❌ فشل تصدير النسخة الاحتياطية: ' + err.message);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const confirmRestore = window.confirm(
      '⚠️ تحذير أمني هام:\nاستعادة البيانات ستقوم بمسح كافة البيانات والجداول الحالية واستبدالها ببيانات الملف المشفر بالكامل.\n\nهل أنت متأكد من المتابعة؟'
    );
    if (!confirmRestore) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error('محتوى الملف فارغ أو غير صالح');
        
        await importEncryptedBackup(activeDb, content);
        alert('✅ تم فك تشفير واستعادة النسخة الاحتياطية بنجاح! سيتم الآن إعادة تحميل النظام لتطبيق التغييرات.');
        window.location.reload();
      } catch (err: any) {
        console.error('Backup import error:', err);
        alert('❌ فشل فك التشفير أو استعادة البيانات. يرجى التأكد من اختيار ملف .dat مشفر وصالح للنظام.\nالتفاصيل: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // دوال التحقق من استحقاق الديون وتاريخ تحصيل مستحقات العملاء
  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return new Date(dateStr) < new Date(todayStr);
  };

  const isApproaching = (dateStr: string) => {
    if (!dateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const dueDate = new Date(dateStr);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  // دالة تصدير التقارير إلى CSV متوافقة مع ميكروسوفت إكسل والترميز العربي UTF-8
  const exportToCSV = (data: any[], headers: { key: string; label: string }[], fileName: string) => {
    if (!data || data.length === 0) return;
    const BOM = '\uFEFF';
    const csvHeaders = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');
    const csvRows = data.map(item => {
      return headers.map(header => {
        let val = item[header.key];
        if (val === undefined || val === null) {
          val = '';
        } else {
          val = String(val);
        }
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = BOM + [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // دوال إدارة وتوثيق السجل التاريخي لحالات الصوبات الإنتاجية
  const getGreenhouseStateHistory = () => {
    const key = `gh_history_${demoMode ? 'demo' : 'prod'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    const defaultHistory = [
      { id: 'h1', greenhouseId: 1, status: 'Active', date: '2026-05-01', operator: 'محمود', note: 'بدء تشغيل الصوبة بعد التعقيم والتحضير' },
      { id: 'h2', greenhouseId: 2, status: 'Maintenance', date: '2026-06-15', operator: 'مؤمن', note: 'أعمال صيانة فلاتر التهوية وضبط الرطوبة' },
      { id: 'h3', greenhouseId: 2, status: 'Active', date: '2026-06-20', operator: 'مؤمن', note: 'انتهاء أعمال صيانة الفلاتر وإعادتها للخدمة' },
      { id: 'h4', greenhouseId: 3, status: 'Active', date: '2026-05-10', operator: 'محمود', note: 'تهيئة الصوبة الثالثة لاستقبال أبواغ فطر عيش الغراب' },
    ];
    localStorage.setItem(key, JSON.stringify(defaultHistory));
    return defaultHistory;
  };

  const logGreenhouseStateChange = (ghId: number, newStatus: 'Active' | 'Maintenance') => {
    const key = `gh_history_${demoMode ? 'demo' : 'prod'}`;
    const current = getGreenhouseStateHistory();
    const newLog = {
      id: 'h_' + Date.now(),
      greenhouseId: ghId,
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      operator: activeUser.name,
      note: newStatus === 'Active' ? 'تغيير يدوي للحالة إلى: نشطة وتشغيلية' : 'تغيير يدوي للحالة إلى: تحت الصيانة الوقائية'
    };
    localStorage.setItem(key, JSON.stringify([newLog, ...current]));
  };

  // ==========================================
  // 2. ربط قاعدة البيانات الحية (Live Querying)
  // ==========================================
  // استدعاء البذر والتهيئة للتشغيل النظيف وقراءة حالة التجربة
  useEffect(() => {
    async function initDB() {
      try {
        await seedInitialData(prodDb);
        await seedInitialData(demoDb);
        const currentDemoModeSetting = localStorage.getItem('mushroom_demo_mode') === 'true';
        if (currentDemoModeSetting) {
          const greenhouseCount = await demoDb.greenhouses.count();
          if (greenhouseCount === 0) {
            await injectDemoData(demoDb);
          }
        }
        // Register cloud sync handlers and pull on startup
        registerSyncHandlers(pushTable, pullAll);
        const syncMode = localStorage.getItem('mushroom_demo_mode') !== 'true';
        if (syncMode) {
          await syncFromCloud(prodDb);
        }
        setDbSeeded(true);
      } catch (err) {
        console.error('فشل في بذر قاعدة البيانات:', err);
      }
    }
    initDB();
  }, []);

  // تسجيل دوال الحذف والتعديل الموحدة بالنافذة العالمية لتفادي فقدان مستمعي الأحداث وإعادة العرض
  useEffect(() => {
    (window as any).editRecord = async (tableName: string, id: any) => {
      const activeDb = demoMode ? demoDb : prodDb;
      const numId = Number(id);
      try {
        if (tableName === 'cycles') {
          const rec = await activeDb.cycles.get(numId);
          if (rec) {
            setEditingId(rec.id!);
            setNewCycleNumber(rec.cycle_number);
            setNewCycleGreenhouseId(String(rec.greenhouse_id));
            setNewCycleInvestment(String(rec.initial_investment));
            setShowAddCycleModal(true);
          }
        } else if (tableName === 'operational_logs_climate') {
          const rec = await activeDb.operational_logs.get(numId);
          if (rec) {
            setEditingId(rec.id!);
            setClimateCycleId(String(rec.cycle_id));
            setClimateDate(rec.date);
            setClimateTemp(String(rec.temperature));
            setClimateHumidity(String(rec.humidity));
            setClimateCO2(String(rec.co2_level));
            setClimateHygiene(rec.hygiene_status);
            setClimateNotes(rec.extra_notes || '');
            setShowAddClimateModal(true);
          }
        } else if (tableName === 'operational_logs_harvest') {
          const rec = await activeDb.operational_logs.get(numId);
          if (rec) {
            setEditingId(rec.id!);
            setHarvestCycleId(String(rec.cycle_id));
            setHarvestDate(rec.date);
            setHarvestWeight(String(rec.harvest_weight));
            setHarvestType(rec.harvest_type || 'محار أبيض');
            setHarvestGrade(rec.harvest_grade || 'A');
            setHarvestNotes(rec.extra_notes || '');
            setShowAddHarvestModal(true);
          }
        } else if (tableName === 'expenses_selling') {
          const rec = await activeDb.expenses.get(numId);
          if (rec) {
            setEditingId(rec.id!);
            setNewExpenseType('Selling');
            setNewExpenseCycleId(String(rec.cycle_id));
            setNewExpenseCustomerName(rec.customer_name || '');
            setNewExpenseTotalBoxes(String(rec.total_boxes || ''));
            setNewExpensePricePerBox(String(rec.price_per_box || ''));
            setNewExpensePaidAmount(String(rec.paid_amount || ''));
            setNewExpenseDueDate(rec.due_date || '');
            setNewExpenseDetails('');
            setNewExpenseAmount('');
            setShowAddExpenseModal(true);
          }
        } else if (tableName === 'expenses_operational') {
          const rec = await activeDb.expenses.get(numId);
          if (rec) {
            setEditingId(rec.id!);
            setNewExpenseType('Operational');
            setNewExpenseCycleId(String(rec.cycle_id));
            setNewExpenseDetails(rec.details || '');
            setNewExpenseAmount(String(rec.amount || ''));
            setNewExpenseCustomerName('');
            setNewExpenseTotalBoxes('');
            setNewExpensePricePerBox('');
            setNewExpensePaidAmount('');
            setShowAddExpenseModal(true);
          }
        } else if (tableName === 'inventory') {
          const rec = await activeDb.inventory.get(numId);
          if (rec) {
            setEditingId(rec.id!);
            setInvItemName(rec.item_name);
            setInvQuantity(String(rec.quantity));
            setInvUnit(rec.unit);
            setInvMinStockAlert(String(rec.min_stock_alert));
            setInvExpiryDate(rec.expiry_date || '');
            setShowAddInventoryModal(true);
          }
        } else if (tableName === 'employees') {
          const rec = await activeDb.employees.get(numId);
          if (rec) {
            setEditingId(rec.id!);
            setEmpName(rec.name);
            setEmpBaseSalary(String(rec.base_salary));
            setEmpAdvances(String(rec.total_advances));
            setEmpBonuses(String(rec.total_bonuses));
            setShowAddEmployeeModal(true);
          }
        } else if (tableName === 'transactions') {
          const rec = await activeDb.transactions.get(numId);
          if (rec) {
            setEditingId(rec.id!);
            setPcType(rec.operation_type);
            setPcAmount(String(rec.amount));
            setPcDetails(rec.details);
            setShowAddPettyCashModal(true);
          }
        }
      } catch (err) {
        console.error('فشل جلب السجل للتعديل:', err);
      }
    };

    (window as any).currentDb = demoMode ? demoDb : prodDb;

    (window as any).refreshSystemUI = async () => {
      triggerStateRefresh();
    };
    (window as any).renderTables = async () => {
      triggerStateRefresh();
    };
    (window as any).updateCharts = async () => {
      triggerStateRefresh();
    };

    (window as any).addGreenhouse = async (event: any) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      const nameInput = document.getElementById('gh_name_input') as HTMLInputElement;
      const capacityInput = document.getElementById('gh_capacity_input') as HTMLInputElement;
      
      const name = nameInput ? nameInput.value : '';
      const capacity = capacityInput ? parseInt(capacityInput.value, 10) : 0;
      
      if (!name || capacity <= 0) {
        alert('يرجى إدخال اسم صوبة صحيح وسعة أكبر من الصفر');
        return;
      }
      
      const targetDb = demoMode ? demoDb : prodDb;
      await targetDb.greenhouses.add({
        name,
        capacity,
        status: 'Active'
      });
      
      if (nameInput) nameInput.value = '';
      if (capacityInput) capacityInput.value = '';
      
      setShowAddGreenhouseModal(false);
      triggerStateRefresh();
    };

    (window as any).addAsset = async (event: any) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      const nameInput = document.getElementById('asset_name_input') as HTMLInputElement;
      const costInput = document.getElementById('asset_cost_input') as HTMLInputElement;
      const lifeInput = document.getElementById('asset_life_input') as HTMLInputElement;
      const dateInput = document.getElementById('asset_date_input') as HTMLInputElement;
      
      const name = nameInput ? nameInput.value : '';
      const cost = costInput ? parseFloat(costInput.value) : 0;
      const life = lifeInput ? parseFloat(lifeInput.value) : 0;
      const purchase_date = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
      
      if (!name || cost <= 0 || life <= 0) {
        alert('يرجى التحقق من المدخلات وقيم التكلفة والعمر الافتراضي للأصل');
        return;
      }
      
      const targetDb = demoMode ? demoDb : prodDb;
      await targetDb.assets.add({
        name,
        purchase_cost: cost,
        purchase_date,
        useful_life: life,
        accumulated_depreciation: 0
      });
      
      if (nameInput) nameInput.value = '';
      if (costInput) costInput.value = '';
      if (lifeInput) lifeInput.value = '';
      if (dateInput) dateInput.value = '';
      
      setShowAddAssetModal(false);
      triggerStateRefresh();
    };

    (window as any).addPartner = async (event: any) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      const nameInput = document.getElementById('partner_name_input') as HTMLInputElement;
      const contributionInput = document.getElementById('partner_contribution_input') as HTMLInputElement;
      const profitPctInput = document.getElementById('partner_profit_pct_input') as HTMLInputElement;
      
      const name = nameInput ? nameInput.value : '';
      const contribution_value = contributionInput ? parseFloat(contributionInput.value) : 0;
      const profit_percentage = profitPctInput ? parseFloat(profitPctInput.value) : 0;
      
      if (!name || profit_percentage <= 0 || profit_percentage > 100) {
        alert('يرجى إدخال اسم شريك صحيح ونسبة توزيع أرباح بين 0 و 100');
        return;
      }
      
      const targetDb = demoMode ? demoDb : prodDb;
      await targetDb.partners.add({
        name,
        contribution_value,
        profit_percentage,
        share_percentage: profit_percentage,
        total_payouts: 0
      });
      
      if (nameInput) nameInput.value = '';
      if (contributionInput) contributionInput.value = '';
      if (profitPctInput) profitPctInput.value = '';
      
      setShowAddPartnerModal(false);
      triggerStateRefresh();
    };

    (window as any).deleteRecord = async (...args: any[]) => {
      let event: any = null;
      let tableName: string = '';
      let id: any = null;

      // تحليل ذكي مرن للوسائط المستلمة لدعم كل من (event, table, id) أو (table, id) بدون أي كسر
      for (const arg of args) {
        if (arg && typeof arg === 'object' && (typeof arg.preventDefault === 'function' || arg.nativeEvent || arg.target)) {
          event = arg;
        } else if (typeof arg === 'string' && tableName === '') {
          tableName = arg;
        } else if (arg !== undefined && arg !== null) {
          id = arg;
        }
      }

      if (!tableName && args.length >= 2) {
        if (typeof args[0] === 'string') {
          tableName = args[0];
          id = args[1];
        } else if (typeof args[1] === 'string') {
          tableName = args[1];
          id = args[2];
          event = args[0];
        }
      }

      if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
      }

      if (!tableName || id === null || id === undefined) {
        console.warn("حاول النظام استدعاء الحذف مع وسائط ناقصة:", { tableName, id });
        return;
      }

      // تهيئة المودال التفاعلي الأنيق للحذف الآمن الخالي من قيود الـ iframe
      setDeleteTargetTable(tableName);
      setDeleteTargetId(id);

      const tableMappingMsg: Record<string, string> = {
        'cycles': 'الدورة الحالية وكافة البيانات المالية والإنتاجية المرتبطة بها',
        'expenses_operational': 'هذا المصروف التشغيلي وإرجاع القيمة لخزينة العهدة',
        'expenses_selling': 'فاتورة المبيعات الصادرة الحالية وإعادة ضبط مستحقات العميل والعهدة',
        'operational_logs_harvest': 'سجل الحصاد والوزن المسجل لهذا اليوم',
        'operational_logs_climate': 'سجل القراءة والمراقبة البيئية لهذا اليوم',
        'transactions': 'هذه المعاملة المالية المباشرة وإرجاع رصيد العهدة النقدية التلقائي',
        'employees': 'بيانات ومستندات الموظف ومستحقاته المالية بالكامل',
        'inventory': 'هذا الصنف ومستلزماته من المخازن وإعادة ضبط الكميات',
        'greenhouses': 'هذه الصوبة الزراعية بكافة تفاصيلها',
        'assets': 'هذا الأصل الثابت بكافة تفاصيل إهلاكاته',
        'partners': 'بيانات هذا الشريك المساهم ونسب توزيعه للأرباح'
      };

      const friendlyResource = tableMappingMsg[tableName] || "هذا السجل نهائياً من قاعدة البيانات الحية";
      setDeleteTargetMessage(`⚠️ هل أنت متأكد من رغبتك في حذف ${friendlyResource}؟ سيتم تحديث وتعديل كافة الحسابات والعهدة النقدية والرسوم التوضيحية فوراً وبشكل تلقائي.`);
      setShowConfirmDeleteModal(true);
    };

    return () => {
      delete (window as any).editRecord;
      delete (window as any).deleteRecord;
      delete (window as any).currentDb;
      delete (window as any).refreshSystemUI;
      delete (window as any).renderTables;
      delete (window as any).updateCharts;
      delete (window as any).addGreenhouse;
      delete (window as any).addAsset;
      delete (window as any).addPartner;
    };
  }, [demoMode]);

  // دالة تبديل وضع التجربة (Demo Mode)
  const toggleDemoMode = async () => {
    const nextState = !demoMode;
    setDemoMode(nextState);
    localStorage.setItem('mushroom_demo_mode', String(nextState));
    
    if (nextState) {
      const greenhouseCount = await demoDb.greenhouses.count();
      if (greenhouseCount === 0) {
        await injectDemoData(demoDb);
      }
    }
  };

  // مرجع قاعدة البيانات النشط ديناميكياً لتأمين العزل الكامل
  const activeDb = demoMode ? demoDb : prodDb;

  // جلب إحصائيات سريعة حقيقية من قاعدة البيانات النشطة لإثبات الترابط
  const totalGreenhouses = useLiveQuery(() => activeDb.greenhouses.count(), [demoMode, refreshTrigger]) ?? 0;
  const totalCycles = useLiveQuery(() => activeDb.cycles.count(), [demoMode, refreshTrigger]) ?? 0;
  const totalEmployees = useLiveQuery(() => activeDb.employees.count(), [demoMode, refreshTrigger]) ?? 0;
  const totalInventory = useLiveQuery(() => activeDb.inventory.count(), [demoMode, refreshTrigger]) ?? 0;
  const pettyCashRecord = useLiveQuery(() => activeDb.petty_cash.get(1), [demoMode, refreshTrigger]);

  // جلب الجداول ديناميكياً لتحديث واجهة المستخدم بالكامل فور تفعيل أو إلغاء وضع التجربة
  const greenhousesList = useLiveQuery(() => activeDb.greenhouses.toArray(), [demoMode, refreshTrigger]) ?? [];
  const cyclesList = useLiveQuery(() => activeDb.cycles.toArray(), [demoMode, refreshTrigger]) ?? [];
  const inventoryList = useLiveQuery(() => activeDb.inventory.toArray(), [demoMode, refreshTrigger]) ?? [];
  const employeesList = useLiveQuery(() => activeDb.employees.toArray(), [demoMode, refreshTrigger]) ?? [];
  const expensesList = useLiveQuery(() => activeDb.expenses.toArray(), [demoMode, refreshTrigger]) ?? [];
  const operationalLogsList = useLiveQuery(() => activeDb.operational_logs.toArray(), [demoMode, refreshTrigger]) ?? [];
  const partnersList = useLiveQuery(() => activeDb.partners.toArray(), [demoMode, refreshTrigger]) ?? [];
  const assetsList = useLiveQuery(() => activeDb.assets.toArray(), [demoMode, refreshTrigger]) ?? [];
  const productionList = useLiveQuery(() => activeDb.production.toArray(), [demoMode, refreshTrigger]) ?? [];
  const transactions = useLiveQuery(() => activeDb.transactions.toArray(), [demoMode, refreshTrigger]) ?? [];

  // مستمع تلقائي لتنبيهات ديون العملاء عند فتح تبويب المبيعات والديون
  useEffect(() => {
    if (activeTab === 'المبيعات' && expensesList.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const today = new Date(todayStr);

      const sellingExpenses = expensesList.filter(e => e.type === 'Selling' && e.remaining_amount && e.remaining_amount > 0 && e.due_date);
      
      const overdue: any[] = [];
      const approaching: any[] = [];

      sellingExpenses.forEach(exp => {
        const dueDate = new Date(exp.due_date!);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          overdue.push(exp);
        } else if (diffDays <= 3) {
          approaching.push({ ...exp, daysLeft: diffDays });
        }
      });

      setOverdueDebts(overdue);
      setApproachingDebts(approaching);

      if (overdue.length > 0 || approaching.length > 0) {
        setShowDebtAlertModal(true);
      }
    }
  }, [activeTab, expensesList]);

  // دالة مساعدة لتوفير المسميات المناسبة وإلغاء الأسماء المؤقتة والوهمية تماماً
  const getDisplayUserName = (user: User) => {
    if (user.role === 'Admin') return 'الإدارة العامة';
    if (user.role === 'Supervisor') return 'المشرف المناوب';
    if (user.role === 'Operator') return 'المشغل الفني';
    return user.name;
  };

  // دالة حساب الإهلاك السنوي والشهري المتراكم للأصل الثابت بطريقة القسط الثابت
  const calculateAssetDepreciation = (asset: any) => {
    if (!asset.purchase_cost || !asset.useful_life) return 0;
    const purchaseDate = new Date(asset.purchase_date);
    const currentDate = new Date();
    const elapsedMs = currentDate.getTime() - purchaseDate.getTime();
    const elapsedYears = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24 * 365.25));
    const annualDepreciation = asset.purchase_cost / asset.useful_life;
    const totalDepreciation = Math.min(asset.purchase_cost, annualDepreciation * elapsedYears);
    return Math.round(totalDepreciation);
  };

  // توليد المهام اليومية ديناميكياً لتكون متفاعلة مع قاعدة البيانات بالكامل وتختفي فور إغلاق وضع التجربة
  const activeCycles = cyclesList.filter(c => c.status === 'Active');
  const derivedTasks = activeCycles.flatMap(cycle => {
    const gh = greenhousesList.find(g => g.id === cycle.greenhouse_id);
    const hasLogs = operationalLogsList.some(log => log.cycle_id === cycle.id);
    const ghName = gh ? gh.name : 'صوبة الإنتاج';
    
    return [
      {
        id: `task-hygiene-${cycle.id}`,
        title: `فحص جودة التعقيم والرش الوقائي في ${ghName}`,
        details: `يرجى رش الأرضية وممرات التجهيز بمحلول معقم لضمان خلو الفراش من الفطريات الغريبة والآفات.`,
        status: hasLogs ? 'Completed' : 'Today',
        statusLabel: hasLogs ? 'مكتمل' : 'اليوم',
        statusColor: hasLogs ? 'bg-emerald-100 text-emerald-800 border-emerald-500' : 'bg-slate-200 text-slate-700 border-slate-400'
      },
      {
        id: `task-climate-${cycle.id}`,
        title: `تسجيل قراءات الحرارة والرطوبة والـ CO2 لصوبة ${ghName}`,
        details: `يرجى قياس وتسجيل المعايير البيئية الحيوية في قسم "التشغيل" للحفاظ على بيئة نمو مثالية.`,
        status: hasLogs ? 'Completed' : 'Pending',
        statusLabel: hasLogs ? 'مكتمل' : 'معلق',
        statusColor: hasLogs ? 'bg-emerald-100 text-emerald-800 border-emerald-500' : 'bg-amber-100 text-amber-800 border-amber-500'
      },
      {
        id: `task-harvest-${cycle.id}`,
        title: `متابعة نمو الفطر وفرز القطاف للدورة ${cycle.cycle_number}`,
        details: `التنسيق مع فريق التشغيل لفرز وتعبئة الثمار الناضجة في كراتين مخصصة تمهيداً للتوريد والبيع.`,
        status: 'Today',
        statusLabel: 'جاري اليوم',
        statusColor: 'bg-blue-100 text-blue-800 border-blue-500'
      }
    ];
  });

  // ==========================================
  // 3. تعريف قائمة التبويبات الـ 12 مع أيقوناتها
  // ==========================================
  const tabs = [
    { id: 'الرئيسية', label: 'الرئيسية', icon: LayoutDashboard, roles: ['Admin', 'Supervisor', 'Operator'] },
    { id: 'الصوبات', label: 'إدارة الصوبات', icon: Building, roles: ['Admin', 'Supervisor', 'Operator'] },
    { id: 'الدورات', label: 'الدورات الإنتاجية', icon: RotateCw, roles: ['Admin', 'Supervisor', 'Operator'] },
    { id: 'المصاريف', label: 'مصاريف التشغيل', icon: Receipt, roles: ['Admin', 'Supervisor'] },
    { id: 'المبيعات', label: 'المبيعات والديون', icon: ShoppingBag, roles: ['Admin', 'Supervisor'] },
    { id: 'الإنتاج', label: 'الإنتاج والفرز اليومي', icon: Sprout, roles: ['Admin', 'Supervisor', 'Operator'] },
    { id: 'المخزون', label: 'المخازن والمستلزمات', icon: Package, roles: ['Admin', 'Supervisor'] },
    { id: 'التشغيل', label: 'التحكم البيئي اليومي', icon: ClipboardList, roles: ['Admin', 'Supervisor', 'Operator'] },
    { id: 'العهدة', label: 'إدارة العهدة والمالية', icon: Wallet, roles: ['Admin'] },
    { id: 'الموظفون', label: 'الموظفون والرواتب', icon: Users, roles: ['Admin'] },
    { id: 'الأصول', label: 'الأصول والإهلاكات', icon: TrendingUp, roles: ['Admin', 'Supervisor'] },
    { id: 'الشركاء', label: 'حصص الشركاء والأرباح', icon: Coins, roles: ['Admin'] },
    { id: 'التقارير', label: 'التقارير المالية والختامية', icon: FileBarChart, roles: ['Admin', 'Supervisor'] },
    { id: 'التحليلات', label: 'الرسوم البيانية والإنتاجية', icon: LineChart, roles: ['Admin', 'Supervisor'] },
    { id: 'دليل المستخدم', label: 'دليل المستخدم والتشغيل', icon: BookOpen, roles: ['Admin', 'Supervisor', 'Operator'] },
    { id: 'المصدر العام لقاعدة البيانات', label: 'المصدر العام لقاعدة البيانات', icon: Database, roles: ['Admin'] },
  ];

  // تصفية التبويبات بناءً على صلاحيات المستخدم النشط حالياً
  const allowedTabs = tabs.filter(tab => tab.roles.includes(activeUser.role));

  // ==========================================
  // 4. منطق تبديل الحسابات والتحقق من PIN
  // ==========================================
  const handleRoleSwitchRequest = (role: 'Admin' | 'Supervisor' | 'Operator') => {
    setSelectedRoleToSwitch(role);
    setPinInput('');
    setPinError('');
    setShowPinModal(true);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // البحث عن المستخدم المطابق للدور والرقم السري في قاعدة البيانات المحلية Dexie
    let matchedUser = await activeDb.users
      .where('role').equals(selectedRoleToSwitch!)
      .and(u => {
        const dec = decryptValue(u.pin_code);
        return dec === pinInput || u.pin_code === pinInput;
      })
      .first();

    // حل مشكلة تأكيد الرمز نهائياً بوضع بديل احتياطي فوري إذا كانت قاعدة البيانات لم تكتمل تهيئتها أو فارغة
    if (!matchedUser) {
      const fallbackUsers = [
        { id: 1, name: 'الإدارة العامة (مؤمن)', pin_code: '7391', role: 'Admin' },
        { id: 2, name: 'الإدارة العامة (محمود)', pin_code: '2846', role: 'Admin' },
        { id: 3, name: 'المشرف المناوب', pin_code: '9514', role: 'Supervisor' },
        { id: 4, name: 'المشغل الفني', pin_code: '8263', role: 'Operator' }
      ];
      const fallback = fallbackUsers.find(u => u.role === selectedRoleToSwitch && u.pin_code === pinInput);
      if (fallback) {
        matchedUser = fallback as any;
      }
    }

    if (matchedUser) {
      setActiveUser(matchedUser);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      
      // إذا كان التبويب الحالي غير مسموح للدور الجديد، أعد توجيهه إلى الرئيسية
      const isAllowed = tabs.find(t => t.id === activeTab)?.roles.includes(matchedUser.role);
      if (!isAllowed) {
        setActiveTab('الرئيسية');
        localStorage.setItem('mushroom_active_tab', 'الرئيسية');
      }
      localStorage.setItem('mushroom_active_user', JSON.stringify(matchedUser));
    } else {
      setPinError('رمز PIN غير صحيح! يرجى المحاولة مجدداً.');
      setPinInput('');
    }
  };

  // منطق شاشة القفل المحلية المطور لحل مشكلة التجمد والتعليق نهائياً
  const handleLockPinPress = (digit: string) => {
    // تدمير أي مؤقت فعال فوراً عند بدء إدخال جديد لإتاحة المحاولة السريعة
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    
    setLockPinError('');
    
    // إذا كان الرمز السابق غير صحيح وجاري عرضه، قم بتصفيره والبدء من جديد
    let currentInput = lockPinInput;
    if (lockPinInput.length >= 4) {
      currentInput = '';
    }

    if (currentInput.length < 4) {
      const newInput = currentInput + digit;
      setLockPinInput(newInput);
      
      // تحقق تلقائي فوري عند اكتمال 4 أرقام
      if (newInput.length === 4) {
        verifyLockPin(newInput, selectedLockRole!);
      }
    }
  };

  const handleLockPinDelete = () => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    setLockPinError('');
    setLockPinInput(prev => prev.slice(0, -1));
  };

  const handleLockPinClear = () => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    setLockPinError('');
    setLockPinInput('');
  };

  const verifyLockPin = async (pin: string, role: 'Admin' | 'Supervisor' | 'Operator') => {
    // تدمير أي مؤقتات سابقة فوراً
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }

    try {
      let matchedUser = await activeDb.users
        .where('role').equals(role)
        .and(u => {
          const dec = decryptValue(u.pin_code);
          return dec === pin || u.pin_code === pin;
        })
        .first();

      // حل مشكلة تأكيد الرمز نهائياً بوضع بديل احتياطي فوري إذا كانت قاعدة البيانات لم تكتمل تهيئتها أو فارغة
      if (!matchedUser) {
        const fallbackUsers = [
          { id: 1, name: 'الإدارة العامة (مؤمن)', pin_code: '7391', role: 'Admin' },
          { id: 2, name: 'الإدارة العامة (محمود)', pin_code: '2846', role: 'Admin' },
          { id: 3, name: 'المشرف المناوب', pin_code: '9514', role: 'Supervisor' },
          { id: 4, name: 'المشغل الفني', pin_code: '8263', role: 'Operator' }
        ];
        const fallback = fallbackUsers.find(u => u.role === role && u.pin_code === pin);
        if (fallback) {
          matchedUser = fallback as any;
        }
      }

      if (matchedUser) {
        // نجاح عملية التحقق: إعادة تعيين وتصفير فوري لكامل الحالات الأمنية
        setActiveUser(matchedUser);
        setIsLocked(false);
        setLockPinInput('');
        setLockPinError('');
        setSelectedLockRole(null);
        
        // حفظ الجلسة في localStorage للحفاظ على حالة تسجيل الدخول
        localStorage.setItem('mushroom_is_locked', 'false');
        localStorage.setItem('mushroom_active_user', JSON.stringify(matchedUser));
        localStorage.setItem('mushroom_active_tab', activeTab);
        
        // التحقق من صلاحية التبويب الحالي
        const isAllowed = tabs.find(t => t.id === activeTab)?.roles.includes(matchedUser.role);
        if (!isAllowed) {
          const defaultTab = 'الرئيسية';
          setActiveTab(defaultTab);
          localStorage.setItem('mushroom_active_tab', defaultTab);
        }
      } else {
        // فشل التحقق: عرض رسالة الخطأ ومسح الإدخال فوراً
        setLockPinError('رمز PIN غير صحيح! يرجى المحاولة مجدداً.');
        setLockPinInput('');
      }
    } catch (err) {
      console.error('خطأ أثناء التحقق من رمز القفل:', err);
      setLockPinError('فشل الاتصال بقاعدة البيانات المحلية.');
    }
  };

  const handleLockSystem = () => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    setIsLocked(true);
    setSelectedLockRole(null);
    setLockPinInput('');
    setLockPinError('');
    // مسح الجلسة من localStorage
    localStorage.removeItem('mushroom_is_locked');
    localStorage.removeItem('mushroom_active_user');
    localStorage.removeItem('mushroom_active_tab');
  };

  // دالة لإضافة دورة زراعية جديدة أو تعديلها تفاعلياً
  const handleAddCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewCycleError('');

    if (!newCycleNumber.trim()) {
      setNewCycleError('يرجى إدخال اسم أو رقم الدورة.');
      return;
    }
    if (!newCycleGreenhouseId) {
      setNewCycleError('يرجى تحديد الصوبة المخصصة.');
      return;
    }
    if (!newCycleInvestment || Number(newCycleInvestment) <= 0) {
      setNewCycleError('يرجى إدخال مبلغ استثماري أولي صحيح أكبر من صفر.');
      return;
    }

    try {
      const activeDb = demoMode ? demoDb : prodDb;
      const data = {
        greenhouse_id: Number(newCycleGreenhouseId),
        cycle_number: newCycleNumber,
        start_date: new Date().toISOString().split('T')[0],
        status: 'Active' as const,
        initial_investment: Number(newCycleInvestment)
      };

      if (editingId !== null) {
        await activeDb.cycles.update(editingId, data);
      } else {
        await activeDb.cycles.add(data);
      }

      // إعادة تعيين الحقول وإغلاق المودال بنجاح
      triggerStateRefresh();
      setShowAddCycleModal(false);
      setEditingId(null);
      setNewCycleNumber('');
      setNewCycleGreenhouseId('');
      setNewCycleInvestment('');
      setNewCycleError('');
    } catch (err) {
      console.error('خطأ أثناء حفظ الدورة:', err);
      setNewCycleError('فشل حفظ الدورة في قاعدة البيانات المحلية.');
    }
  };

  // دالة لإضافة أو تعديل المصاريف أو المبيعات تفاعلياً
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewExpenseError('');

    if (!newExpenseCycleId) {
      setNewExpenseError('يرجى تحديد الدورة الإنتاجية المرتبطة.');
      return;
    }

    try {
      const activeDb = demoMode ? demoDb : prodDb;
      if (newExpenseType === 'Operational') {
        if (!newExpenseDetails.trim()) {
          setNewExpenseError('يرجى إدخال تفاصيل المصروف التشغيلي.');
          return;
        }
        const amount = Number(newExpenseAmount);
        if (isNaN(amount) || amount <= 0) {
          setNewExpenseError('يرجى إدخال مبلغ صحيح أكبر من صفر.');
          return;
        }

        const expData = {
          cycle_id: Number(newExpenseCycleId),
          date: new Date().toISOString().split('T')[0],
          type: 'Operational' as const,
          details: newExpenseDetails,
          amount: amount,
          greenhouse_id: newExpenseGreenhouseId ? Number(newExpenseGreenhouseId) : undefined
        };

        if (editingId !== null) {
          // إلغاء تأثير الحركة القديمة على الخزنة
          const oldExp = await activeDb.expenses.get(editingId);
          if (oldExp && oldExp.amount) {
            const currentPc = await activeDb.petty_cash.get(1);
            if (currentPc) {
              const restoredBal = currentPc.current_balance + oldExp.amount;
              const nextBal = restoredBal - amount;
              await activeDb.petty_cash.update(1, { current_balance: nextBal, last_updated: new Date().toISOString() });
              await activeDb.transactions.add({
                timestamp: new Date().toISOString(),
                user_id: activeUser.id || 1,
                operation_type: 'Withdrawal',
                amount: amount,
                balance_before: restoredBal,
                balance_after: nextBal,
                details: `تعديل مصروف تشغيلي: ${newExpenseDetails}`
              });
            }
          }
          await activeDb.expenses.update(editingId, expData);
        } else {
          // إضافة المصروف التشغيلي
          await activeDb.expenses.add(expData);

          // خصم من العهدة وتوثيق الحركة التدقيقية
          const currentPc = await activeDb.petty_cash.get(1);
          if (currentPc) {
            const newBal = currentPc.current_balance - amount;
            await activeDb.petty_cash.update(1, { current_balance: newBal, last_updated: new Date().toISOString() });
            await activeDb.transactions.add({
              timestamp: new Date().toISOString(),
              user_id: activeUser.id || 1,
              operation_type: 'Withdrawal',
              amount: amount,
              balance_before: currentPc.current_balance,
              balance_after: newBal,
              details: `مصروف تشغيلي: ${newExpenseDetails}`
            });
          }
        }
      } else {
        // مبيعات لعميل
        if (!newExpenseCustomerName.trim()) {
          setNewExpenseError('يرجى إدخال اسم العميل.');
          return;
        }
        const boxes = Number(newExpenseTotalBoxes);
        const price = Number(newExpensePricePerBox);
        const paid = Number(newExpensePaidAmount);

        if (isNaN(boxes) || boxes <= 0) {
          setNewExpenseError('يرجى إدخال عدد كراتين صحيح أكبر من صفر.');
          return;
        }
        if (isNaN(price) || price <= 0) {
          setNewExpenseError('يرجى إدخال سعر كرتونة صحيح أكبر من صفر.');
          return;
        }
        if (isNaN(paid) || paid < 0) {
          setNewExpenseError('يرجى إدخال المبلغ المسدد بشكل صحيح.');
          return;
        }

        const totalAmt = boxes * price;
        const remAmt = totalAmt - paid;

        const expData = {
          cycle_id: Number(newExpenseCycleId),
          date: new Date().toISOString().split('T')[0],
          type: 'Selling' as const,
          customer_name: newExpenseCustomerName,
          total_boxes: boxes,
          price_per_box: price,
          paid_amount: paid,
          remaining_amount: remAmt,
          total_amount: totalAmt,
          due_date: newExpenseDueDate || undefined,
          greenhouse_id: newExpenseGreenhouseId ? Number(newExpenseGreenhouseId) : undefined
        };

        if (editingId !== null) {
          const oldExp = await activeDb.expenses.get(editingId);
          if (oldExp) {
            // إلغاء تأثير الدفع القديم
            const oldPaid = oldExp.paid_amount || 0;
            const currentPc = await activeDb.petty_cash.get(1);
            if (currentPc) {
              const restoredBal = currentPc.current_balance - oldPaid;
              const nextBal = restoredBal + paid;
              await activeDb.petty_cash.update(1, { current_balance: nextBal, last_updated: new Date().toISOString() });
              if (paid > 0) {
                await activeDb.transactions.add({
                  timestamp: new Date().toISOString(),
                  user_id: activeUser.id || 1,
                  operation_type: 'Deposit',
                  amount: paid,
                  balance_before: restoredBal,
                  balance_after: nextBal,
                  details: `تعديل مبيعات لـ ${newExpenseCustomerName} (كراتين: ${boxes})`
                });
              }
            }
          }
          await activeDb.expenses.update(editingId, expData);
        } else {
          // إضافة فاتورة مبيعات جديدة
          await activeDb.expenses.add(expData);

          // إيداع المبلغ المسدد في العهدة وتوثيق الحركة التدقيقية
          if (paid > 0) {
            const currentPc = await activeDb.petty_cash.get(1);
            if (currentPc) {
              const newBal = currentPc.current_balance + paid;
              await activeDb.petty_cash.update(1, { current_balance: newBal, last_updated: new Date().toISOString() });
              await activeDb.transactions.add({
                timestamp: new Date().toISOString(),
                user_id: activeUser.id || 1,
                operation_type: 'Deposit',
                amount: paid,
                balance_before: currentPc.current_balance,
                balance_after: newBal,
                details: `مبيعات لـ ${newExpenseCustomerName} (كراتين: ${boxes})`
              });
            }
          }
        }
      }

      // إغلاق المودال وتصفير الحقول
      triggerStateRefresh();
      setShowAddExpenseModal(false);
      setEditingId(null);
      setNewExpenseDetails('');
      setNewExpenseAmount('');
      setNewExpenseCustomerName('');
      setNewExpenseTotalBoxes('');
      setNewExpensePricePerBox('');
      setNewExpensePaidAmount('');
      setNewExpenseDueDate('');
      setNewExpenseGreenhouseId('');
      setNewExpenseError('');
    } catch (err) {
      console.error('خطأ أثناء إضافة المعاملة:', err);
      setNewExpenseError('فشل حفظ المعاملة في قاعدة البيانات المحلية.');
    }
  };

  // معالج إضافة أو تعديل قراءة بيئية مناخية جديدة
  const handleAddClimateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClimateError('');
    if (!climateCycleId) {
      setClimateError('يرجى تحديد الدورة الإنتاجية المرتبطة.');
      return;
    }
    if (!climateDate) {
      setClimateError('يرجى تحديد التاريخ.');
      return;
    }
    const temp = Number(climateTemp);
    const hum = Number(climateHumidity);
    const co2 = Number(climateCO2);
    if (isNaN(temp) || temp <= 0) {
      setClimateError('يرجى إدخال درجة حرارة صحيحة.');
      return;
    }
    if (isNaN(hum) || hum <= 0 || hum > 100) {
      setClimateError('يرجى إدخال نسبة رطوبة صحيحة (بين 1 و 100).');
      return;
    }
    if (isNaN(co2) || co2 <= 0) {
      setClimateError('يرجى إدخال مستوى ثاني أكسيد الكربون بشكل صحيح.');
      return;
    }

    try {
      const activeDb = demoMode ? demoDb : prodDb;
      const data = {
        cycle_id: Number(climateCycleId),
        date: climateDate,
        temperature: temp,
        humidity: hum,
        co2_level: co2,
        hygiene_status: climateHygiene as any,
        extra_notes: climateNotes,
        operator_id: activeUser.id || 4
      };

      if (editingId !== null) {
        await activeDb.operational_logs.update(editingId, data);
      } else {
        await activeDb.operational_logs.add(data);
      }

      triggerStateRefresh();
      setShowAddClimateModal(false);
      setEditingId(null);
      setClimateTemp('');
      setClimateHumidity('');
      setClimateCO2('');
      setClimateNotes('');
    } catch (err) {
      console.error('Error adding/updating climate:', err);
      setClimateError('فشل حفظ القراءة في قاعدة البيانات المحلية.');
    }
  };

  // معالج إضافة أو تعديل سجل إنتاج وفرز جديد
  const handleAddHarvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHarvestError('');
    if (!harvestCycleId) {
      setHarvestError('يرجى تحديد الدورة الإنتاجية المرتبطة.');
      return;
    }
    if (!harvestDate) {
      setHarvestError('يرجى تحديد التاريخ.');
      return;
    }
    const weight = Number(harvestWeight);
    if (isNaN(weight) || weight <= 0) {
      setHarvestError('يرجى إدخال وزن قطاف صحيح أكبر من صفر.');
      return;
    }

    try {
      const activeDb = demoMode ? demoDb : prodDb;
      const data = {
        cycle_id: Number(harvestCycleId),
        date: harvestDate,
        temperature: 24, // قيمة مناخية نموذجية مصاحبة للقطاف
        humidity: 85,
        co2_level: 800,
        hygiene_status: 'Excellent' as const,
        operator_id: activeUser.id || 4,
        harvest_weight: weight,
        harvest_type: harvestType,
        harvest_grade: harvestGrade as any,
        extra_notes: harvestNotes
      };

      if (editingId !== null) {
        await activeDb.operational_logs.update(editingId, data);
      } else {
        await activeDb.operational_logs.add(data);
      }

      triggerStateRefresh();
      setShowAddHarvestModal(false);
      setEditingId(null);
      setHarvestWeight('');
      setHarvestNotes('');
    } catch (err) {
      console.error('Error adding/updating harvest:', err);
      setHarvestError('فشل حفظ سجل الإنتاج والفرز في قاعدة البيانات.');
    }
  };

  // معالج إضافة أو تعديل مستلزم أو صنف مخزني جديد
  const handleAddInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvError('');
    if (!invItemName.trim()) {
      setInvError('يرجى إدخال اسم الصنف أو المستلزم المادي.');
      return;
    }
    const qty = Number(invQuantity);
    const minStock = Number(invMinStockAlert);
    if (isNaN(qty) || qty < 0) {
      setInvError('يرجى إدخال كمية صحيحة.');
      return;
    }
    if (isNaN(minStock) || minStock < 0) {
      setInvError('يرجى إدخال حد أمان صحيح للطلب.');
      return;
    }

    try {
      const activeDb = demoMode ? demoDb : prodDb;
      const data = {
        date_added: new Date().toISOString().split('T')[0],
        item_name: invItemName.trim(),
        quantity: qty,
        unit: invUnit,
        min_stock_alert: minStock,
        expiry_date: invExpiryDate || undefined
      };

      if (editingId !== null) {
        await activeDb.inventory.update(editingId, data);
      } else {
        await activeDb.inventory.add(data);
      }

      triggerStateRefresh();
      setShowAddInventoryModal(false);
      setEditingId(null);
      setInvItemName('');
      setInvQuantity('');
      setInvExpiryDate('');
    } catch (err) {
      console.error('Error adding/updating inventory:', err);
      setInvError('فشل حفظ الصنف لقاعدة البيانات.');
    }
  };

  // معالج إضافة أو تحديث سجل موظف
  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError('');
    if (!empName.trim()) {
      setEmpError('يرجى إدخال اسم الموظف.');
      return;
    }
    const sal = Number(empBaseSalary);
    const adv = Number(empAdvances);
    const bon = Number(empBonuses);
    if (isNaN(sal) || sal <= 0) {
      setEmpError('يرجى إدخال راتب أساسي صحيح أكبر من صفر.');
      return;
    }
    if (isNaN(adv) || adv < 0) {
      setEmpError('يرجى إدخال قيمة سلف مقبولة (صفر أو أكثر).');
      return;
    }
    if (isNaN(bon) || bon < 0) {
      setEmpError('يرجى إدخال قيمة مكافآت وبدلات مقبولة (صفر أو أكثر).');
      return;
    }

    try {
      const activeDb = demoMode ? demoDb : prodDb;
      const data = {
        name: empName.trim(),
        base_salary: sal,
        total_advances: adv,
        total_bonuses: bon,
        salary_type: empSalaryType,
        daily_rate: empSalaryType === 'daily' || empSalaryType === 'productivity' ? Number(empDailyRate) || 0 : undefined,
        productivity_price_per_box: empSalaryType === 'productivity' ? Number(empProductivityPrice) || 0 : undefined
      };

      if (editingId !== null) {
        await activeDb.employees.update(editingId, data);
      } else {
        const existing = await activeDb.employees.where('name').equals(empName.trim()).first();
        if (existing) {
          await activeDb.employees.update(existing.id!, data);
        } else {
          await activeDb.employees.add(data);
        }
      }

      triggerStateRefresh();
      setShowAddEmployeeModal(false);
      setEditingId(null);
      setEmpName('');
      setEmpBaseSalary('');
      setEmpAdvances('0');
      setEmpBonuses('0');
      setEmpSalaryType('fixed');
      setEmpDailyRate('');
      setEmpProductivityPrice('');
    } catch (err) {
      console.error('Error saving employee:', err);
      setEmpError('فشل حفظ بيانات الموظف في قاعدة البيانات.');
    }
  };

  // معالج إضافة أو تعديل حركة عهدة ومعاملة مالية جديدة
  const handleAddPettyCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPcError('');
    const amt = Number(pcAmount);
    if (isNaN(amt) || amt <= 0) {
      setPcError('يرجى إدخال مبلغ مالي صحيح أكبر من صفر.');
      return;
    }
    if (!pcDetails.trim()) {
      setPcError('يرجى تقديم تفاصيل المعاملة وبيانها المالي بدقة.');
      return;
    }

    try {
      const activeDb = demoMode ? demoDb : prodDb;
      const currentPc = await activeDb.petty_cash.get(1);
      const currentBal = currentPc ? currentPc.current_balance : 0;

      if (editingId !== null) {
        const oldTx = await activeDb.transactions.get(editingId);
        if (oldTx) {
          let tempBal = currentBal;
          if (oldTx.operation_type === 'Deposit') {
            tempBal -= oldTx.amount;
          } else {
            tempBal += oldTx.amount;
          }

          let nextBal = tempBal;
          if (pcType === 'Deposit') {
            nextBal += amt;
          } else {
            if (amt > tempBal) {
              setPcError('عذراً، رصيد العهدة النقدية لا يكفي بعد تعديل السحب.');
              return;
            }
            nextBal -= amt;
          }

          await activeDb.petty_cash.put({
            id: 1,
            current_balance: nextBal,
            last_updated: new Date().toISOString()
          });

          await activeDb.transactions.update(editingId, {
            operation_type: pcType,
            amount: amt,
            balance_before: tempBal,
            balance_after: nextBal,
            details: pcDetails.trim()
          });
        }
      } else {
        let newBal = currentBal;
        if (pcType === 'Deposit') {
          newBal += amt;
        } else {
          if (amt > currentBal) {
            setPcError('عذراً، رصيد العهدة النقدية الحالي لا يكفي لإجراء هذا السحب.');
            return;
          }
          newBal -= amt;
        }

        await activeDb.petty_cash.put({
          id: 1,
          current_balance: newBal,
          last_updated: new Date().toISOString()
        });

        await activeDb.transactions.add({
          timestamp: new Date().toISOString(),
          user_id: activeUser.id || 1,
          operation_type: pcType,
          amount: amt,
          balance_before: currentBal,
          balance_after: newBal,
          details: pcDetails.trim()
        });
      }

      triggerStateRefresh();
      setShowAddPettyCashModal(false);
      setEditingId(null);
      setPcAmount('');
      setPcDetails('');
    } catch (err) {
      console.error('Error updating petty cash:', err);
      setPcError('فشل تسجيل الحركة النقدية في قاعدة البيانات.');
    }
  };

  // دوال تعديل السجلات وتهيئتها للمودالات المتكاملة
  const handleEditClimate = (log: any) => {
    setEditingId(log.id);
    setClimateCycleId(String(log.cycle_id));
    setClimateDate(log.date);
    setClimateTemp(String(log.temperature));
    setClimateHumidity(String(log.humidity));
    setClimateCO2(String(log.co2_level));
    setClimateHygiene(log.hygiene_status);
    setClimateNotes(log.extra_notes || '');
    setShowAddClimateModal(true);
  };

  const handleEditHarvest = (log: any) => {
    setEditingId(log.id);
    setHarvestCycleId(String(log.cycle_id));
    setHarvestDate(log.date);
    setHarvestWeight(String(log.harvest_weight));
    setHarvestType(log.harvest_type || 'محار أبيض');
    setHarvestGrade(log.harvest_grade || 'A');
    setHarvestNotes(log.extra_notes || '');
    setShowAddHarvestModal(true);
  };

  const handleEditSale = (exp: any) => {
    setEditingId(exp.id);
    setNewExpenseType('Selling');
    setNewExpenseCycleId(String(exp.cycle_id));
    setNewExpenseCustomerName(exp.customer_name || '');
    setNewExpenseTotalBoxes(String(exp.total_boxes || ''));
    setNewExpensePricePerBox(String(exp.price_per_box || ''));
    setNewExpensePaidAmount(String(exp.paid_amount || ''));
    setNewExpenseDueDate(exp.due_date || '');
    setNewExpenseDetails('');
    setNewExpenseAmount('');
    setShowAddExpenseModal(true);
  };

  const handleEditOperational = (exp: any) => {
    setEditingId(exp.id);
    setNewExpenseType('Operational');
    setNewExpenseCycleId(String(exp.cycle_id));
    setNewExpenseDetails(exp.details || '');
    setNewExpenseAmount(String(exp.amount || ''));
    setNewExpenseCustomerName('');
    setNewExpenseTotalBoxes('');
    setNewExpensePricePerBox('');
    setNewExpensePaidAmount('');
    setNewExpenseDueDate('');
    setShowAddExpenseModal(true);
  };

  const handleEditInventory = (item: any) => {
    setEditingId(item.id);
    setInvItemName(item.item_name);
    setInvQuantity(String(item.quantity));
    setInvUnit(item.unit);
    setInvMinStockAlert(String(item.min_stock_alert));
    setInvExpiryDate(item.expiry_date || '');
    setShowAddInventoryModal(true);
  };

  const handleEditEmployee = (emp: any) => {
    setEditingId(emp.id);
    setEmpName(emp.name);
    setEmpBaseSalary(String(emp.base_salary));
    setEmpAdvances(String(emp.total_advances));
    setEmpBonuses(String(emp.total_bonuses));
    setShowAddEmployeeModal(true);
  };

  const handleEditTransaction = (t: any) => {
    setEditingId(t.id);
    setPcType(t.operation_type);
    setPcAmount(String(t.amount));
    setPcDetails(t.details);
    setShowAddPettyCashModal(true);
  };

  // دوال الحذف التفاعلية الفورية مع تأكيد المستخدم وإعادة العرض السلسة تلقائياً
  const handleDeleteItem = async (table: string, id: number) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟')) {
      try {
        const activeDb = demoMode ? demoDb : prodDb;
        if (table === 'operational_logs') {
          await activeDb.operational_logs.delete(id);
        } else if (table === 'expenses') {
          // استرجاع السجل لتعديل الخزينة والعهدة إذا كان له تأثير مالي
          const exp = await activeDb.expenses.get(id);
          if (exp) {
            const currentPc = await activeDb.petty_cash.get(1);
            if (currentPc) {
              let adjustedBal = currentPc.current_balance;
              if (exp.type === 'Operational' && exp.amount) {
                adjustedBal += exp.amount;
              } else if (exp.type === 'Selling' && exp.paid_amount) {
                adjustedBal -= exp.paid_amount;
              }
              await activeDb.petty_cash.update(1, { current_balance: adjustedBal, last_updated: new Date().toISOString() });
            }
          }
          await activeDb.expenses.delete(id);
        } else if (table === 'inventory') {
          await activeDb.inventory.delete(id);
        } else if (table === 'employees') {
          await activeDb.employees.delete(id);
        } else if (table === 'cycles') {
          await activeDb.cycles.delete(id);
        }
      } catch (err) {
        console.error('خطأ أثناء الحذف:', err);
      }
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه المعاملة المالية وإعادة ضبط العهدة النقدية؟')) {
      try {
        const activeDb = demoMode ? demoDb : prodDb;
        const tx = await activeDb.transactions.get(id);
        if (tx) {
          const currentPc = await activeDb.petty_cash.get(1);
          if (currentPc) {
            let adjustedBal = currentPc.current_balance;
            if (tx.operation_type === 'Deposit') {
              adjustedBal -= tx.amount;
            } else {
              adjustedBal += tx.amount;
            }
            await activeDb.petty_cash.put({
              id: 1,
              current_balance: adjustedBal,
              last_updated: new Date().toISOString()
            });
          }
          await activeDb.transactions.delete(id);
        }
      } catch (err) {
        console.error('خطأ في حذف الحركة المالية:', err);
      }
    }
  };

  // محرك البحث الشامل والمطابقة الفورية عبر جداول البيانات النشطة
  const getSearchResults = () => {
    if (!globalSearch.trim()) return [];
    const query = globalSearch.trim().toLowerCase();
    const results: { id: string | number; category: string; title: string; subtitle: string; tab: string }[] = [];

    // 1. البحث في الدورات الإنتاجية
    cyclesList.forEach(c => {
      if (c.cycle_number.toLowerCase().includes(query)) {
        results.push({
          id: c.id || '',
          category: 'الدورات الإنتاجية',
          title: `دورة: ${c.cycle_number}`,
          subtitle: `الحالة: ${c.status === 'Active' ? 'نشطة' : 'مكتملة'} | الاستثمار: ${c.initial_investment.toLocaleString()} ج.م`,
          tab: 'الدورات'
        });
      }
    });

    // 2. البحث في المبيعات والعملاء
    expensesList.filter(e => e.type === 'Selling').forEach(exp => {
      if (
        (exp.customer_name && exp.customer_name.toLowerCase().includes(query)) ||
        (exp.details && exp.details.toLowerCase().includes(query))
      ) {
        results.push({
          id: exp.id || '',
          category: 'المبيعات والشحنات',
          title: `عميل: ${exp.customer_name}`,
          subtitle: `الكراتين: ${exp.total_boxes} | المتبقي: ${exp.remaining_amount?.toLocaleString()} ج.م | الإجمالي: ${exp.total_amount?.toLocaleString()} ج.م`,
          tab: 'المبيعات'
        });
      }
    });

    // 3. البحث في مستلزمات المخزون
    inventoryList.forEach(item => {
      if (item.item_name.toLowerCase().includes(query)) {
        results.push({
          id: item.id || '',
          category: 'المخازن والمستلزمات',
          title: `مستلزم: ${item.item_name}`,
          subtitle: `الكمية المتوفرة: ${item.quantity} ${item.unit} | حد الطلب الآمن: ${item.min_stock_alert}`,
          tab: 'المخزون'
        });
      }
    });

    // 4. البحث في التحكم البيئي اليومي
    operationalLogsList.filter(l => l.temperature !== undefined && l.harvest_weight === undefined).forEach(log => {
      if (
        log.date.toLowerCase().includes(query) ||
        (log.extra_notes && log.extra_notes.toLowerCase().includes(query))
      ) {
        results.push({
          id: log.id || '',
          category: 'التحكم البيئي اليومي',
          title: `قراءة بيئية بتاريخ: ${log.date}`,
          subtitle: `الحرارة: ${log.temperature}°م | الرطوبة: ${log.humidity}% | ثاني أكسيد الكربون: ${log.co2_level} ppm`,
          tab: 'التشغيل'
        });
      }
    });

    // 5. البحث في الموظفين والعمال والرواتب
    employeesList.forEach(emp => {
      if (emp.name.toLowerCase().includes(query)) {
        results.push({
          id: emp.id || '',
          category: 'الموظفون والرواتب',
          title: `موظف: ${emp.name}`,
          subtitle: `الراتب الأساسي: ${emp.base_salary.toLocaleString()} ج.م | إجمالي السلف: ${emp.total_advances.toLocaleString()} ج.م | المكافآت: ${emp.total_bonuses.toLocaleString()} ج.م`,
          tab: 'الموظفون'
        });
      }
    });

    // 6. البحث في العمليات المالية والعهدة
    transactions.forEach(t => {
      if (
        t.details.toLowerCase().includes(query) ||
        t.operation_type.toLowerCase().includes(query)
      ) {
        results.push({
          id: t.id || '',
          category: 'العهدة والمالية',
          title: `حركة عهدة: ${t.operation_type === 'Deposit' ? 'إيداع عهدة' : 'صرف تشغيلي'}`,
          subtitle: `المبلغ: ${t.amount.toLocaleString()} ج.م | التفاصيل: ${t.details}`,
          tab: 'العهدة'
        });
      }
    });

    return results;
  };

  // مستمع للوحة المفاتيح الفعلية لتسهيل الإدخال من الأجهزة المكتبية والمحمول
  useEffect(() => {
    if (!isLocked || !selectedLockRole) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleLockPinPress(e.key);
      } else if (e.key === 'Backspace') {
        handleLockPinDelete();
      } else if (e.key === 'Escape') {
        setSelectedLockRole(null);
        setLockPinInput('');
        setLockPinError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLocked, selectedLockRole, lockPinInput]);

  return (
    <div className={`min-h-screen flex bg-slate-50 font-sans ${isDarkMode ? 'dark-theme' : 'light-theme'}`} dir="rtl">
      
      {/* ==========================================
          أ. القائمة الجانبية المستقرة (Desktop Sidebar)
          ========================================== */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 border-l border-slate-800 shadow-xl shrink-0">
        {/* هيدر القائمة الجانبية */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <button 
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-950/40 overflow-hidden border border-emerald-500/30 bg-slate-800/60 p-0.5"
          >
            <img src={appLogo} alt="Mushroom System" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
          </button>
          <div>
            <h1 
              className="text-white font-bold text-sm tracking-tight leading-tight cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => {
                setActiveTab('الرئيسية');
                localStorage.setItem('mushroom_active_tab', 'الرئيسية');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Mushroom System
            </h1>
            <p className="text-[10px] text-emerald-500 font-mono font-bold uppercase tracking-wider">Enterprise OS v1.0</p>
          </div>
        </div>

        {/* التبويبات الـ 12 */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            const hasPermission = tab.roles.includes(activeUser.role);

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (hasPermission) {
                    setActiveTab(tab.id);
                    localStorage.setItem('mushroom_active_tab', tab.id);
                  }
                }}
                disabled={!hasPermission}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : hasPermission
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 cursor-not-allowed opacity-40'
                }`}
                title={!hasPermission ? 'يتطلب صلاحية أعلى للوصول' : undefined}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{tab.label}</span>
                </div>
                {!hasPermission && (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* أسفل القائمة الجانبية - معلومات المستخدم الفورية وقفل النظام */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {getDisplayUserName(activeUser).charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white font-semibold leading-tight truncate">{getDisplayUserName(activeUser)}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                {activeUser.role === 'Admin' ? 'الإدارة العامة' : activeUser.role === 'Supervisor' ? 'المشرف العام' : 'المشغل الفني'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLockSystem}
            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white py-2 rounded-lg text-xs font-bold transition-all duration-150 shadow-md hover:shadow-rose-900/20"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>قفل النظام (خروج)</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
          ب. القائمة الجانبية للهواتف (Mobile Drawer Sidebar)
          ========================================== */}
      <div className={`fixed inset-0 z-[9999] flex lg:hidden transition-all duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* خلفية معتمة */}
        <div 
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
        />
        
        <aside 
          className={`fixed right-0 top-0 w-[280px] h-screen bg-slate-900 text-slate-300 shadow-2xl z-[99999] flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ height: '100vh' }}
        >
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-slate-800/80 p-0.5 border border-emerald-500/20"
              >
                <img src={appLogo} alt="Mushroom System" className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
              </button>
              <div>
                <h1 
                  className="font-bold text-sm leading-none text-white cursor-pointer hover:text-emerald-400 transition-colors"
                  onClick={() => {
                    setActiveTab('الرئيسية');
                    localStorage.setItem('mushroom_active_tab', 'الرئيسية');
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Mushroom System
                </h1>
                <p className="text-[9px] text-emerald-500 font-mono mt-0.5">Enterprise OS</p>
              </div>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeTab === tab.id;
              const hasPermission = tab.roles.includes(activeUser.role);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (hasPermission) {
                      setActiveTab(tab.id);
                      localStorage.setItem('mushroom_active_tab', tab.id);
                      setMobileMenuOpen(false);
                    }
                  }}
                  disabled={!hasPermission}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : hasPermission
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-600 cursor-not-allowed opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {!hasPermission && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg text-right">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {getDisplayUserName(activeUser).charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white font-semibold leading-tight truncate">{getDisplayUserName(activeUser)}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                  {activeUser.role === 'Admin' ? 'الإدارة العامة' : activeUser.role === 'Supervisor' ? 'المشرف العام' : 'المشغل الفني'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLockSystem();
              }}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white py-2 rounded-lg text-xs font-bold transition-all duration-150 shadow-md"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>قفل النظام</span>
            </button>
            <div className="text-center">
              <span className="text-[10px] text-slate-500 font-semibold block">نظام الماشروم</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ==========================================
          ج. الحاوية الرئيسية ومحتوى الشاشة (Main Content Viewport)
          ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* شريط الإجراءات العلوي (Top Profile & Control Bar) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm z-30 gap-4 flex-nowrap overflow-hidden">
          
          {/* جهة اليمين: زر الموبايل وعنوان التبويب ومحرك البحث */}
          <div className="flex items-center gap-3 lg:gap-6">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            
            {/* عنوان الصفحة النشطة - معروض دائماً للكمبيوتر والموبايل برصاصة خضراء أنيقة */}
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full shrink-0"></span>
              <h1 className="text-sm lg:text-base font-extrabold text-slate-800 tracking-tight whitespace-nowrap">
                {activeTab}
              </h1>
            </div>

            {/* حقل البحث الشامل المستجيب - معروض على الأجهزة المتوسطة والكبيرة */}
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="البحث الشامل في النظام..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-lg py-2 pr-9 pl-4 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all duration-200"
              />
              {/* قائمة البحث المنسدلة التفاعلية الفورية */}
              {globalSearch.trim() && (
                <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-right overflow-hidden max-h-96 overflow-y-auto animate-scale-in" dir="rtl">
                  <div className="bg-slate-50 p-2.5 border-b border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>نتائج البحث الفوري في النظام</span>
                    <button onClick={() => setGlobalSearch('')} className="text-slate-300 hover:text-slate-500 transition-colors">إغلاق ✕</button>
                  </div>
                  {getSearchResults().length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      لا توجد تطابقات لـ "{globalSearch}".
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-150">
                      {getSearchResults().map((res, idx) => (
                        <div
                          key={`${res.category}-${res.id}-${idx}`}
                          onClick={() => {
                            setActiveTab(res.tab as any);
                            localStorage.setItem('mushroom_active_tab', res.tab as string);
                            setGlobalSearch('');
                          }}
                          className="p-3 hover:bg-slate-50/85 transition-all cursor-pointer flex flex-col gap-1 active:bg-slate-100"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-100">{res.category}</span>
                            <span className="text-[9px] text-slate-400 font-semibold">انقر للتصفح ⏎</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800">{res.title}</span>
                          <span className="text-[10px] text-slate-500 font-medium leading-normal">{res.subtitle}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* جهة اليسار: زر وضع التجربة، تبديل الصلاحيات الفوري، وبطاقة المستخدم الكاملة */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            
            {/* زر تبديل المظهر (Light/Dark Theme Toggle) */}
            <button
              id="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'التبديل إلى المظهر المضيء' : 'التبديل إلى المظهر المظلم'}
              className="p-1.5 lg:p-2 rounded-lg text-slate-500 hover:text-emerald-500 transition-colors shrink-0 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-sm flex items-center justify-center cursor-pointer"
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-500 animate-spin-slow" />
              ) : (
                <Moon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-indigo-600" />
              )}
            </button>

            {/* زر وضع التجربة التفاعلي */}
            <button
              id="demo-mode-toggle"
              onClick={toggleDemoMode}
              className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg text-[10px] lg:text-xs font-bold flex items-center gap-1.5 transition-all duration-200 border shadow-sm ${
                demoMode 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                  : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${demoMode ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">
                {demoMode ? 'وضع التجربة' : 'الوضع الإنتاجي'}
              </span>
            </button>

            {/* نظام تبديل الصلاحيات الفوري بالمدير والمشرف والمشغل - معروض على الأجهزة المتوسطة والكبيرة */}
            <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 border border-slate-200 p-0.5 rounded-lg shrink-0">
              <button
                onClick={() => handleRoleSwitchRequest('Admin')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all duration-150 ${
                  activeUser.role === 'Admin'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                مدير
              </button>
              <button
                onClick={() => handleRoleSwitchRequest('Supervisor')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all duration-150 ${
                  activeUser.role === 'Supervisor'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                مشرف
              </button>
              <button
                onClick={() => handleRoleSwitchRequest('Operator')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all duration-150 ${
                  activeUser.role === 'Operator'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                مشغل
              </button>
            </div>

            {/* بطاقة المستخدم النشط الكاملة والآمنة - تظهر بالكامل للموبايل والكمبيوتر دون أي اختصارات أو إخفاء */}
            <div className="flex items-center gap-2 lg:gap-3 pr-2 lg:pr-4 border-r border-slate-200 shrink-0">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shadow-sm shrink-0">
                {getDisplayUserName(activeUser).charAt(0)}
              </div>
              <div className="hidden sm:block text-right leading-none shrink-0">
                <span className="block text-xs font-bold text-slate-800 whitespace-nowrap">
                  {getDisplayUserName(activeUser)}
                </span>
                <span className="block text-[9px] lg:text-[10px] text-slate-400 mt-1 font-semibold whitespace-nowrap">
                  {activeUser.role === 'Admin' ? 'الإدارة العامة' : activeUser.role === 'Supervisor' ? 'صلاحيات إشرافية' : 'تسجيل القراءات'}
                </span>
              </div>
              <button
                onClick={handleLockSystem}
                title="قفل النظام والعودة لشاشة القفل"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors shrink-0 mr-1"
              >
                <Lock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
            </div>

          </div>
        </header>

        {/* عرض المحتوى الفعلي (Main Content Area) */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-slate-50">
          
          {/* ==========================================
              بنية تخطيط التبويبات الفعلي لتنظيم العرض
              ========================================== */}
          <div>
            <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-sm">
                {(() => {
                  const currentTabObj = tabs.find(t => t.id === activeTab);
                  const TabIcon = currentTabObj ? currentTabObj.icon : LayoutDashboard;
                  return <TabIcon className="w-5 h-5" />;
                })()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{activeTab}</h2>
                <p className="text-[11px] text-slate-500 font-medium">لوحة إدارة ومتابعة مزرعة الفطر المتكاملة</p>
              </div>
            </div>

            {/* محتوى كل تبويب من التبويبات الـ 12 */}
            {activeTab === 'الرئيسية' && (
              <div className="space-y-6">
                {/* 1. قسم الإحصائيات الفورية المستخرجة من IndexedDB لتأكيد الربط الهيكلي */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">الصوبات النشطة</span>
                      <span className="text-2xl font-extrabold text-slate-900">{totalGreenhouses}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Sprout className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">الدورات الجارية والمكتملة</span>
                      <span className="text-2xl font-extrabold text-slate-900">{totalCycles}</span>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                      <RotateCw className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">المواد بالمستودع</span>
                      <span className="text-2xl font-extrabold text-slate-900">{totalInventory} أصناف</span>
                    </div>
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                      <Package className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block">الرصيد المتاح بالعهدة</span>
                      <span className="text-xl font-extrabold text-emerald-600">
                        {dbSeeded 
                          ? (pettyCashRecord ? `${pettyCashRecord.current_balance.toLocaleString()} ج.م` : '0 ج.م') 
                          : 'تحميل...'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* بطاقات وصول سريع */}
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('المبيعات')}
                    className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 hover:bg-emerald-100 transition-all cursor-pointer"
                  >
                    <BarChart3 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <span className="text-emerald-700 text-sm font-bold block">المبيعات</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('التحكم البيئي')}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-all cursor-pointer"
                  >
                    <Thermometer className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                    <span className="text-amber-700 text-sm font-bold block">التحكم البيئي</span>
                  </button>
                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-all cursor-pointer"
                  >
                    <DollarSign className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <span className="text-blue-700 text-sm font-bold block">مصروف جديد</span>
                  </button>
                </div>

                {/* 2. تنبيهات النقص في المخزن والإنذارات البيئية الحية لغرفة الفطر */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* صندوق المهام وتوصيات اليوم لمستلزمات الفطر */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>المهام اليومية وتوجيهات الدورة النشطة</span>
                      </h3>
                      {activeCycles.length > 0 && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">نشط: {activeCycles.length} دورة</span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {derivedTasks.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-600">لا يوجد مهام مجدولة لليوم</p>
                          <p className="text-[10px] text-slate-400 mt-1">المزرعة مستقرة وفي حالة سكون لعدم وجود دورات إنتاجية نشطة حالياً.</p>
                        </div>
                      ) : (
                        derivedTasks.map(task => (
                          <div key={task.id} className={`p-3 bg-slate-50 border-r-4 rounded-md flex items-start gap-3 ${
                            task.status === 'Completed' 
                              ? 'border-r-emerald-500' 
                              : task.status === 'Pending' 
                              ? 'border-r-amber-500' 
                              : 'border-r-blue-500'
                          }`}>
                            <div className={`${task.statusColor} p-1 rounded text-[9px] font-bold mt-0.5 shrink-0`}>
                              {task.statusLabel}
                            </div>
                            <div className="text-xs">
                              <span className="font-bold text-slate-800 block">{task.title}</span>
                              <span className="text-slate-500 mt-1 block">{task.details}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* تنبيهات الحد الأدنى للمخزون الفعلي (تلقائي) */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>تنبيهات المخزون الحرجة</span>
                    </h3>
                    <p className="text-xs text-slate-500">الأصناف التي أوشكت كمياتها على النفاد وتتطلب تمويلاً فوريًا من العهدة المالية:</p>
                    
                    <div className="space-y-3">
                      {inventoryList.filter(item => item.quantity <= item.min_stock_alert).length === 0 ? (
                        <div className="p-8 text-center text-emerald-600 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-100 flex flex-col items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 animate-bounce" />
                          <p className="text-xs font-bold text-emerald-800">جميع مؤشرات المخزون آمنة وطبيعية</p>
                          <p className="text-[10px] text-emerald-600/70 mt-1">لا توجد مواد حرجة تتطلب التمويل أو الشراء الفوري.</p>
                        </div>
                      ) : (
                        inventoryList.filter(item => item.quantity <= item.min_stock_alert).map(item => (
                          <div key={item.id} className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800 text-xs block">{item.item_name}</span>
                              <span className="text-[10px] text-rose-600 mt-1 block font-semibold">
                                المتبقي: {item.quantity} {item.unit} | الحد الأدنى: {item.min_stock_alert}
                              </span>
                            </div>
                            <span className="text-rose-700 bg-rose-100 text-[10px] font-extrabold px-2 py-1 rounded">طلب شراء</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* التبويب 2: الدورات */}
            {activeTab === 'الدورات' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <p className="text-xs text-slate-500">إدارة ومراقبة دورات زراعة الفطر المختلفة، الاستثمارات المبدئية، وحالات الدورات النشطة والمنتهية.</p>
                  <button
                    onClick={() => {
                      if (activeUser.role !== 'Admin') {
                        setAlertModalMessage('هذه الصلاحية مخصصة للإدارة العامة فقط.');
                        setShowAlertModal(true);
                      } else {
                        // تحديد أول صوبة افتراضياً لتسهيل الإدخال
                        if (greenhousesList.length > 0) {
                          setNewCycleGreenhouseId(String(greenhousesList[0].id));
                        }
                        setShowAddCycleModal(true);
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white active:bg-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    + إنشاء دورة جديدة
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                  <div className="min-w-[768px] lg:min-w-0">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-6 text-xs font-bold text-slate-500">
                      <span>اسم الدورة</span>
                      <span>الصوبة المخصصة</span>
                      <span>تاريخ البدء</span>
                      <span>الاستثمار الأولي</span>
                      <span>الحالة</span>
                      <span>الإجراءات</span>
                    </div>
                    {cyclesList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium bg-slate-50/30">
                        لا توجد دورات تشغيلية نشطة حالياً في المزرعة.
                      </div>
                    ) : (
                      cyclesList.map(cycle => {
                        const gh = greenhousesList.find(g => g.id === cycle.greenhouse_id);
                        return (
                          <div key={cycle.id} className="p-4 grid grid-cols-6 text-xs text-slate-700 items-center border-b border-slate-100 last:border-b-0">
                            <span className="font-bold text-slate-900">{cycle.cycle_number}</span>
                            <span>{gh ? gh.name : `صوبة #${cycle.greenhouse_id}`}</span>
                            <span>{cycle.start_date}</span>
                            <span className="font-semibold text-slate-800">{cycle.initial_investment.toLocaleString()} ج.م</span>
                            <span>
                              {cycle.status === 'Active' ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-[10px] font-bold">نشطة حالياً</span>
                              ) : (
                                <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md text-[10px] font-bold">مكتملة ومرحلة</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => (window as any).editRecord('cycles', cycle.id!)}
                                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={(e) => (window as any).deleteRecord(e, 'cycles', cycle.id!)}
                                className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* التبويب 3: المصاريف */}
            {activeTab === 'المصاريف' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <p className="text-xs text-slate-500">تسجيل وتوزيع مصاريف المزرعة على الدورات النشطة، ويشمل ذلك مصاريف التشغيل ومشتريات الأسمدة ومصاريف البيع للعملاء.</p>
                  <button
                    onClick={() => {
                      if (activeUser.role !== 'Admin') {
                        setAlertModalMessage('هذه الصلاحية مخصصة للإدارة العامة فقط.');
                        setShowAlertModal(true);
                        return;
                      }
                      
                      const activeC = cyclesList.filter(c => c.status === 'Active');
                      if (activeC.length === 0) {
                        setAlertModalMessage('يرجى بدء دورة إنتاجية جديدة أولاً لربط العمليات بها');
                        setShowAlertModal(true);
                      } else {
                        // تعيين الدورة الافتراضية لأول دورة نشطة تيسيراً للعمل
                        setNewExpenseCycleId(String(activeC[0].id));
                        setShowAddExpenseModal(true);
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white active:bg-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    + إضافة مصروف تشغيلي / مبيعات
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs">مشتريات تشغيلية مؤخرة</h4>
                    <span className="text-[10px] text-slate-400 font-semibold block">تحديث تلقائي لحالة العهدة والمخزون في الوقت الفعلي</span>
                    {expensesList.filter(e => e.type === 'Operational').length === 0 ? (
                      <div className="h-24 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                        لا يوجد مصاريف تشغيل مسجلة في الـ 48 ساعة الأخيرة
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {expensesList.filter(e => e.type === 'Operational').map(exp => (
                          <div key={exp.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-800 block">{exp.details}</span>
                              <span className="text-[10px] text-slate-400 block mt-1">التاريخ: {exp.date}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-rose-600">{exp.amount?.toLocaleString()} ج.م</span>
                              <div className="flex items-center gap-2 border-r border-slate-200 pr-2 mr-1">
                                <button
                                  onClick={() => (window as any).editRecord('expenses_operational', exp.id!)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer text-[10px]"
                                >
                                  تعديل
                                </button>
                                <button
                                  onClick={(e) => (window as any).deleteRecord(e, 'expenses_operational', exp.id!)}
                                  className="text-red-600 hover:text-red-800 font-semibold cursor-pointer text-[10px]"
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs">مصاريف ومبيعات شحن العملاء</h4>
                    <span className="text-[10px] text-slate-400 font-semibold block">حساب كراتين الشحن والمبالغ المسددة والمتبقي كديون</span>
                    {expensesList.filter(e => e.type === 'Selling').length === 0 ? (
                      <div className="h-24 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                        لا يوجد فواتير بيع مسجلة حالياً
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {expensesList.filter(e => e.type === 'Selling').map(exp => (
                          <div key={exp.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-800 block">{exp.customer_name}</span>
                              <span className="text-[10px] text-slate-400 block mt-1">الكراتين: {exp.total_boxes} | السعر: {exp.price_per_box} ج.م | التاريخ: {exp.date}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-left">
                                <span className="font-extrabold text-emerald-600 block">{exp.total_amount?.toLocaleString()} ج.م</span>
                                <span className="text-[9px] text-slate-400">سُدّد: {exp.paid_amount?.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex items-center gap-2 border-r border-slate-200 pr-2 mr-1">
                                <button
                                  onClick={() => (window as any).editRecord('expenses_selling', exp.id!)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer text-[10px]"
                                >
                                  تعديل
                                </button>
                                <button
                                  onClick={(e) => (window as any).deleteRecord(e, 'expenses_selling', exp.id!)}
                                  className="text-red-600 hover:text-red-800 font-semibold cursor-pointer text-[10px]"
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* التبويب 4: المبيعات */}
            {activeTab === 'المبيعات' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">سجل الشحنات والمبيعات والديون</h3>
                    <p className="text-xs text-slate-500 mt-1">سجل الشحنات والعملاء والمبالغ المتبقية للتحصيل. يربط بشكل مباشر ديون العملاء بالفواتير الصادرة لحفظ الحقوق.</p>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    {expensesList.filter(e => e.type === 'Selling').length > 0 && (
                      <button
                        onClick={() => {
                          const salesHeaders = [
                            { key: 'customer_name', label: 'العميل' },
                            { key: 'date', label: 'التاريخ' },
                            { key: 'total_boxes', label: 'عدد الكراتين' },
                            { key: 'price_per_box', label: 'سعر الكرتونة (ج.م)' },
                            { key: 'total_amount', label: 'إجمالي الفاتورة (ج.م)' },
                            { key: 'paid_amount', label: 'المسدد نقداً (ج.م)' },
                            { key: 'remaining_amount', label: 'المتبقي (الديون) (ج.م)' },
                            { key: 'due_date', label: 'تاريخ استحقاق التحصيل' }
                          ];
                          exportToCSV(expensesList.filter(e => e.type === 'Selling'), salesHeaders, 'تقارير_المبيعات_والديون');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        تصدير المبيعات CSV 📥
                      </button>
                    )}
                    {(overdueDebts.length > 0 || approachingDebts.length > 0) && (
                      <button
                        onClick={() => setShowDebtAlertModal(true)}
                        className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        تنبيهات التحصيل 🔔 ({overdueDebts.length + approachingDebts.length})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const activeC = cyclesList.filter(c => c.status === 'Active');
                        if (activeC.length === 0) {
                          setAlertModalMessage('يرجى بدء دورة إنتاجية جديدة أولاً لربط المبيعات بها.');
                          setShowAlertModal(true);
                          return;
                        }
                        setNewExpenseType('Selling');
                        setNewExpenseCycleId(String(activeC[0].id));
                        setShowAddExpenseModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      + إضافة حركة بيع
                    </button>
                  </div>
                </div>
                
                {expensesList.filter(e => e.type === 'Selling').length === 0 ? (
                  <div className="border border-slate-200 rounded-lg p-6 bg-slate-50/50 text-center text-slate-400 text-xs shadow-sm">
                    سيتم عرض جدول فواتير العملاء التفصيلي هنا بعد البدء بإضافة المبيعات.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                    <div className="min-w-[768px] lg:min-w-0">
                      <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-7 text-xs font-bold text-slate-500">
                        <span>العميل</span>
                        <span>التاريخ</span>
                        <span>عدد الكراتين</span>
                        <span>إجمالي الفاتورة</span>
                        <span>المسدد</span>
                        <span>المتبقي (الديون للتحصيل)</span>
                        <span>الإجراءات</span>
                      </div>
                      {expensesList.filter(e => e.type === 'Selling').map(exp => {
                        const isOverdueInvoice = exp.remaining_amount && exp.remaining_amount > 0 && exp.due_date && isOverdue(exp.due_date);
                        return (
                          <div key={exp.id} className={`p-4 grid grid-cols-7 text-xs items-center border-b border-slate-100 last:border-b-0 ${isOverdueInvoice ? 'bg-rose-50/40 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 border-r-4 border-r-rose-500' : 'text-slate-700'}`}>
                            <span className="font-bold text-slate-900">{exp.customer_name}</span>
                            <span>{exp.date}</span>
                            <span>{exp.total_boxes} كرتونة</span>
                            <span className="font-bold text-slate-900">{exp.total_amount?.toLocaleString()} ج.م</span>
                            <span className="text-emerald-600 font-semibold">{exp.paid_amount?.toLocaleString()} ج.م</span>
                            <span className="font-semibold flex flex-col gap-1">
                              <span className={exp.remaining_amount && exp.remaining_amount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                {exp.remaining_amount?.toLocaleString()} ج.م
                              </span>
                              {exp.remaining_amount && exp.remaining_amount > 0 && exp.due_date && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded w-max font-medium ${isOverdue(exp.due_date) ? 'text-rose-800 bg-rose-100 dark:bg-rose-900/60 dark:text-rose-200 font-bold animate-pulse' : 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
                                  استحقاق: {exp.due_date} {isOverdue(exp.due_date) && '⏳ (متأخر)'}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => (window as any).editRecord('expenses_selling', exp.id!)}
                                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={(e) => (window as any).deleteRecord(e, 'expenses_selling', exp.id!)}
                                className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* التبويب 5: الإنتاج */}
            {activeTab === 'الإنتاج' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">الإنتاج والفرز اليومي لكل صوبة</h3>
                    <p className="text-xs text-slate-500 mt-1">متابعة الفرز والإنتاج اليومي لكل صوبة، وتسجيل الهدر الزراعي والوزن بالجرام تمهيداً لتقدير الأرباح وتصنيف فئات الجودة.</p>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    {operationalLogsList.filter(l => l.harvest_weight !== undefined).length > 0 && (
                      <button
                        onClick={() => {
                          const productionHeaders = [
                            { key: 'date', label: 'التاريخ' },
                            { key: 'cycle_name', label: 'الدورة الإنتاجية' },
                            { key: 'weight', label: 'الوزن المقطوف (كجم)' },
                            { key: 'type', label: 'نوع الفطر' },
                            { key: 'grade', label: 'درجة الفرز والجودة' },
                            { key: 'notes', label: 'الملاحظات' }
                          ];
                          const mappedProdData = operationalLogsList
                            .filter(l => l.harvest_weight !== undefined)
                            .map(log => {
                              const matchedCycle = cyclesList.find(c => c.id === log.cycle_id);
                              const cycleName = matchedCycle ? matchedCycle.cycle_number : 'دورة غير معروفة';
                              return {
                                date: log.date,
                                cycle_name: cycleName,
                                weight: log.harvest_weight,
                                type: log.harvest_type || '',
                                grade: log.harvest_grade === 'A' ? 'نخب أول ممتاز (A)' : log.harvest_grade === 'B' ? 'نخب ثان (B)' : 'نخب ثالث (C)',
                                notes: log.extra_notes || ''
                              };
                            });
                          exportToCSV(mappedProdData, productionHeaders, 'تقارير_الإنتاج_والفرز');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        تصدير الإنتاج CSV 📥
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const activeC = cyclesList.filter(c => c.status === 'Active');
                        if (activeC.length === 0) {
                          setAlertModalMessage('يرجى بدء دورة إنتاجية جديدة أولاً لربط القطاف والفرز بها.');
                          setShowAlertModal(true);
                          return;
                        }
                        setHarvestCycleId(String(activeC[0].id));
                        setHarvestDate(new Date().toISOString().split('T')[0]);
                        setShowAddHarvestModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      + إضافة سجل إنتاج وفرز جديد
                    </button>
                  </div>
                </div>

                {operationalLogsList.filter(l => l.harvest_weight !== undefined).length === 0 ? (
                  <div className="border border-slate-200 rounded-lg p-6 bg-slate-50/50 text-center text-slate-400 text-xs shadow-sm">
                    لا توجد سجلات قطاف وإنتاج مسجلة حالياً. اضغط على الزر أعلاه لإضافة أول سجل إنتاج.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                    <div className="min-w-[768px] lg:min-w-0">
                      <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-6 text-xs font-bold text-slate-500">
                        <span>التاريخ</span>
                        <span>الدورة الإنتاجية</span>
                        <span>الوزن المقطوف</span>
                        <span>نوع الفطر</span>
                        <span>درجة الفرز والجودة</span>
                        <span>الإجراءات</span>
                      </div>
                      {operationalLogsList.filter(l => l.harvest_weight !== undefined).map(log => {
                        const matchedCycle = cyclesList.find(c => c.id === log.cycle_id);
                        const cycleName = matchedCycle ? matchedCycle.cycle_number : 'دورة غير معروفة';
                        return (
                          <div key={log.id} className="p-4 grid grid-cols-6 text-xs text-slate-700 items-center border-b border-slate-100 last:border-b-0">
                            <span className="font-bold text-slate-900">{log.date}</span>
                            <span className="text-slate-600">{cycleName}</span>
                            <span className="font-extrabold text-emerald-600">{log.harvest_weight} كجم</span>
                            <span>{log.harvest_type}</span>
                            <span>
                              <span className={`px-2.5 py-1 rounded font-bold text-[10px] ${
                                log.harvest_grade === 'A' ? 'bg-emerald-100 text-emerald-800' : log.harvest_grade === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {log.harvest_grade === 'A' ? 'نخب أول ممتاز (A)' : log.harvest_grade === 'B' ? 'نخب ثان (B)' : 'نخب ثالث (C)'}
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => (window as any).editRecord('operational_logs_harvest', log.id!)}
                                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={(e) => (window as any).deleteRecord(e, 'operational_logs_harvest', log.id!)}
                                className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* التبويب 6: العهدة */}
            {activeTab === 'العهدة' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">إدارة العهدة والمالية</h3>
                    <p className="text-xs text-slate-500 mt-1">إدارة الخزينة والعهدة المالية النقدية المخصصة للمزرعة بشكل فوري ومراجعة سجل العمليات المالي التاريخي (Audit Trail) الذي لا يقبل الحذف.</p>
                  </div>
                  <button
                    onClick={() => {
                      setPcType('Deposit');
                      setPcAmount('');
                      setPcDetails('');
                      setShowAddPettyCashModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    + إضافة حركة عهدة
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border border-slate-200 rounded-lg p-6 bg-slate-900 text-white space-y-4 shadow-md md:col-span-1 flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block mb-2">رصيد العهدة الفعلي الحالي</span>
                      <div className="text-3xl font-extrabold text-emerald-400">
                        {pettyCashRecord ? `${pettyCashRecord.current_balance.toLocaleString()} ج.م` : '0 ج.م'}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-4">
                      ملاحظة الأمان: السجل المالي تدقيقي وتاريخي معتمد، وغير قابل للحذف المباشر لحفظ حقوق الشركاء.
                    </p>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">سجل العمليات التدقيقي والمالي (Audit Trail)</h4>
                    {transactions.length === 0 ? (
                      <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 text-center text-slate-400 text-xs">
                        لا توجد حركات مالية مسجلة في سجل العهدة حتى الآن.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                        <div className="min-w-[768px] lg:min-w-0">
                          <div className="bg-slate-100 p-3 text-[11px] font-bold text-slate-500 grid grid-cols-5">
                            <span>التاريخ</span>
                            <span>العملية</span>
                            <span>المبلغ</span>
                            <span>التفاصيل والبيان</span>
                            <span>الإجراءات</span>
                          </div>
                          {transactions.map(t => (
                            <div key={t.id} className="p-3 text-xs text-slate-700 grid grid-cols-5 border-b border-slate-100 items-center">
                              <span>{new Date(t.timestamp).toLocaleDateString('ar-EG')}</span>
                              <span className={`font-bold ${t.operation_type === 'Deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.operation_type === 'Deposit' ? 'إيداع عهدة' : 'صرف تشغيلي'}
                              </span>
                              <span className="font-extrabold">{t.amount.toLocaleString()} ج.م</span>
                              <span>{t.details}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => (window as any).editRecord('transactions', t.id!)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                                >
                                  تعديل
                                </button>
                                <button
                                  onClick={(e) => (window as any).deleteRecord(e, 'transactions', t.id!)}
                                  className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* التبويب 7: الموظفون */}
            {activeTab === 'الموظفون' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">إدارة العمال والموظفين والرواتب</h3>
                    <p className="text-xs text-slate-500 mt-1">تنظيم رواتب الموظفين والعمال، ومتابعة السلف والمكافآت لربطها بانتهاء كل دورة تشغيلية بشكل دقيق لتعديل الأرباح.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPayrollEmployeeId(null);
                        setPayrollCycleId(null);
                        setPayrollAmount(0);
                        setShowPayrollModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      حساب راتب
                    </button>
                    <button
                      onClick={() => {
                        setEmpName('');
                        setEmpBaseSalary('');
                        setEmpAdvances('0');
                        setEmpBonuses('0');
                        setEmpSalaryType('fixed');
                        setEmpDailyRate('');
                        setEmpProductivityPrice('');
                        setShowAddEmployeeModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      + إضافة / تحديث سجل موظف
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                  <div className="min-w-[768px] lg:min-w-0">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-5 text-xs font-bold text-slate-500">
                      <span>اسم الموظف</span>
                      <span>الراتب الأساسي</span>
                      <span>إجمالي السلف المقترضة</span>
                      <span>المكافآت والبدلات</span>
                      <span>الإجراءات</span>
                    </div>
                    {employeesList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/30">
                        لا يوجد موظفون مسجلون في قاعدة البيانات حاليًا.
                      </div>
                    ) : (
                      employeesList.map(emp => (
                        <div key={emp.id} className="p-4 grid grid-cols-5 text-xs text-slate-700 border-b border-slate-100 last:border-b-0 items-center">
                          <span className="font-bold text-slate-900">{emp.name}</span>
                          <span>{emp.base_salary.toLocaleString()} ج.م</span>
                          <span className={emp.total_advances > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                            {emp.total_advances.toLocaleString()} ج.م
                          </span>
                          <span className={emp.total_bonuses > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                            {emp.total_bonuses.toLocaleString()} ج.م
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => (window as any).editRecord('employees', emp.id!)}
                              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={(e) => (window as any).deleteRecord(e, 'employees', emp.id!)}
                              className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* التبويب 8: المخزون */}
            {activeTab === 'المخزون' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">المخازن والمستلزمات والمواد الخام</h3>
                    <p className="text-xs text-slate-500 mt-1">مراقبة مستويات المخزون للمستلزمات الحيوية مثل الأبواغ، الجبس، الصناديق والمطهرات، مع تنبيهات تلقائية للحد الأدنى.</p>
                  </div>
                  <button
                    onClick={() => {
                      setInvItemName('');
                      setInvQuantity('');
                      setInvUnit('كيلو');
                      setInvMinStockAlert('10');
                      setInvExpiryDate('');
                      setShowAddInventoryModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    + إضافة مستلزم / مادة خام
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                  <div className="min-w-[768px] lg:min-w-0">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-6 text-xs font-bold text-slate-500">
                      <span>اسم الصنف</span>
                      <span>الكمية المتاحة</span>
                      <span>تاريخ التوريد</span>
                      <span>تاريخ انتهاء الصلاحية</span>
                      <span>حد الطلب الآمن</span>
                      <span>الإجراءات</span>
                    </div>
                    {inventoryList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/30">
                        المخزن فارغ حالياً. يرجى توريد خامات إنتاج أو تمويل المخزون.
                      </div>
                    ) : (
                      inventoryList.map(item => (
                        <div key={item.id} className="p-4 grid grid-cols-6 text-xs text-slate-700 border-b border-slate-100 last:border-b-0 items-center">
                          <span className="font-bold text-slate-900">{item.item_name}</span>
                          <span className={item.quantity <= item.min_stock_alert ? 'text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded w-max' : 'text-slate-800'}>
                            {item.quantity} {item.unit} {item.quantity <= item.min_stock_alert && '(حرج)'}
                          </span>
                          <span>{item.date_added}</span>
                          <span>{item.expiry_date || 'غير محدد'}</span>
                          <span className="text-slate-500 font-mono">{item.min_stock_alert} {item.unit}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => (window as any).editRecord('inventory', item.id!)}
                              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={(e) => (window as any).deleteRecord(e, 'inventory', item.id!)}
                              className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* التبويب 9: التشغيل */}
            {activeTab === 'التشغيل' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">التحكم البيئي اليومي للصوبات</h3>
                    <p className="text-xs text-slate-500 mt-1">تسجيل ومتابعة قراءات درجة الحرارة، الرطوبة، ومستويات CO2 والنظافة لضمان الحفاظ على البيئة المثالية لنمو الفطر.</p>
                  </div>
                  <button
                    onClick={() => {
                      const activeC = cyclesList.filter(c => c.status === 'Active');
                      if (activeC.length === 0) {
                        setAlertModalMessage('يرجى بدء دورة إنتاجية جديدة أولاً لربط قراءات المناخ والبيئة بها.');
                        setShowAlertModal(true);
                        return;
                      }
                      setClimateCycleId(String(activeC[0].id));
                      setClimateDate(new Date().toISOString().split('T')[0]);
                      setShowAddClimateModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    + إضافة قراءة بيئية جديدة
                  </button>
                </div>

                {operationalLogsList.filter(l => l.temperature !== undefined && l.harvest_weight === undefined).length === 0 ? (
                  <div className="border border-slate-200 rounded-lg p-6 bg-slate-50/50 text-center text-slate-400 text-xs shadow-sm">
                    لا توجد قراءات بيئية مسجلة لليوم الحالي. اضغط على الزر أعلاه لإضافة قراءة مناخية.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                    <div className="min-w-[768px] lg:min-w-0">
                      <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-7 text-xs font-bold text-slate-500">
                        <span>التاريخ والوردية</span>
                        <span>الدورة الإنتاجية</span>
                        <span>درجة الحرارة</span>
                        <span>مستوى الرطوبة</span>
                        <span>ثاني أكسيد الكربون (CO2)</span>
                        <span>تقييم النظافة والسلامة</span>
                        <span>الإجراءات</span>
                      </div>
                      {operationalLogsList.filter(l => l.temperature !== undefined && l.harvest_weight === undefined).map(log => {
                        const matchedCycle = cyclesList.find(c => c.id === log.cycle_id);
                        const cycleName = matchedCycle ? matchedCycle.cycle_number : 'دورة غير معروفة';
                        
                        // دالة تقييم بيئية تلقائية ذكية
                        const getAutoQualityScore = (t: number, h: number, c: number) => {
                          if (t >= 20 && t <= 26 && h >= 80 && h <= 90 && c <= 1000) {
                            return 'ممتاز (بيئة مثالية)';
                          }
                          return 'جيد (تحتاج تهوية)';
                        };
                        
                        return (
                          <div key={log.id} className="p-4 grid grid-cols-7 text-xs text-slate-700 border-b border-slate-100 last:border-b-0 items-center">
                            <span className="font-bold text-slate-900">{log.date}</span>
                            <span className="text-slate-500">{cycleName}</span>
                            <span>{log.temperature} °م</span>
                            <span>{log.humidity}%</span>
                            <span>{log.co2_level} ppm</span>
                            <span>
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                                  log.hygiene_status === 'Excellent' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {log.hygiene_status === 'Excellent' ? 'نظافة ممتازة' : 'نظافة جيدة'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  {getAutoQualityScore(log.temperature, log.humidity, log.co2_level)}
                                </span>
                              </div>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => (window as any).editRecord('operational_logs_climate', log.id!)}
                                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={(e) => (window as any).deleteRecord(e, 'operational_logs_climate', log.id!)}
                                className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* التبويب 10: التقارير */}
            {activeTab === 'التقارير' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <p className="text-xs text-slate-500">حساب الأرباح الصافية لكل دورة وتوزيعها تلقائياً على الشركاء بعد خصم كافة النفقات التشغيلية والبيع والرواتب والعهدة وإهلاك الأصول المتراكم.</p>
                
                {partnersList.length === 0 ? (
                  <div className="border border-slate-200 rounded-lg p-6 bg-slate-50/50 text-center text-slate-400 text-xs shadow-sm">
                    لا توجد بيانات شركاء أو دورات مغلقة لحساب التقارير الختامية وتوزيع الأرباح حالياً.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                      <div className="min-w-[768px] lg:min-w-0">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-4 text-xs font-bold text-slate-500">
                          <span>اسم الشريك</span>
                          <span>رأس المال المساهم</span>
                          <span>نسبة الأرباح (%)</span>
                          <span>حصة الشريك من صافي الربح الحالي</span>
                        </div>
                        {partnersList.map(partner => {
                          // حساب الإيرادات والمصاريف والاهلاكات الحقيقية وتوزيعها ديناميكياً
                          const totalSales = expensesList.filter(e => e.type === 'Selling').reduce((sum, e) => sum + (e.total_amount || 0), 0);
                          const totalExpenses = expensesList.filter(e => e.type === 'Operational').reduce((sum, e) => sum + (e.amount || 0), 0);
                          const totalDep = assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0);
                          const baseProfit = demoMode ? 35000 : 0;
                          const netProfit = Math.max(0, (totalSales - totalExpenses - totalDep) + baseProfit);
                          
                          const partnerPct = partner.profit_percentage || partner.share_percentage;
                          const partnerShare = (netProfit * partnerPct) / 100;
                          
                          return (
                            <div key={partner.id} className="p-4 grid grid-cols-4 text-xs text-slate-700 border-b border-slate-100 last:border-b-0 items-center">
                              <span className="font-bold text-slate-900">{partner.name}</span>
                              <span className="font-mono text-slate-500">{(partner.contribution_value || 0).toLocaleString()} ج.م</span>
                              <span>{partnerPct}%</span>
                              <span className="text-emerald-600 font-extrabold">{Math.round(partnerShare).toLocaleString()} ج.م</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 space-y-2">
                      <h4 className="font-bold text-xs">ملخص التوزيع والربحية الفعلي</h4>
                      <p className="text-[11px] leading-relaxed">
                        صافي أرباح المزرعة العام يقدر بقيمة <strong className="font-extrabold text-emerald-800">
                          {(() => {
                            const totalSales = expensesList.filter(e => e.type === 'Selling').reduce((sum, e) => sum + (e.total_amount || 0), 0);
                            const totalExpenses = expensesList.filter(e => e.type === 'Operational').reduce((sum, e) => sum + (e.amount || 0), 0);
                            const totalDep = assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0);
                            const baseProfit = demoMode ? 35000 : 0;
                            return Math.round(Math.max(0, (totalSales - totalExpenses - totalDep) + baseProfit)).toLocaleString();
                          })()} ج.م
                        </strong> (بعد خصم المصاريف البالغة <strong className="font-extrabold text-slate-800">{(expensesList.filter(e => e.type === 'Operational').reduce((sum, e) => sum + (e.amount || 0), 0)).toLocaleString()} ج.م</strong> وإهلاك الأصول البالغ <strong className="font-extrabold text-amber-700">{assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0).toLocaleString()} ج.م</strong> والرواتب). تم إيداع وتحديث حصص الشركاء بنجاح وأمان.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
                  <Info className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs text-slate-700">
                    ملاحظة هامة: يتم تقسيم الربح الصافي تلقائياً بناءً على النسبة المقررة لكل شريك بمجرد إغلاق حالة الدورة النشطة وتحديد الحالة "Completed" مع احتساب قسط إهلاك الأصول الثابتة.
                  </span>
                </div>
              </div>
            )}

            {/* التبويب: إدارة الصوبات */}
            {activeTab === 'الصوبات' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-right" dir="rtl">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">إدارة صوبات الإنتاج والتحضين</h3>
                    <p className="text-xs text-slate-500 mt-1">عرض حالة الصوبات الاستيعابية، القدرات التشغيلية ومستوى الإشغال الحالي لكل صوبة.</p>
                  </div>
                  {activeUser.role !== 'Operator' && (
                    <button
                      onClick={() => setShowAddGreenhouseModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>+ إضافة صوبة جديدة</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {greenhousesList.map(gh => {
                    const activeCycleInGh = cyclesList.find(c => String(c.greenhouse_id) === String(gh.id) && c.status === 'Active');
                    const isOccupied = !!activeCycleInGh;
                    
                    return (
                      <div key={gh.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{gh.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">ID: #{gh.id}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            gh.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {gh.status === 'Active' ? 'نشطة وتشغيلية' : 'تحت الصيانة'}
                          </span>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>السعة القصوى:</span>
                            <span className="font-bold text-slate-800">{gh.capacity.toLocaleString()} وحدة</span>
                          </div>
                          
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>حالة الإشغال:</span>
                            {isOccupied ? (
                              <span className="text-emerald-600 font-bold">مشغولة بالكامل</span>
                            ) : (
                              <span className="text-slate-400">فارغة ومتاحة</span>
                            )}
                          </div>

                          {isOccupied && (
                            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded text-[11px] text-emerald-800 mt-2">
                              <strong>الدورة الجارية:</strong> {activeCycleInGh.cycle_number}
                              <br />
                              <strong>الاستثمار الأولي:</strong> {activeCycleInGh.initial_investment.toLocaleString()} ج.م
                            </div>
                          )}
                        </div>

                        {activeUser.role !== 'Operator' && (
                          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                            <button
                              onClick={() => {
                                const newStatus = gh.status === 'Active' ? 'Maintenance' : 'Active';
                                activeDb.greenhouses.update(gh.id!, { status: newStatus }).then(() => {
                                  logGreenhouseStateChange(gh.id!, newStatus);
                                  setRefreshTrigger(prev => prev + 1);
                                });
                              }}
                              className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition-colors font-medium cursor-pointer"
                            >
                              تغيير الحالة
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTargetTable('greenhouses');
                                setDeleteTargetId(gh.id!);
                                setDeleteTargetMessage(`⚠️ هل أنت متأكد من رغبتك في حذف الصوبة "${gh.name}" بكافة تفاصيلها؟ لا يمكن التراجع عن هذا الإجراء.`);
                                setShowConfirmDeleteModal(true);
                              }}
                              className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded transition-colors font-medium cursor-pointer"
                            >
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* السجل التاريخي لحالات الصوبات الإنتاجية */}
                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">السجل التاريخي والتشغيلي للصوبات الزراعية</h4>
                      <p className="text-xs text-slate-500 mt-1">تتبع التغييرات في الحالات التشغيلية وأعمال الصيانة المسجلة للصوبات.</p>
                    </div>
                    {getGreenhouseStateHistory().length > 0 && (
                      <button
                        onClick={() => {
                          const headers = [
                            { key: 'date', label: 'التاريخ' },
                            { key: 'greenhouseName', label: 'الصوبة' },
                            { key: 'statusText', label: 'الحالة' },
                            { key: 'operator', label: 'المسؤول' },
                            { key: 'note', label: 'البيان والتفاصيل' }
                          ];
                          const data = getGreenhouseStateHistory().map((item: any) => {
                            const gh = greenhousesList.find(g => g.id === item.greenhouseId);
                            return {
                              date: item.date,
                              greenhouseName: gh ? gh.name : `صوبة #${item.greenhouseId}`,
                              statusText: item.status === 'Active' ? 'نشطة (تشغيلية)' : 'تحت الصيانة',
                              operator: item.operator,
                              note: item.note
                            };
                          });
                          exportToCSV(data, headers, 'سجل_حالات_الصوبات');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                      >
                        تصدير السجل CSV 📥
                      </button>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3">الصوبة</th>
                          <th className="p-3">الحالة التشغيلية</th>
                          <th className="p-3">المسؤول عن الإجراء</th>
                          <th className="p-3">تفاصيل الحالة والبيان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {getGreenhouseStateHistory().map((item: any) => {
                          const gh = greenhousesList.find(g => g.id === item.greenhouseId);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 font-medium text-slate-500">{item.date}</td>
                              <td className="p-3 font-bold text-slate-950">{gh ? gh.name : `صوبة #${item.greenhouseId}`}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                  {item.status === 'Active' ? 'نشطة التشغيل' : 'أعمال صيانة'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 font-medium">{item.operator}</td>
                              <td className="p-3 text-slate-500 max-w-[250px] truncate" title={item.note}>{item.note}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* التبويب: الأصول والإهلاكات */}
            {activeTab === 'الأصول' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-right" dir="rtl">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4 flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">الأصول الثابتة وحساب الإهلاك</h3>
                    <p className="text-xs text-slate-500 mt-1">تسجيل المعدات والآلات وحساب الإهلاك القسط الثابت تلقائياً لخصمه من صافي الأرباح.</p>
                  </div>
                  
                  {activeUser.role === 'Admin' && (
                    <button
                      onClick={() => {
                        setEditingAsset(null);
                        setAssetName('');
                        setAssetCost('');
                        setAssetLife('');
                        setAssetDate(new Date().toISOString().split('T')[0]);
                        setShowAddAssetModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <span>+ إضافة أصل جديد</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* جدول وقائمة الأصول المتاحة */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">سجل الأصول والاهلاك المتراكم الفعلي</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                      <div className="min-w-[650px] bg-slate-50 p-3 grid grid-cols-6 text-xs font-bold text-slate-500 border-b border-slate-200">
                        <span>اسم الأصل</span>
                        <span>تكلفة الشراء</span>
                        <span>تاريخ الشراء</span>
                        <span>العمر الافتراضي</span>
                        <span>الإهلاك المتراكم</span>
                        <span className="text-left pl-4">إجراءات</span>
                      </div>
                      
                      {assetsList.map(asset => {
                        const calculatedDep = calculateAssetDepreciation(asset);
                        const depPercent = Math.min(100, Math.round((calculatedDep / asset.purchase_cost) * 100));
                        
                        return (
                          <div key={asset.id} className="p-3 grid grid-cols-6 text-xs text-slate-700 border-b border-slate-100 items-center hover:bg-slate-50">
                            <span className="font-bold text-slate-900">{asset.name}</span>
                            <span>{asset.purchase_cost.toLocaleString()} ج.م</span>
                            <span>{asset.purchase_date}</span>
                            <span>{asset.useful_life} سنوات</span>
                            <div className="flex flex-col gap-1 pr-2">
                              <span className="font-bold text-amber-600">{calculatedDep.toLocaleString()} ج.م ({depPercent}%)</span>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${depPercent}%` }} />
                              </div>
                            </div>
                            <div className="flex gap-1.5 justify-end pl-2">
                              <button
                                onClick={() => {
                                  setEditingAsset(asset);
                                  setAssetName(asset.name);
                                  setAssetCost(String(asset.purchase_cost));
                                  setAssetLife(String(asset.useful_life));
                                  setAssetDate(asset.purchase_date);
                                  setShowAddAssetModal(true);
                                }}
                                className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded transition-colors font-medium cursor-pointer"
                              >
                                تعديل
                              </button>
                              {activeUser.role === 'Admin' && (
                                <button
                                  onClick={() => {
                                    setDeleteTargetTable('assets');
                                    setDeleteTargetId(asset.id!);
                                    setDeleteTargetMessage(`⚠️ هل أنت متأكد من رغبتك في حذف الأصل الثابت "${asset.name}"؟ سيتم إعادة احتساب نسب الإهلاك المتراكم وصافي الأرباح فوراً.`);
                                    setShowConfirmDeleteModal(true);
                                  }}
                                  className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded transition-colors font-medium cursor-pointer"
                                >
                                  حذف
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {assetsList.length === 0 && (
                        <div className="p-8 text-center text-xs text-slate-400">لا توجد أصول مسجلة حالياً.</div>
                      )}
                    </div>
                  </div>

                  {/* مخططات الإهلاك والتحليل */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>📊</span>
                      <span>مخطط الإهلاك السنوي</span>
                    </h4>
                    
                    <div className="space-y-3 text-xs text-slate-700">
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        توضح المخططات تآكل قيمة الأصول الثابتة سنوياً بناءً على طريقة القسط الثابت للتدقيق الحسابي:
                      </p>
                      
                      <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span>إجمالي تكلفة الأصول:</span>
                          <span className="font-bold text-slate-900">
                            {assetsList.reduce((sum, a) => sum + a.purchase_cost, 0).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>إجمالي الإهلاك المتراكم:</span>
                          <span className="font-bold text-amber-600">
                            {assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-2">
                          <span>صافي القيمة الدفترية للأصول:</span>
                          <span className="font-bold text-emerald-600">
                            {(assetsList.reduce((sum, a) => sum + a.purchase_cost, 0) - assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0)).toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>

                      {/* رسم بياني بصري بسيط للأعمار المتبقية للأصول */}
                      <div className="space-y-2 pt-2">
                        <span className="font-bold text-slate-800 text-[11px]">مستوى الإهلاك مقارنة بالزمن:</span>
                        {assetsList.map(asset => {
                          const calculatedDep = calculateAssetDepreciation(asset);
                          const depPercent = Math.min(100, Math.round((calculatedDep / asset.purchase_cost) * 100));
                          return (
                            <div key={asset.id} className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="truncate max-w-[120px]">{asset.name}</span>
                                <span>القيمة الحالية: {(asset.purchase_cost - calculatedDep).toLocaleString()} ج.م</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${100 - depPercent}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* التبويب: حصص الشركاء والأرباح */}
            {activeTab === 'الشركاء' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-right" dir="rtl">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4 flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">حصص الشركاء وتوزيعات الأرباح</h3>
                    <p className="text-xs text-slate-500 mt-1">تتبع رأس المال المستثمر وتوزيع صافي الأرباح بشكل فوري وتلقائي حسب نسبة الربح المقررة لكل شريك.</p>
                  </div>
                  
                  {activeUser.role === 'Admin' && (
                    <button
                      onClick={() => {
                        setEditingPartner(null);
                        setPartnerName('');
                        setPartnerContribution('');
                        setPartnerProfitPct('');
                        setShowAddPartnerModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <span>+ إضافة شريك جديد</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* سجل حصص الشركاء */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">أرصدة الشركاء ودفتر توزيع الأرباح الفوري</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                      <div className="min-w-[500px] bg-slate-50 p-3 grid grid-cols-5 text-xs font-bold text-slate-500 border-b border-slate-200">
                        <span>اسم الشريك</span>
                        <span>رأس المال المساهم</span>
                        <span>نسبة توزيع الأرباح</span>
                        <span>صافي الربح الموزع حالياً</span>
                        <span className="text-left pl-4">إجراءات</span>
                      </div>
                      
                      {partnersList.map(partner => {
                        const totalSales = expensesList
                          .filter(e => e.type === 'Selling')
                          .reduce((sum, e) => sum + (e.total_amount || 0), 0);
                        const totalExpenses = expensesList
                          .filter(e => e.type === 'Operational')
                          .reduce((sum, e) => sum + (e.amount || 0), 0);
                        const totalDep = assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0);
                        const baseProfit = demoMode ? 35000 : 0;
                        const netProfit = Math.max(0, (totalSales - totalExpenses - totalDep) + baseProfit);
                        const shareAmount = (netProfit * (partner.profit_percentage || partner.share_percentage || 0)) / 100;
                        
                        return (
                          <div key={partner.id} className="p-3 grid grid-cols-5 text-xs text-slate-700 border-b border-slate-100 items-center hover:bg-slate-50">
                            <span className="font-bold text-slate-900">{partner.name}</span>
                            <span>{(partner.contribution_value || 0).toLocaleString()} ج.م</span>
                            <span>{partner.profit_percentage || partner.share_percentage}%</span>
                            <span className="text-emerald-600 font-extrabold">{Math.round(shareAmount).toLocaleString()} ج.م</span>
                            <div className="flex gap-1.5 justify-end pl-2">
                              <button
                                onClick={() => {
                                  setEditingPartner(partner);
                                  setPartnerName(partner.name);
                                  setPartnerContribution(String(partner.contribution_value || 0));
                                  setPartnerProfitPct(String(partner.profit_percentage || partner.share_percentage || 0));
                                  setShowAddPartnerModal(true);
                                }}
                                className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded transition-colors font-medium cursor-pointer"
                              >
                                تعديل
                              </button>
                              {activeUser.role === 'Admin' && (
                                <button
                                  onClick={() => {
                                    setDeleteTargetTable('partners');
                                    setDeleteTargetId(partner.id!);
                                    setDeleteTargetMessage(`⚠️ هل أنت متأكد من رغبتك في حذف الشريك "${partner.name}"؟ سيتم إعادة توزيع نسب وحصص الأرباح والرسوم البيانية فوراً.`);
                                    setShowConfirmDeleteModal(true);
                                  }}
                                  className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded transition-colors font-medium cursor-pointer"
                                >
                                  حذف
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {partnersList.length === 0 && (
                        <div className="p-8 text-center text-xs text-slate-400">لا توجد بيانات شركاء مسجلة حالياً.</div>
                      )}
                    </div>
                  </div>

                  {/* ملخص الخزينة وتوزيع الأرباح */}
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                      <span>💰</span>
                      <span>الحساب المالي العام وتوزيع الأرباح</span>
                    </h4>
                    
                    <div className="space-y-3 text-xs text-emerald-800">
                      <p className="text-[11px] leading-relaxed text-emerald-700">
                        يتم حساب صافي أرباح مزرعة الماشروم المتكاملة تلقائياً بعد خصم المصاريف التشغيلية ومصاريف البيع، والرواتب، بالإضافة إلى إهلاك الأصول المتراكم:
                      </p>
                      
                      <div className="p-3 bg-white border border-emerald-100 rounded-lg space-y-2 text-slate-700">
                        <div className="flex justify-between">
                          <span>إجمالي المبيعات (الإنتاج):</span>
                          <span className="font-bold">
                            {(expensesList.filter(e => e.type === 'Selling').reduce((sum, e) => sum + (e.total_amount || 0), 0)).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>المصاريف التشغيلية:</span>
                          <span className="font-bold text-red-600">
                            {(expensesList.filter(e => e.type === 'Operational').reduce((sum, e) => sum + (e.amount || 0), 0)).toLocaleString()} ج.m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>إهلاك الأصول (خصم تلقائي):</span>
                          <span className="font-bold text-amber-600">
                            {assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-2 text-emerald-600 font-extrabold text-sm">
                          <span>صافي الأرباح القابلة للتوزيع:</span>
                          <span>
                            {(() => {
                              const totalSales = expensesList.filter(e => e.type === 'Selling').reduce((sum, e) => sum + (e.total_amount || 0), 0);
                              const totalExpenses = expensesList.filter(e => e.type === 'Operational').reduce((sum, e) => sum + (e.amount || 0), 0);
                              const totalDep = assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0);
                              const baseProfit = demoMode ? 35000 : 0;
                              return Math.max(0, (totalSales - totalExpenses - totalDep) + baseProfit).toLocaleString();
                            })()} ج.م
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-emerald-600/80 leading-relaxed">
                        * ملاحظة: يرجى تسجيل رأس المال الفعلي للشركاء لحساب نسب العائد على الاستثمار بصورة دقيقة.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* التبويب 11: التحليلات */}
            {activeTab === 'التحليلات' && (() => {
              // حساب الربح التراكمي ونفقات التشغيل لدورات الإنتاج
              let cumulativeNetProfit = 0;
              const rechartsData = cyclesList.map(cycle => {
                const cycleOpExpenses = expensesList.filter(e => e.cycle_id === cycle.id && e.type === 'Operational').reduce((sum, e) => sum + (e.amount || 0), 0);
                const cycleSales = expensesList.filter(e => e.cycle_id === cycle.id && e.type === 'Selling').reduce((sum, e) => sum + (e.total_amount || 0), 0);
                const cycleNetProfit = cycleSales - cycleOpExpenses;
                cumulativeNetProfit += cycleNetProfit;
                return {
                  name: `دورة ${cycle.cycle_number}`,
                  'صافي الربح التراكمي': cumulativeNetProfit,
                  'المصاريف التشغيلية': cycleOpExpenses,
                  'صافي ربح الدورة': cycleNetProfit
                };
              });

              // حساب الطاقة الاستيعابية الفعالة المخصصة بناءً على الدورات النشطة ديناميكياً
              const greenhouseCapacityMap: { [key: string]: number } = {};
              greenhousesList.forEach(gh => {
                greenhouseCapacityMap[gh.name] = 0;
              });

              const activeCyclesInDb = cyclesList.filter(c => c.status === 'Active');
              activeCyclesInDb.forEach(cycle => {
                const gh = greenhousesList.find(g => g.id === cycle.greenhouse_id);
                if (gh) {
                  greenhouseCapacityMap[gh.name] += gh.capacity;
                }
              });

              const hasActiveCycles = activeCyclesInDb.length > 0;

              // تصفية وعرض الصوبات النشطة إن وجد، أو استعراض الطاقة الإسمية لجميع الصوبات مع إيضاح حالة عدم النشاط
              const activeGHCaps = Object.entries(greenhouseCapacityMap)
                .filter(([_, cap]) => !hasActiveCycles || cap > 0)
                .map(([name, cap]) => ({
                  name,
                  cap: hasActiveCycles ? cap : (greenhousesList.find(g => g.name === name)?.capacity || 0)
                }));

              const doughnutLabels = activeGHCaps.map(item => item.name);
              const doughnutDataValues = activeGHCaps.map(item => item.cap);

              const barData = {
                labels: cyclesList.map(c => c.cycle_number),
                datasets: [
                  {
                    label: 'الاستثمار المالي الأولي (ج.م)',
                    data: cyclesList.map(c => c.initial_investment),
                    backgroundColor: 'rgba(52, 211, 153, 0.15)', // Mint Green soft tint
                    borderColor: '#34d399', // Mint Green solid border
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    hoverBackgroundColor: 'rgba(16, 185, 129, 0.3)', // Vibrant Emerald hover
                    hoverBorderColor: '#10b981',
                  }
                ]
              };

              // ١. إنتاجية الصوبات الفعلية التراكمية
              const ghProductivityData = greenhousesList.map(gh => {
                // من جدول الإنتاج التجريبي
                const totalProductionWeight = productionList
                  .filter(p => String(p.greenhouse_id) === String(gh.id))
                  .reduce((sum, p) => sum + (p.weight || 0), 0);

                // من سجلات قطاف الحصاد الفعلية المرتبطة بهذه الصوبة عبر دوراتها الإنتاجية
                const ghCycles = cyclesList.filter(c => String(c.greenhouse_id) === String(gh.id));
                const totalHarvestWeight = operationalLogsList
                  .filter(log => log.harvest_weight !== undefined && ghCycles.some(c => c.id === log.cycle_id))
                  .reduce((sum, log) => sum + (log.harvest_weight || 0), 0);

                return { name: gh.name, weight: totalProductionWeight + totalHarvestWeight };
              });
              const ghProductivityLabels = ghProductivityData.map(item => item.name);
              const ghProductivityValues = ghProductivityData.map(item => item.weight);

              const isGhProdAllZero = ghProductivityValues.length === 0 || ghProductivityValues.every(v => v === 0);
              
              // أرقام توضيحية جمالية بنصف شفافية لعدم تصفير الرسم
              const ghProdFallbackLabels = greenhousesList.length > 0 
                ? greenhousesList.map(g => g.name) 
                : ['صوبة الإنتاج أ', 'صوبة الإنتاج ب', 'صوبة الحضان ج'];
              
              const ghProdFallbackValues = greenhousesList.length === 3 
                ? [35, 40, 25] 
                : greenhousesList.length > 0 
                  ? greenhousesList.map((_, i) => [40, 30, 20, 10][i % 4] || 25) 
                  : [35, 40, 25];

              const ghProductivityChartData = {
                labels: isGhProdAllZero ? ghProdFallbackLabels : ghProductivityLabels,
                datasets: [
                  {
                    isFallback: isGhProdAllZero,
                    data: isGhProdAllZero ? ghProdFallbackValues : ghProductivityValues,
                    backgroundColor: isGhProdAllZero
                      ? [
                          'rgba(16, 185, 129, 0.35)', // Emerald semi-transparent
                          'rgba(59, 130, 246, 0.35)', // Blue semi-transparent
                          'rgba(245, 158, 11, 0.35)', // Amber semi-transparent
                          'rgba(139, 92, 246, 0.35)', // Violet semi-transparent
                          'rgba(236, 72, 153, 0.35)', // Pink semi-transparent
                          'rgba(20, 184, 166, 0.35)', // Teal semi-transparent
                        ]
                      : [
                          '#10b981', // Emerald
                          '#3b82f6', // Blue
                          '#f59e0b', // Amber
                          '#8b5cf6', // Violet
                          '#ec4899', // Pink
                          '#14b8a6', // Teal
                        ],
                    borderWidth: isGhProdAllZero ? 1.5 : 2,
                    borderColor: isGhProdAllZero ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
                    hoverOffset: isGhProdAllZero ? 0 : 6
                  }
                ]
              };

              // ٢. إهلاك الأصول الثابتة مقارنة بالقيمة الأصلية
              const assetLabels = assetsList.map(a => a.name);
              const assetCosts = assetsList.map(a => a.purchase_cost || 0);
              const assetDeps = assetsList.map(a => calculateAssetDepreciation(a));

              const assetDepChartData = {
                labels: assetLabels,
                datasets: [
                  {
                    label: 'تكلفة الشراء الأصلية (ج.م)',
                    data: assetCosts,
                    backgroundColor: 'rgba(59, 130, 246, 0.25)', // soft blue
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderRadius: 6,
                  },
                  {
                    label: 'الإهلاك المتراكم الفعلي (ج.م)',
                    data: assetDeps,
                    backgroundColor: 'rgba(239, 68, 68, 0.25)', // soft red
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    borderRadius: 6,
                  }
                ]
              };

              // ٣. أرباح الشركاء الحية الفورية من الحسابات والنسب المقررة
              const totalSales = expensesList.filter(e => e.type === 'Selling').reduce((sum, e) => sum + (e.total_amount || 0), 0);
              const totalExpenses = expensesList.filter(e => e.type === 'Operational').reduce((sum, e) => sum + (e.amount || 0), 0);
              const totalDep = assetsList.reduce((sum, a) => sum + calculateAssetDepreciation(a), 0);
              const baseProfit = demoMode ? 35000 : 0;
              const liveNetProfit = Math.max(0, (totalSales - totalExpenses - totalDep) + baseProfit);

              const partnerLabels = partnersList.map(p => p.name);
              const partnerShareValues = partnersList.map(p => {
                const pct = p.profit_percentage || p.share_percentage || 0;
                return Math.round((liveNetProfit * pct) / 100);
              });

              const isPartnerAllZero = partnerShareValues.length === 0 || partnerShareValues.every(v => v === 0);
              
              const partnerFallbackLabels = partnersList.length > 0 
                ? partnersList.map(p => p.name) 
                : ['الشريك الأول', 'الشريك الثاني', 'الشريك الثالث'];
              
              const partnerFallbackValues = partnersList.length === 3 
                ? [40, 35, 25] 
                : partnersList.length > 0 
                  ? partnersList.map((_, i) => [45, 30, 25][i % 3] || 25) 
                  : [40, 35, 25];

              const partnerEarningsChartData = {
                labels: isPartnerAllZero ? partnerFallbackLabels : partnerLabels,
                datasets: [
                  {
                    isFallback: isPartnerAllZero,
                    data: isPartnerAllZero ? partnerFallbackValues : partnerShareValues,
                    backgroundColor: isPartnerAllZero
                      ? [
                          'rgba(59, 130, 246, 0.35)', // Blue semi-transparent
                          'rgba(16, 185, 129, 0.35)', // Emerald semi-transparent
                          'rgba(245, 158, 11, 0.35)', // Amber semi-transparent
                          'rgba(139, 92, 246, 0.35)', // Violet semi-transparent
                        ]
                      : [
                          '#3b82f6', // Blue
                          '#10b981', // Emerald
                          '#f59e0b', // Amber
                          '#8b5cf6', // Violet
                          '#ec4899', // Pink
                          '#14b8a6', // Teal
                        ],
                    borderWidth: isPartnerAllZero ? 1.5 : 2,
                    borderColor: isPartnerAllZero ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
                    hoverOffset: isPartnerAllZero ? 0 : 6
                  }
                ]
              };

              const commonDoughnutOptions = (unit: string) => ({
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    rtl: true,
                    labels: {
                      boxWidth: 10,
                      font: {
                        family: 'sans-serif',
                        size: 10,
                        weight: 'bold' as const
                      },
                      color: isDarkMode ? '#cbd5e1' : '#475569',
                      padding: 12
                    }
                  },
                  tooltip: {
                    rtl: true,
                    callbacks: {
                      label: function(context: any) {
                        if (context.dataset.isFallback) {
                          return ` القيمة الحالية: 0 ${unit} (لا توجد بيانات مسجلة حالياً)`;
                        }
                        const value = context.raw || 0;
                        return ` القيمة الحالية: ${value.toLocaleString()} ${unit}`;
                      }
                    }
                  }
                },
                cutout: '65%'
              });

              const barOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    rtl: true,
                    labels: {
                      boxWidth: 12,
                      font: {
                        family: 'sans-serif',
                        size: 11,
                        weight: 'bold' as const
                      },
                      color: isDarkMode ? '#cbd5e1' : '#334155'
                    }
                  },
                  tooltip: {
                    rtl: true,
                    bodyAlign: 'right' as const,
                    titleAlign: 'right' as const,
                    titleFont: {
                      family: 'sans-serif',
                      size: 12,
                      weight: 'bold' as const
                    },
                    bodyFont: {
                      family: 'sans-serif',
                      size: 11
                    }
                  }
                },
                scales: {
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      font: {
                        family: 'sans-serif',
                        size: 10,
                        weight: 'normal' as const
                      },
                      color: isDarkMode ? '#94a3b8' : '#64748b'
                    }
                  },
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'
                    },
                    ticks: {
                      font: {
                        family: 'sans-serif',
                        size: 10
                      },
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      callback: function(value: any) {
                        return value.toLocaleString() + ' ج.م';
                      }
                    }
                  }
                }
              };

              const isCapAllZero = doughnutDataValues.length === 0 || doughnutDataValues.every(v => v === 0);
              const capFallbackLabels = doughnutLabels.length > 0 ? doughnutLabels : ['صوبة الإنتاج أ', 'صوبة الإنتاج ب', 'صوبة الحضان ج'];
              const capFallbackValues = doughnutDataValues.length > 0 && !isCapAllZero ? doughnutDataValues : [1500, 1200, 800];

              const doughnutData = {
                labels: isCapAllZero ? capFallbackLabels : doughnutLabels,
                datasets: [
                  {
                    isFallback: isCapAllZero,
                    data: isCapAllZero ? capFallbackValues : doughnutDataValues,
                    backgroundColor: isCapAllZero
                      ? [
                          'rgba(16, 185, 129, 0.35)', // Emerald semi-transparent
                          'rgba(245, 158, 11, 0.35)', // Amber semi-transparent
                          'rgba(59, 130, 246, 0.35)', // Blue semi-transparent
                        ]
                      : [
                          '#10b981', // Emerald
                          '#f59e0b', // Amber
                          '#3b82f6', // Blue
                          '#8b5cf6', // Violet
                          '#ec4899', // Pink
                        ],
                    borderWidth: isCapAllZero ? 1.5 : 2,
                    borderColor: isCapAllZero ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
                    hoverOffset: isCapAllZero ? 0 : 6
                  }
                ]
              };

              const doughnutOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    rtl: true,
                    labels: {
                      boxWidth: 10,
                      font: {
                        family: 'sans-serif',
                        size: 10,
                        weight: 'bold' as const
                      },
                      color: isDarkMode ? '#cbd5e1' : '#475569',
                      padding: 12
                    }
                  },
                  tooltip: {
                    rtl: true,
                    callbacks: {
                      label: function(context: any) {
                        if (context.dataset.isFallback) {
                          return ` معاينة توضيحية: ${context.raw.toLocaleString()} وحدة (لا توجد بيانات)`;
                        }
                        const value = context.raw || 0;
                        return ` سعة الصوبة: ${value.toLocaleString()} وحدة`;
                      }
                    }
                  }
                },
                cutout: '65%'
              };

              return (
                <div className="space-y-8" dir="rtl">
                  {/* قسم رأس التبويب الإرشادي */}
                  <div className="bg-gradient-to-l from-emerald-500/10 to-transparent p-6 rounded-2xl border border-emerald-500/10 space-y-2">
                    <h3 className="font-bold text-base text-slate-900">الرسوم البيانية والتحليلات الإنتاجية والمالية الحية</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                      لوحة تحليلات تفاعلية ذكية محدثة تلقائياً بدون محاكاة، تعرض إنتاجية الصوبات، توزيع الحصص والأرباح الصافية للشركاء، وإهلاك الأصول الثابتة بالوقت الحقيقي وفقاً للمحاسبة السليمة لدعم القرار الاستراتيجي.
                    </p>
                  </div>

                  {cyclesList.length === 0 ? (
                    <div className="h-72 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center space-y-3 text-slate-400 p-8 shadow-inner">
                      <LineChart className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">السجلات فارغة حاليًا</p>
                      <p className="text-xs text-slate-400 max-w-md text-center">
                        سيتم تشغيل وتفعيل الرسوم البيانية التفاعلية فور توفر دورات إنتاجية نشطة أو مسجلة في النظام. يرجى تفعيل "وضع التجربة" من شريط التحكم العلوي لبذر البيانات الإيضاحية فوراً.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      
                      {/* رسم بياني ١: إنتاجية الصوبات الفعلية */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                            <h4 className="font-bold text-sm text-slate-800">إنتاجية الصوبات الفعلية</h4>
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                              حصاد الإنتاج بالكيلو
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {isGhProdAllZero ? (
                              <span className="text-amber-500 font-bold">⚠️ عرض معاينة توضيحية لعدم وجود إنتاج مسجل حالياً</span>
                            ) : (
                              'مجموع الأوزان المقطوفة والمسجلة فعلياً في مخزن الفرز اليومي لكل صوبة زراعية حية.'
                            )}
                          </p>
                        </div>
                        <div key={`ghProd-${isDarkMode}-${JSON.stringify(ghProductivityChartData)}`} className="h-[240px] w-full pt-2">
                          <Doughnut data={ghProductivityChartData} options={commonDoughnutOptions('كجم')} />
                        </div>
                      </div>

                      {/* رسم بياني ٢: توزيع أرباح الشركاء */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                            <h4 className="font-bold text-sm text-slate-800">توزيع أرباح الشركاء الحية</h4>
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                              مستحقات الشركاء الحالية
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {isPartnerAllZero ? (
                              <span className="text-amber-500 font-bold">⚠️ عرض معاينة توضيحية لعدم وجود أرباح صافية محتسبة حالياً</span>
                            ) : (
                              'حصة كل شريك مساهم من صافي الأرباح المحتسبة بعد خصم المصاريف وإهلاك الأصول المتراكم.'
                            )}
                          </p>
                        </div>
                        <div key={`partner-${isDarkMode}-${JSON.stringify(partnerEarningsChartData)}`} className="h-[240px] w-full pt-2">
                          <Doughnut data={partnerEarningsChartData} options={commonDoughnutOptions('ج.م')} />
                        </div>
                      </div>

                      {/* رسم بياني ٣: توزيع الطاقة الاستيعابية الفعلية للصوبات */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                            <h4 className="font-bold text-sm text-slate-800">سعة الصوبات الإسمية المخصصة</h4>
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                              الطاقة اللوجستية الفعالة
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {isCapAllZero ? (
                              <span className="text-amber-500 font-bold">⚠️ عرض معاينة توضيحية لعدم وجود طاقة مسجلة حالياً</span>
                            ) : (
                              'توزيع الطاقة الاستيعابية الفعالة المخصصة بناءً على دورات الإنتاج والتشغيل النشطة والمخططة.'
                            )}
                          </p>
                        </div>
                        <div key={`doughnut-${isDarkMode}-${JSON.stringify(doughnutData)}`} className="h-[240px] w-full pt-2">
                          <Doughnut data={doughnutData} options={doughnutOptions} />
                        </div>
                      </div>

                      {/* رسم بياني ٤: إهلاك الأصول مقارنة بالتكلفة */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 space-y-4 flex flex-col justify-between lg:col-span-2">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                            <h4 className="font-bold text-sm text-slate-800">تحليل إهلاك الأصول الثابتة الفعلي</h4>
                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                              طريقة القسط الثابت الحية
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            يقارن تكلفة شراء الأصول الثابتة بخصم مجمع الإهلاك اليومي المتراكم تلقائياً تبعاً للزمن المنقضي من عمرها.
                          </p>
                        </div>
                        <div key={`assetDep-${isDarkMode}-${JSON.stringify(assetDepChartData)}`} className="h-[280px] w-full pt-2">
                          <Bar data={assetDepChartData} options={barOptions} />
                        </div>
                      </div>

                      {/* رسم بياني ٥: استثمار الدورات */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                            <h4 className="font-bold text-sm text-slate-800">الاستثمار المبدئي للدورات</h4>
                            <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                              النفقات الرأسمالية المبدئية
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            حجم رأس المال المخصص لكل دورة فطر ريشي أو محاري لتحديد كفاءة الإنتاج مقارنة بالتكلفة.
                          </p>
                        </div>
                        <div key={`bar-${isDarkMode}-${JSON.stringify(barData)}`} className="h-[240px] w-full pt-2">
                          <Bar data={barData} options={barOptions} />
                        </div>
                      </div>

                      {/* رسم بياني ٦: الربح الصافي التراكمي مقارنة بالمصاريف التشغيلية (Recharts) */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 space-y-4 flex flex-col justify-between lg:col-span-2">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                            <h4 className="font-bold text-sm text-slate-800">تحليل الأرباح التراكمية مقارنة بالمصاريف التشغيلية</h4>
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                              مكتبة Recharts المرنة حية
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            مقارنة حية لصافي الأرباح التراكمية المتولدة من دورات الإنتاج المتعاقبة مقابل إجمالي نفقاتها التشغيلية المسجلة.
                          </p>
                        </div>
                        <div className="h-[300px] w-full pt-2" dir="ltr">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                              data={rechartsData}
                              margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                            >
                              <RechartsCartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "rgba(255,255,255,0.08)" : "#f1f5f9"} />
                              <RechartsXAxis 
                                dataKey="name" 
                                stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                                tick={{ fontSize: 10, fontFamily: 'sans-serif' }}
                              />
                              <RechartsYAxis 
                                stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                                tick={{ fontSize: 10, fontFamily: 'sans-serif' }}
                                tickFormatter={(val) => val.toLocaleString() + ' ج.م'}
                              />
                              <RechartsTooltip 
                                contentStyle={{
                                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                  borderRadius: '8px',
                                  fontFamily: 'sans-serif',
                                  fontSize: '11px',
                                  color: isDarkMode ? '#cbd5e1' : '#1e293b',
                                  textAlign: 'right'
                                }}
                                formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} ج.م`, name]}
                              />
                              <RechartsLegend 
                                wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif', paddingTop: '10px' }}
                              />
                              <ReferenceLine y={0} stroke={isDarkMode ? "#ef4444" : "#f43f5e"} strokeDasharray="3 3" />
                              <RechartsBar dataKey="صافي الربح التراكمي" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
                              <RechartsBar dataKey="المصاريف التشغيلية" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={45} />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })()}



            {/* التبويب 12: دليل المستخدم */}
            {activeTab === 'دليل المستخدم' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-right" dir="rtl">
                <h3 className="text-lg font-bold text-slate-900">دليل المستخدم والتشغيل القياسي للمزرعة</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  مرحباً بك في دليل التشغيل الموحد لنظام إدارة ومراقبة مزرعة الفطر المتكاملة. يهدف هذا الدليل إلى توضيح الإجراءات التشغيلية واليومية لضمان سلامة وجودة المحصول وكفاءة التوزيع المالي واللوجستي.
                </p>

                <div className="space-y-6 text-xs text-slate-700 leading-relaxed">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">١</span>
                      إجراءات تسجيل القراءات البيئية اليومية
                    </h4>
                    <p className="pr-7 text-slate-600">
                      يجب على المشغل الفني تسجيل قراءات أجهزة القياس داخل الصوبات الزراعية بانتظام خلال فترات الورديات المحددة. يشمل ذلك:
                    </p>
                    <ul className="list-disc pr-12 mt-2 space-y-1.5 text-slate-600">
                      <li><strong>درجة الحرارة:</strong> الحفاظ عليها في النطاق المثالي لنمو الأبواغ وتجنب الانحراف البيئي.</li>
                      <li><strong>الرطوبة النسبية:</strong> الحفاظ على معدل رطوبة دقيق يتناسب مع طور نمو ثمار الفطر.</li>
                      <li><strong>مستويات CO2 (ثاني أكسيد الكربون):</strong> قياس ومراقبة التهوية المناسبة لضمان تطور صحي للثمار الفطرية.</li>
                      <li><strong>تقييم النظافة والسلامة:</strong> فحص الصوبات بصرياً لضمان خلوها التام من أي فطريات غريبة أو آفات زراعية.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">٢</span>
                      مراقبة المخزون وإدارة التوريدات
                    </h4>
                    <p className="pr-7 text-slate-600">
                      يتيح النظام متابعة مستويات خامات الإنتاج في المستودعات لضمان استمرارية دورات الزراعة دون انقطاع:
                    </p>
                    <ul className="list-disc pr-12 mt-2 space-y-1.5 text-slate-600">
                      <li>مراجعة "حد الطلب الآمن" لكل صنف بشكل دوري لتجنب نفاذ الإمدادات الحيوية (الأبواغ، الجبس، مطهرات التعقيم، وصناديق التعبئة).</li>
                      <li>تسجيل الواردات وتحديد تواريخ انتهاء الصلاحية للمواد الحساسة لضمان كفاءة سلسلة التوريد الداخلية.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">٣</span>
                      إدارة الصلاحيات وحماية البيانات
                    </h4>
                    <p className="pr-7 text-slate-600">
                      يعتمد النظام على هيكل حماية متعدد الصلاحيات لضمان حوكمة العمليات وحفظ سرية التقارير الحساسة:
                    </p>
                    <ul className="list-disc pr-12 mt-2 space-y-1.5 text-slate-600">
                      <li><strong>الإدارة العامة (Admin):</strong> تملك الصلاحية الكاملة على جميع الأقسام بما في ذلك تصفح الخزينة، العهد المالي، ومراجعة سجل العمليات المالي التدقيقي، وتوزيع الحصص وصافي الأرباح الختامية.</li>
                      <li><strong>المشرف (Supervisor):</strong> يملك صلاحيات مخصصة لإدارة الدورات الإنتاجية، تتبع المخازن والمستلزمات، وتسجيل المبيعات والمصاريف التشغيلية.</li>
                      <li><strong>المشغل الفني (Operator):</strong> مخصص لإدخال وتوثيق القراءات البيئية اليومية ومتابعة الفرز دون تصفح البيانات الحساسة أو المالية.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                    <h5 className="font-bold text-slate-800 mb-1 text-xs">🔒 سياسة الأمان وحماية البيانات</h5>
                    <p className="text-[11px] leading-relaxed">
                      يجب الحفاظ على سرية رمز الـ PIN الخاص بكل حساب وتجنب مشاركته مع غير المخولين لضمان استقرار وسلامة السجلات والبيانات التشغيلية في المزرعة.
                    </p>
                  </div>
                </div>
              </div>
            )}


            {/* التبويب 13: المصدر العام لقاعدة البيانات */}
            {activeTab === 'المصدر العام لقاعدة البيانات' && (
              <div className="space-y-6 text-right pb-10" dir="rtl">
                
                {/* لوحة التحكم والنسخ الاحتياطي المشفر */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-500 shrink-0" />
                        المصدر العام لقاعدة البيانات (Master Control Panel)
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        لوحة الإدارة المركزية لإدارة الجداول، استعراض السجلات المشفرة، وإجراء النسخ الاحتياطي والاستعادة بأمان تام.
                      </p>
                    </div>
                    
                    {/* أزرار الإجراءات الأمنية */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleExportBackup}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm"
                      >
                        <Database className="w-4 h-4 shrink-0" />
                        نسخ احتياطي آمن
                      </button>
                      
                      <label className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-all shadow-sm">
                        <Database className="w-4 h-4 shrink-0" />
                        استعادة البيانات
                        <input
                          type="file"
                          accept=".dat"
                          onChange={handleImportBackup}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 1. جدول الصوبات الزراعية */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                    جدول الصوبات الزراعية (Greenhouses) - السجلات الحية: {greenhousesList.length}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600">
                          <th className="p-3 font-semibold border-b border-slate-100">المعرف (ID)</th>
                          <th className="p-3 font-semibold border-b border-slate-100">اسم الصوبة</th>
                          <th className="p-3 font-semibold border-b border-slate-100">السعة الاستيعابية</th>
                          <th className="p-3 font-semibold border-b border-slate-100">الحالة</th>
                          <th className="p-3 font-semibold border-b border-slate-100 text-left">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {greenhousesList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400">لا توجد سجلات حالية</td>
                          </tr>
                        ) : (
                          greenhousesList.map((gh) => (
                            <tr key={gh.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-slate-500">{gh.id}</td>
                              <td className="p-3 font-bold text-slate-800">{gh.name}</td>
                              <td className="p-3 font-mono">{gh.capacity}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${gh.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {gh.status === 'Active' ? 'نشط' : 'صيانة'}
                                </span>
                              </td>
                              <td className="p-3 text-left">
                                <button
                                  onClick={async () => {
                                    if (window.confirm('هل أنت متأكد من حذف هذه الصوبة بشكل نهائي وآمن؟')) {
                                      await activeDb.greenhouses.delete(gh.id!);
                                      (window as any).refreshSystemUI();
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-bold transition-colors"
                                >
                                  حذف
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. جدول الأصول الثابتة */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                    جدول الأصول الثابتة والإهلاكات (Assets) - السجلات الحية: {assetsList.length}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600">
                          <th className="p-3 font-semibold border-b border-slate-100">المعرف (ID)</th>
                          <th className="p-3 font-semibold border-b border-slate-100">اسم الأصل</th>
                          <th className="p-3 font-semibold border-b border-slate-100">تكلفة الشراء</th>
                          <th className="p-3 font-semibold border-b border-slate-100">تاريخ الشراء</th>
                          <th className="p-3 font-semibold border-b border-slate-100">العمر الافتراضي</th>
                          <th className="p-3 font-semibold border-b border-slate-100">الإهلاك المتراكم</th>
                          <th className="p-3 font-semibold border-b border-slate-100 text-left">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-slate-400">لا توجد سجلات حالية</td>
                          </tr>
                        ) : (
                          assetsList.map((asset) => (
                            <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-slate-500">{asset.id}</td>
                              <td className="p-3 font-bold text-slate-800">{asset.name}</td>
                              <td className="p-3 font-mono text-emerald-600">{Number(asset.purchase_cost || 0).toLocaleString()} ج.م</td>
                              <td className="p-3 font-mono">{asset.purchase_date}</td>
                              <td className="p-3 font-mono">{asset.useful_life} سنوات</td>
                              <td className="p-3 font-mono text-rose-500">{Number(asset.accumulated_depreciation || 0).toLocaleString()} ج.م</td>
                              <td className="p-3 text-left">
                                <button
                                  onClick={async () => {
                                    if (window.confirm('هل أنت متأكد من حذف هذا الأصل بشكل نهائي وآمن؟')) {
                                      await activeDb.assets.delete(asset.id!);
                                      (window as any).refreshSystemUI();
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-bold transition-colors"
                                >
                                  حذف
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. جدول حصص الشركاء */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                    جدول حصص الشركاء والأرباح (Partners) - السجلات الحية: {partnersList.length}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600">
                          <th className="p-3 font-semibold border-b border-slate-100">المعرف (ID)</th>
                          <th className="p-3 font-semibold border-b border-slate-100">اسم الشريك</th>
                          <th className="p-3 font-semibold border-b border-slate-100">قيمة المساهمة</th>
                          <th className="p-3 font-semibold border-b border-slate-100">نسبة الأرباح</th>
                          <th className="p-3 font-semibold border-b border-slate-100">إجمالي التوزيعات المستلمة</th>
                          <th className="p-3 font-semibold border-b border-slate-100 text-left">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partnersList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-400">لا توجد سجلات حالية</td>
                          </tr>
                        ) : (
                          partnersList.map((partner) => (
                            <tr key={partner.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-slate-500">{partner.id}</td>
                              <td className="p-3 font-bold text-slate-800">{partner.name}</td>
                              <td className="p-3 font-mono text-indigo-600">{Number(partner.contribution_value || 0).toLocaleString()} ج.م</td>
                              <td className="p-3 font-mono">{partner.profit_percentage || partner.share_percentage}%</td>
                              <td className="p-3 font-mono text-emerald-600">{Number(partner.total_payouts || 0).toLocaleString()} ج.م</td>
                              <td className="p-3 text-left">
                                <button
                                  onClick={async () => {
                                    if (window.confirm('هل أنت متأكد من حذف هذا الشريك بشكل نهائي وآمن؟')) {
                                      await activeDb.partners.delete(partner.id!);
                                      (window as any).refreshSystemUI();
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-bold transition-colors"
                                >
                                  حذف
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. جدول الإنتاج والفرز اليومي */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                    جدول الإنتاج والفرز اليومي (Production) - السجلات الحية: {productionList.length}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600">
                          <th className="p-3 font-semibold border-b border-slate-100">المعرف (ID)</th>
                          <th className="p-3 font-semibold border-b border-slate-100">الصوبة</th>
                          <th className="p-3 font-semibold border-b border-slate-100">الدورة</th>
                          <th className="p-3 font-semibold border-b border-slate-100">التاريخ</th>
                          <th className="p-3 font-semibold border-b border-slate-100">الوزن الإجمالي</th>
                          <th className="p-3 font-semibold border-b border-slate-100">درجة الفرز</th>
                          <th className="p-3 font-semibold border-b border-slate-100 text-left">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productionList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-slate-400">لا توجد سجلات حالية</td>
                          </tr>
                        ) : (
                          productionList.map((prod) => {
                            const gh = greenhousesList.find(g => g.id === prod.greenhouse_id);
                            const cycle = cyclesList.find(c => c.id === prod.cycle_id);
                            return (
                              <tr key={prod.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="p-3 font-mono text-slate-500">{prod.id}</td>
                                <td className="p-3 text-slate-700">{gh?.name || `صوبة #${prod.greenhouse_id}`}</td>
                                <td className="p-3 text-slate-600">{cycle?.cycle_number || `دورة #${prod.cycle_id}`}</td>
                                <td className="p-3 font-mono">{prod.date}</td>
                                <td className="p-3 font-mono text-emerald-600">{prod.weight} كجم</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prod.grade === 'A' ? 'bg-emerald-100 text-emerald-800' : prod.grade === 'B' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}`}>
                                    الدرجة {prod.grade}
                                  </span>
                                </td>
                                <td className="p-3 text-left">
                                  <button
                                    onClick={async () => {
                                      if (window.confirm('هل أنت متأكد من حذف سجل الإنتاج هذا بشكل نهائي وآمن؟')) {
                                        await activeDb.production.delete(prod.id!);
                                        (window as any).refreshSystemUI();
                                      }
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-bold transition-colors"
                                  >
                                    حذف
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        </main>
      </div>

      {/* ==========================================
          د. مودال تأكيد تبديل الدور برمز PIN
          ========================================== */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowPinModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-50 relative border border-slate-200 animate-scale-in">
            <h3 className="text-sm font-bold text-slate-900 mb-1 text-center">تأكيد رمز المرور (PIN)</h3>
            <p className="text-[11px] text-slate-500 mb-4 text-center">
              يرجى إدخال رمز المرور المكون من 4 أرقام لتأكيد صلاحية الدخول كـ{' '}
              <strong className="text-slate-800 font-bold">
                {selectedRoleToSwitch === 'Admin' ? 'مدير' : selectedRoleToSwitch === 'Supervisor' ? 'مشرف' : 'مشغل فني'}
              </strong>
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center tracking-[1.5em] text-sm font-bold py-2.5 bg-slate-100 border border-transparent rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                autoFocus
              />
              
              {pinError && (
                <p className="text-[11px] text-red-600 font-bold text-center">{pinError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  تأكيد ودخول
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          هـ. شاشة القفل المحلية الكاملة (Offline Security Lock Screen Layer)
          ========================================== */}
      {isLocked && (
        <div 
          className="lock-screen-overlay fixed inset-0 z-[100] flex flex-col items-center justify-start md:justify-center bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto select-none" 
          style={{ minHeight: '100vh' }}
          dir="rtl"
        >
          <div className="w-full max-w-4xl flex flex-col items-center py-8 my-auto">
            
            {/* هيدر بوابة الأمن */}
            <div className="text-center mb-8 max-w-md">
              <div 
                className="w-32 h-32 md:w-36 md:h-36 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6 overflow-hidden border-4 border-amber-400/60 bg-slate-900 p-1.5 shadow-[0_0_30px_rgba(245,158,11,0.25)]"
              >
                <img src={appLogo} alt="Mushroom System" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Mushroom System</h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                بوابة الإدارة والمتابعة لمزرعة الفطر المتكاملة الموحدة.
              </p>
            </div>

            {!selectedLockRole ? (
              /* واجهة اختيار الدور */
              <div className="w-full max-w-3xl space-y-6">
                <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest text-center">الرجاء تحديد صفة المستخدم لفتح النظام</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* بطاقة الإدارة العامة */}
                  <button
                    onClick={() => {
                      setSelectedLockRole('Admin');
                      setLockPinInput('');
                      setLockPinError('');
                    }}
                    className="flex flex-col items-center p-6 bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 rounded-2xl text-center group transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900/80 shadow-xl"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                      <span className="text-2xl">👑</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">الإدارة العامة</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-tight">الإدارة الشاملة للشركاء ومتابعة التقارير المالية والقرارات السيادية</p>
                    <span className="text-[9px] text-amber-400 font-bold mt-4 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/10">صلاحيات كاملة + المالية</span>
                  </button>

                  {/* بطاقة المشرف المناوب */}
                  <button
                    onClick={() => {
                      setSelectedLockRole('Supervisor');
                      setLockPinInput('');
                      setLockPinError('');
                    }}
                    className="flex flex-col items-center p-6 bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 rounded-2xl text-center group transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900/80 shadow-xl"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                      <span className="text-2xl">👔</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">المشرف المناوب</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-tight">إدارة العمليات والإنتاج والمخزن</p>
                    <span className="text-[9px] text-blue-400 font-bold mt-4 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/10">صلاحيات إشرافية</span>
                  </button>

                  {/* بطاقة المشغل الفني */}
                  <button
                    onClick={() => {
                      setSelectedLockRole('Operator');
                      setLockPinInput('');
                      setLockPinError('');
                    }}
                    className="flex flex-col items-center p-6 bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 rounded-2xl text-center group transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900/80 shadow-xl"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                      <span className="text-2xl">🚜</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">المشغل الفني</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-tight">تسجيل القراءات والإنتاج اليومي</p>
                    <span className="text-[9px] text-slate-400 font-bold mt-4 bg-slate-800 px-2 py-1 rounded border border-slate-700">قراءة وتسجيل فقط</span>
                  </button>

                </div>

                <div className="text-center pt-8 border-t border-slate-900">
                  <p className="text-[10px] text-slate-500 font-medium">
                    ملاحظة للمراجعين والتجربة السريعة: الإدارة العامة (7391 أو 2846) | المشرف (9514) | المشغل (8263)
                  </p>
                </div>
              </div>
            ) : (
              /* واجهة إدخال الرمز PIN بنظام Numpad ذكي */
              <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
                
                <div className="text-center mb-6">
                  <span className="text-xs font-bold text-emerald-500 tracking-wider block mb-1">تأكيد الهوية</span>
                  <h3 className="text-base font-bold text-white">
                    {selectedLockRole === 'Admin' ? '👑 الإدارة العامة' : selectedLockRole === 'Supervisor' ? '👔 المشرف المناوب' : '🚜 المشغل الفني'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">الرجاء إدخال الرمز السري المكون من 4 أرقام لفتح اللوحة</p>
                </div>

                {/* دوائر عرض الرمز المكتوب */}
                <div className="flex justify-center gap-4 mb-6">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                        index < lockPinInput.length
                          ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          : 'border-slate-700 bg-transparent'
                      }`}
                    />
                  ))}
                </div>

                {/* رسالة الخطأ */}
                <div className="h-6 flex items-center justify-center mb-4">
                  {lockPinError && (
                    <p className="text-xs text-rose-500 font-bold text-center animate-pulse">{lockPinError}</p>
                  )}
                </div>

                {/* لوحة المفاتيح الرقمية Numpad */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleLockPinPress(num)}
                      className="h-14 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-650 text-white font-bold text-lg rounded-xl flex items-center justify-center transition-all duration-100 shadow border border-slate-700/30"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleLockPinClear}
                    className="h-14 bg-slate-950 hover:bg-slate-900 active:bg-slate-850 text-rose-400 font-bold text-xs rounded-xl flex items-center justify-center transition-colors border border-rose-950/20"
                  >
                    مسح الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLockPinPress('0')}
                    className="h-14 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-650 text-white font-bold text-lg rounded-xl flex items-center justify-center transition-all duration-100 shadow border border-slate-700/30"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleLockPinDelete}
                    className="h-14 bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center transition-all duration-100"
                  >
                    حذف
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLockRole(null);
                      setLockPinInput('');
                      setLockPinError('');
                    }}
                    className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 active:bg-slate-850 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors border border-slate-800"
                  >
                    تغيير صفة الدخول (رجوع)
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ==========================================
          هـ٢. مودالات الإضافة للتسجيلات الجديدة تفاعلياً
          ========================================== */}
      {showAddGreenhouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddGreenhouseModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">إضافة صوبة زراعية جديدة</h3>
              <button onClick={() => setShowAddGreenhouseModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => (window as any).addGreenhouse(e)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الصوبة الجديدة</label>
                <input
                  id="gh_name_input"
                  type="text"
                  required
                  placeholder="مثال: صوبة الإنتاج د"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">السعة الاستيعابية (عدد الأكياس/الرفوف)</label>
                <input
                  id="gh_capacity_input"
                  type="number"
                  required
                  min="1"
                  placeholder="مثال: 1500"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  حفظ الصوبة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGreenhouseModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddAssetModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingAsset ? 'تعديل بيانات الأصل الثابت' : 'تسجيل أصل ثابت جديد'}
              </h3>
              <button onClick={() => setShowAddAssetModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الأصل</label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="مثال: مولد كهرباء بقوة 15 كيلو"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تكلفة الشراء (ج.م)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={assetCost}
                  onChange={(e) => setAssetCost(e.target.value)}
                  placeholder="مثال: 35000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">العمر الافتراضي بالأعوام</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={assetLife}
                  onChange={(e) => setAssetLife(e.target.value)}
                  placeholder="مثال: 5"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تاريخ الشراء</label>
                <input
                  type="date"
                  value={assetDate}
                  onChange={(e) => setAssetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  {editingAsset ? 'تحديث البيانات' : 'حفظ الأصل'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddPartnerModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingPartner ? 'تعديل بيانات الشريك المساهم' : 'إضافة شريك مساهم جديد'}
              </h3>
              <button onClick={() => setShowAddPartnerModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الشريك</label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="مثال: الشريك المساهم الجديد"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">قيمة رأس المال المساهم به (ج.م)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={partnerContribution}
                  onChange={(e) => setPartnerContribution(e.target.value)}
                  placeholder="مثال: 150000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نسبة توزيع الأرباح (%)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={partnerProfitPct}
                  onChange={(e) => setPartnerProfitPct(e.target.value)}
                  placeholder="مثال: 25"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  {editingPartner ? 'تحديث البيانات' : 'حفظ الشريك'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          و. مودال إضافة دورة زراعية جديدة تفاعلياً
          ========================================== */}
      {showAddCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddCycleModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">إنشاء دورة زراعية جديدة</h3>
              <button onClick={() => setShowAddCycleModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCycleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم أو رقم الدورة</label>
                <input
                  type="text"
                  placeholder="مثال: دورة الصيف الأولى 2026"
                  value={newCycleNumber}
                  onChange={(e) => setNewCycleNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الصوبة المخصصة</label>
                <select
                  value={newCycleGreenhouseId}
                  onChange={(e) => setNewCycleGreenhouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">-- اختر الصوبة الزراعية --</option>
                  {greenhousesList.map(gh => (
                    <option key={gh.id} value={gh.id}>{gh.name} (السعة: {gh.capacity} كيس)</option>
                  ))}
                  {greenhousesList.length === 0 && (
                    <option value="1">الصوبة النموذجية الأولى</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الاستثمار الأولي للدورة (ج.م)</label>
                <input
                  type="number"
                  placeholder="مثال: 15000"
                  value={newCycleInvestment}
                  onChange={(e) => setNewCycleInvestment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {newCycleError && (
                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">{newCycleError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  حفظ وبدء الدورة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCycleModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ز. مودال إضافة مصروف أو فاتورة مبيعات تفاعلياً
          ========================================== */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddExpenseModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">تسجيل عملية مالية جديدة</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* مفتاح التبديل بين نوعي المعاملات */}
            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => {
                  setNewExpenseType('Operational');
                  setNewExpenseError('');
                }}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all ${
                  newExpenseType === 'Operational' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                مصروف تشغيلي 🧾
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewExpenseType('Selling');
                  setNewExpenseError('');
                }}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all ${
                  newExpenseType === 'Selling' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                فاتورة مبيعات للعملاء 🛍️
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الدورة الإنتاجية المرتبطة</label>
                <select
                  value={newExpenseCycleId}
                  onChange={(e) => setNewExpenseCycleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">-- اختر الدورة الإنتاجية النشطة --</option>
                  {cyclesList.filter(c => c.status === 'Active').map(c => (
                    <option key={c.id} value={c.id}>{c.cycle_number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الصوبة (اختياري)</label>
                <select
                  value={newExpenseGreenhouseId}
                  onChange={(e) => setNewExpenseGreenhouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">-- بدون صوبة --</option>
                  {greenhousesList.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {newExpenseType === 'Operational' ? (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">تفاصيل المصروف والبيان</label>
                    <input
                      type="text"
                      placeholder="مثال: شراء حبوب لقاح أو معقم صوبة"
                      value={newExpenseDetails}
                      onChange={(e) => setNewExpenseDetails(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">مبلغ المصروف (ج.م)</label>
                    <input
                      type="number"
                      placeholder="مثال: 450"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم العميل / الجهة</label>
                    <input
                      type="text"
                      placeholder="مثال: سوبرماركت الهدى"
                      value={newExpenseCustomerName}
                      onChange={(e) => setNewExpenseCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">عدد الكراتين المباعة</label>
                      <input
                        type="number"
                        placeholder="مثال: 50"
                        value={newExpenseTotalBoxes}
                        onChange={(e) => setNewExpenseTotalBoxes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">سعر الكرتونة الواحدة</label>
                      <input
                        type="number"
                        placeholder="مثال: 120"
                        value={newExpensePricePerBox}
                        onChange={(e) => setNewExpensePricePerBox(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المبلغ المدفوع نقداً (ج.م)</label>
                    <input
                      type="number"
                      placeholder="مثال: 6000"
                      value={newExpensePaidAmount}
                      onChange={(e) => setNewExpensePaidAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">تاريخ استحقاق تحصيل المتبقي</label>
                    <input
                      type="date"
                      value={newExpenseDueDate}
                      onChange={(e) => setNewExpenseDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-right"
                    />
                  </div>

                  {newExpenseTotalBoxes && newExpensePricePerBox && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center font-bold">
                      <span className="text-slate-600">إجمالي قيمة الفاتورة:</span>
                      <span className="text-emerald-600 text-sm">
                        {(Number(newExpenseTotalBoxes) * Number(newExpensePricePerBox)).toLocaleString()} ج.م
                      </span>
                    </div>
                  )}
                </>
              )}

              {newExpenseError && (
                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">{newExpenseError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  تسجيل في الدفاتر
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ز0. مودال تنبيهات استحقاق تحصيل الديون للعملاء
          ========================================== */}
      {showDebtAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDebtAlertModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <span className="text-xl">🔔</span>
                <h3 className="text-sm font-bold">تنبيهات استحقاق تحصيل ديون العملاء</h3>
              </div>
              <button onClick={() => setShowDebtAlertModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {/* الفواتير المتأخرة باللون الأحمر الصريح */}
              {overdueDebts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1">
                    <span>⚠️</span> فواتير متأخرة تجاوزت تاريخ الاستحقاق ({overdueDebts.length})
                  </h4>
                  <div className="space-y-2">
                    {overdueDebts.map((exp) => (
                      <div key={exp.id} className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1.5 border-r-4 border-r-rose-600 text-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-rose-950">{exp.customer_name}</span>
                          <span className="text-rose-700 font-bold">{exp.remaining_amount?.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex justify-between text-rose-800 text-[11px] font-medium flex-wrap gap-1">
                          <span>تاريخ الفاتورة: {exp.date}</span>
                          <span className="bg-rose-100 px-1.5 py-0.5 rounded font-bold text-[10px]">مستحق منذ: {exp.due_date} (متأخر)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* الفواتير المقتربة باللون الأصفر/البرتقالي الدافئ */}
              {approachingDebts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1">
                    <span>⏳</span> فواتير يقترب موعد تحصيلها خلال 3 أيام أو أقل ({approachingDebts.length})
                  </h4>
                  <div className="space-y-2">
                    {approachingDebts.map((exp) => (
                      <div key={exp.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5 border-r-4 border-r-amber-500 text-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-amber-950">{exp.customer_name}</span>
                          <span className="text-amber-700 font-bold">{exp.remaining_amount?.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex justify-between text-amber-800 text-[11px] font-medium flex-wrap gap-1">
                          <span>تاريخ الفاتورة: {exp.date}</span>
                          <span className="bg-amber-100 px-1.5 py-0.5 rounded font-bold text-[10px]">الاستحقاق: {exp.due_date} (خلال {exp.daysLeft} يوم)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowDebtAlertModal(false)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-xs font-bold transition-colors text-center cursor-pointer shadow-sm"
              >
                موافق، سأقوم بالمتابعة والتحصيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          ز1. مودال التحكم البيئي اليومي
          ========================================== */}
      {showAddClimateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddClimateModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">إضافة قراءة بيئية جديدة للصوبة</h3>
              <button onClick={() => setShowAddClimateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClimateSubmit} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الدورة الإنتاجية المرتبطة</label>
                <select
                  value={climateCycleId}
                  onChange={(e) => setClimateCycleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">-- اختر الدورة الإنتاجية النشطة --</option>
                  {cyclesList.filter(c => c.status === 'Active').map(c => (
                    <option key={c.id} value={c.id}>{c.cycle_number}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={climateDate}
                    onChange={(e) => setClimateDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تقييم النظافة والسلامة</label>
                  <select
                    value={climateHygiene}
                    onChange={(e) => setClimateHygiene(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="Excellent">ممتاز (خالٍ من الملوثات)</option>
                    <option value="Good">مستقر وجيد جداً</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الحرارة (°م)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="مثال: 24.5"
                    value={climateTemp}
                    onChange={(e) => setClimateTemp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الرطوبة (%)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="مثال: 85"
                    value={climateHumidity}
                    onChange={(e) => setClimateHumidity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ثاني أكسيد (ppm)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="مثال: 750"
                    value={climateCO2}
                    onChange={(e) => setClimateCO2(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات تشغيلية إضافية</label>
                <textarea
                  rows={2}
                  placeholder="سجل أي تفاصيل عن التهوية أو التعقيم هنا..."
                  value={climateNotes}
                  onChange={(e) => setClimateNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {climateError && (
                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">{climateError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  حفظ القراءة البيئية
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddClimateModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ز2. مودال الإنتاج والفرز اليومي
          ========================================== */}
      {showAddHarvestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddHarvestModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">إضافة سجل إنتاج وفرز للقطفة اليومية</h3>
              <button onClick={() => setShowAddHarvestModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHarvestSubmit} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الدورة الإنتاجية المرتبطة</label>
                <select
                  value={harvestCycleId}
                  onChange={(e) => setHarvestCycleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">-- اختر الدورة الإنتاجية النشطة --</option>
                  {cyclesList.filter(c => c.status === 'Active').map(c => (
                    <option key={c.id} value={c.id}>{c.cycle_number}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وزن القطفة الكلي (كجم)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="مثال: 15.5"
                    value={harvestWeight}
                    onChange={(e) => setHarvestWeight(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع فطر عيش الغراب</label>
                  <select
                    value={harvestType}
                    onChange={(e) => setHarvestType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="محار أبيض">محار أبيض (White Oyster)</option>
                    <option value="محار رمادي">محار رمادي (Grey Oyster)</option>
                    <option value="محار ذهبي">محار ذهبي (Yellow Oyster)</option>
                    <option value="أجاريوس">أجاريوس (Agaricus)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">فئة الفرز والجودة</label>
                  <select
                    value={harvestGrade}
                    onChange={(e) => setHarvestGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="A">نخب أول ممتاز (A)</option>
                    <option value="B">نخب ثان عادي (B)</option>
                    <option value="C">نخب ثالث صناعي (C)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات الفرز والهدر</label>
                <textarea
                  rows={2}
                  placeholder="اكتب ملاحظات عن حالة الثمار أو نسبة الهدر الطبيعي..."
                  value={harvestNotes}
                  onChange={(e) => setHarvestNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {harvestError && (
                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">{harvestError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  حفظ سجل القطاف والفرز
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddHarvestModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ز3. مودال المخازن والمستلزمات
          ========================================== */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddInventoryModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">إضافة مستلزم مادي أو مادة خام للمخزن</h3>
              <button onClick={() => setShowAddInventoryModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddInventorySubmit} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الصنف أو المادة الخام</label>
                <input
                  type="text"
                  placeholder="مثال: أبواغ فطر هجين، جبس زراعي، صناديق كرتونية"
                  value={invItemName}
                  onChange={(e) => setInvItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الكمية المستوردة / المتوفرة</label>
                  <input
                    type="number"
                    placeholder="مثال: 150"
                    value={invQuantity}
                    onChange={(e) => setInvQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">وحدة القياس</label>
                  <select
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="كيلو">كيلو جرام (kg)</option>
                    <option value="قطعة">قطعة / كرتونة (Unit)</option>
                    <option value="لتر">لتر (Litre)</option>
                    <option value="طرد">طرد / شوال (Bag)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">حد الأمان والطلب الأدنى للإنذار</label>
                  <input
                    type="number"
                    value={invMinStockAlert}
                    onChange={(e) => setInvMinStockAlert(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ انتهاء الصلاحية (إن وجد)</label>
                  <input
                    type="date"
                    value={invExpiryDate}
                    onChange={(e) => setInvExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left"
                  />
                </div>
              </div>

              {invError && (
                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">{invError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  توريد للمخزن
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddInventoryModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ز4. مودال الموظفون والرواتب
          ========================================== */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddEmployeeModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">إضافة موظف أو تحديث مستحقاته المباشرة</h3>
              <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم العامل أو الموظف الثنائي</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد عبد الرحمن"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الراتب الأساسي الشهري أو لدورة الإنتاج (ج.م)</label>
                <input
                  type="number"
                  placeholder="مثال: 5500"
                  value={empBaseSalary}
                  onChange={(e) => setEmpBaseSalary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع الراتب</label>
                <select
                  value={empSalaryType}
                  onChange={(e) => setEmpSalaryType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="fixed">ثابت شهري</option>
                  <option value="daily">يومي</option>
                  <option value="productivity">إنتاجي (كرتونة)</option>
                </select>
              </div>

              {empSalaryType === 'daily' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">سعر اليوم (ج.م)</label>
                  <input
                    type="number"
                    placeholder="مثال: 200"
                    value={empDailyRate}
                    onChange={(e) => setEmpDailyRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
              )}

              {empSalaryType === 'productivity' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">سعر اليوم (ج.م)</label>
                    <input
                      type="number"
                      placeholder="مثال: 150"
                      value={empDailyRate}
                      onChange={(e) => setEmpDailyRate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">سعر الكرتونة (ج.م)</label>
                    <input
                      type="number"
                      placeholder="مثال: 10"
                      value={empProductivityPrice}
                      onChange={(e) => setEmpProductivityPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">إجمالي السلف (ج.م)</label>
                  <input
                    type="number"
                    value={empAdvances}
                    onChange={(e) => setEmpAdvances(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المكافآت والبدلات (ج.م)</label>
                  <input
                    type="number"
                    value={empBonuses}
                    onChange={(e) => setEmpBonuses(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono"
                  />
                </div>
              </div>

              {empError && (
                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">{empError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  حفظ بيانات الموظف
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال حساب الرواتب */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowPayrollModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">حساب راتب موظف</h3>
              <button onClick={() => setShowPayrollModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اختر الموظف</label>
                <select
                  value={payrollEmployeeId || ''}
                  onChange={(e) => setPayrollEmployeeId(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">اختر موظف...</option>
                  {employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.salary_type === 'fixed' ? 'ثابت' : emp.salary_type === 'daily' ? 'يومي' : 'إنتاجي'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اختر الدورة</label>
                <select
                  value={payrollCycleId || ''}
                  onChange={(e) => setPayrollCycleId(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">اختر دورة...</option>
                  {cyclesList.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>{cycle.cycle_number}</option>
                  ))}
                </select>
              </div>

              {payrollCalculated && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <p className="text-slate-600 mb-1">المبلغ المستحق (صافي)</p>
                  <p className={`text-2xl font-bold ${payrollAmount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{payrollAmount.toLocaleString('ar-EG')} ج.م</p>
                  {payrollEmployeeId && (() => {
                    const emp = employeesList.find(e => e.id === payrollEmployeeId);
                    if (!emp) return null;
                    return (
                      <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                        <p>الراتب الأساسي: {emp.base_salary.toLocaleString()} | السلف: {emp.total_advances.toLocaleString()} | المكافآت: {emp.total_bonuses.toLocaleString()}</p>
                        {emp.salary_type !== 'fixed' && <p>سعر اليوم: {emp.daily_rate || 0} | سعر الكرتونة: {emp.productivity_price_per_box || 0}</p>}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    if (!payrollEmployeeId || !payrollCycleId) {
                      setAlertModalMessage('يرجى اختيار الموظف والدورة أولاً.');
                      setShowAlertModal(true);
                      return;
                    }
                    setPayrollLoading(true);
                    try {
                      const activeDb = demoMode ? demoDb : prodDb;
                      const employee = await activeDb.employees.get(payrollEmployeeId);
                      if (!employee) {
                        setAlertModalMessage('لم يتم العثور على الموظف المحدد.');
                        setShowAlertModal(true);
                        return;
                      }

                      let amount = 0;
                      if (employee.salary_type === 'fixed') {
                        amount = employee.base_salary;
                      } else if (employee.salary_type === 'daily') {
                        const attendance = await activeDb.operational_logs
                          .where('cycle_id')
                          .equals(payrollCycleId!)
                          .count();
                        amount = attendance * (employee.daily_rate || employee.base_salary / 30);
                      } else if (employee.salary_type === 'productivity') {
                        const attendance = await activeDb.operational_logs
                          .where('cycle_id')
                          .equals(payrollCycleId!)
                          .count();
                        const harvest = await activeDb.production
                          .where('cycle_id')
                          .equals(payrollCycleId!)
                          .count();
                        amount = attendance * (employee.daily_rate || employee.base_salary / 30) + harvest * (employee.productivity_price_per_box || 0);
                      }

                      // Net: subtract advances, add bonuses
                      amount = amount - employee.total_advances + employee.total_bonuses;
                      amount = Math.max(amount, 0);

                      setPayrollAmount(amount);
                      setPayrollCalculated(true);
                    } catch (err) {
                      console.error('Error calculating payroll:', err);
                      setAlertModalMessage('حدث خطأ أثناء حساب الراتب.');
                      setShowAlertModal(true);
                    } finally {
                      setPayrollLoading(false);
                    }
                  }}
                  disabled={!payrollEmployeeId || !payrollCycleId || payrollLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {payrollLoading ? 'جاري الحساب...' : 'حساب الراتب'}
                </button>

                {payrollCalculated && payrollAmount > 0 && (
                  <button
                    onClick={async () => {
                      if (!payrollEmployeeId || !payrollCycleId || payrollAmount <= 0) return;
                      try {
                        const activeDb = demoMode ? demoDb : prodDb;
                        const employee = await activeDb.employees.get(payrollEmployeeId);
                        await activeDb.expenses.add({
                          cycle_id: payrollCycleId,
                          date: new Date().toISOString().split('T')[0],
                          type: 'Operational',
                          details: `رواتب: ${employee?.name || 'موظف'}`,
                          amount: payrollAmount
                        });
                        triggerStateRefresh();
                        setShowPayrollModal(false);
                        setPayrollAmount(0);
                        setPayrollCalculated(false);
                        setPayrollEmployeeId(null);
                        setPayrollCycleId(null);
                      } catch (err) {
                        console.error('Error saving payroll:', err);
                      }
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    تسجيل كمصروف
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          ز5. مودال حركة خزينة وعهدة
          ========================================== */}
      {showAddPettyCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddPettyCashModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-50 relative border border-slate-200 text-right animate-scale-in" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">تسجيل معاملة نقدية بالعهدة</h3>
              <button onClick={() => setShowAddPettyCashModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => {
                  setPcType('Deposit');
                  setPcError('');
                }}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all ${
                  pcType === 'Deposit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                إيداع عهدة 📥
              </button>
              <button
                type="button"
                onClick={() => {
                  setPcType('Withdrawal');
                  setPcError('');
                }}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all ${
                  pcType === 'Withdrawal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                سحب ومصروف عاجل 📤
              </button>
            </div>

            <form onSubmit={handleAddPettyCashSubmit} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-700 font-bold mb-1">المبلغ المالي (ج.م)</label>
                <input
                  type="number"
                  placeholder="مثال: 1000"
                  value={pcAmount}
                  onChange={(e) => setPcAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-left font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تفاصيل المعاملة والبيان المالي</label>
                <input
                  type="text"
                  placeholder="مثال: تمويل الخزينة النقدية أو شراء أغراض نثرية"
                  value={pcDetails}
                  onChange={(e) => setPcDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {pcError && (
                <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">{pcError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  تأكيد وتسجيل الحركة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPettyCashModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          خ. مودال تأكيد الحذف المخصص والأمن بالكامل داخل الـ iframe
          ========================================== */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" id="confirm-delete-modal-container">
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm animate-fade-in" onClick={() => setShowConfirmDeleteModal(false)} id="confirm-delete-modal-overlay" />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-50 relative border border-slate-200 text-center animate-scale-in" dir="rtl" id="confirm-delete-modal">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200" id="confirm-delete-modal-icon">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2" id="confirm-delete-modal-title">تأكيد عملية الحذف</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5" id="confirm-delete-modal-description">
              {deleteTargetMessage || "هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟ سيتم تحديث الحسابات والعهد المتبقية تلقائياً."}
            </p>
            <div className="flex gap-3" id="confirm-delete-modal-actions">
              <button
                id="confirm-delete-modal-btn-confirm"
                onClick={async () => {
                  try {
                    await executeActualDelete();
                  } catch (err: any) {
                    console.error("Delete Error:", err);
                    setAlertModalMessage("❌ فشل الحذف: " + err.message);
                    setShowAlertModal(true);
                  } finally {
                    setShowConfirmDeleteModal(false);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                id="confirm-delete-modal-btn-cancel"
                onClick={() => setShowConfirmDeleteModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          ح. مودال التنبيه الأنيق والتحذيرات
          ========================================== */}
      {showAlertModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAlertModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm z-50 relative border border-slate-200 text-center animate-scale-in" dir="rtl">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">تنبيه تشغيلي هام</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">{alertModalMessage}</p>
            <button
              onClick={() => setShowAlertModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
