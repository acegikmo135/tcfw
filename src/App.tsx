import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  LayoutDashboard, 
  PlusCircle, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Wrench, 
  Zap, 
  Shield, 
  Trash2, 
  Building2,
  Lock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AdminPanel } from './components/AdminPanel';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type TransactionType = 'income' | 'expense';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Timestamp;
  createdBy: string;
}

interface FlatInfo {
  flatNo: string;
  role: 'admin' | 'resident';
}

const CATEGORIES = [
  { id: 'plumbing', name: 'Plumbing', icon: Wrench },
  { id: 'wiring', name: 'Wiring', icon: Zap },
  { id: 'maintenance', name: 'Maintenance', icon: Building2 },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'cleaning', name: 'Cleaning', icon: Building2 },
  { id: 'others', name: 'Others', icon: PlusCircle },
];

const PREDEFINED_USERS = [
  { flatNo: 'F602', password: '12345678', role: 'admin' },
  { flatNo: 'F601', password: '12345678', role: 'resident' },
];

// --- Components ---

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [flatInfo, setFlatInfo] = useState<FlatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'monthly' | 'yearly'>('monthly');
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Chart State
  const [chartView, setChartView] = useState<'pie' | 'line'>('pie');
  const [timeRange, setTimeRange] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();

  const years = useMemo(() => {
    const uniqueYears = new Set<number>();
    transactions.forEach(t => {
      const y = t.date?.toDate().getFullYear();
      if (typeof y === 'number') uniqueYears.add(y);
    });
    uniqueYears.add(new Date().getFullYear());
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [transactions]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          const flatId = u.email?.split('@')[0] || '';
          const docRef = doc(db, 'flats', flatId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setFlatInfo(docSnap.data() as FlatInfo);
          }
        } else {
          setFlatInfo(null);
        }
      } catch (err) {
        console.error("Auth state error:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Transactions Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(data);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    const formData = new FormData(e.currentTarget);
    const flatNo = (formData.get('flatNo') as string).trim();
    const password = (formData.get('password') as string).trim();
    
    // Validate if it's one of our predefined users or in Firestore
    let userData: any = PREDEFINED_USERS.find(u => u.flatNo.toUpperCase() === flatNo.toUpperCase() && u.password === password);
    
    if (!userData) {
      // Check Firestore for the user
      try {
        const docRef = doc(db, 'flats', flatNo.toLowerCase());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.password === password) {
            userData = data;
          }
        }
      } catch (err) {
        console.error("Firestore login check error:", err);
      }
    }
    
    if (!userData) {
      setAuthError("Invalid Flat Number or Password.");
      return;
    }

    const email = `${flatNo.toLowerCase()}@building.local`;

    try {
      // Try to sign in
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Login error:", err.code, err.message);
      
      // If user doesn't exist, try to create them (Auto-bootstrap)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await setDoc(doc(db, 'flats', flatNo.toLowerCase()), {
            flatNo: userData.flatNo,
            role: userData.role,
            password: userData.password
          });
          setUser(userCredential.user);
        } catch (bootstrapErr: any) {
          console.error("Bootstrap error:", bootstrapErr);
          if (bootstrapErr.code === 'auth/email-already-in-use') {
            // This means the user exists in Auth but maybe password was wrong or something else
            setAuthError("Invalid Password.");
          } else {
            setAuthError("Failed to initialize user. Please check your connection.");
          }
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError("Email/Password login is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.");
      } else {
        setAuthError(`Login failed: ${err.message}`);
      }
    }
  };

  const initializeDatabase = async () => {
    setLoading(true);
    try {
      for (const u of PREDEFINED_USERS) {
        const email = `${u.flatNo.toLowerCase()}@building.local`;
        try {
          // Try to sign in first
          await signInWithEmailAndPassword(auth, email, u.password);
          // If successful, ensure Firestore doc exists
          await setDoc(doc(db, 'flats', u.flatNo.toLowerCase()), {
            flatNo: u.flatNo,
            role: u.role
          });
        } catch (err: any) {
          // If sign in fails because user doesn't exist, create them
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
            try {
              await createUserWithEmailAndPassword(auth, email, u.password);
              await setDoc(doc(db, 'flats', u.flatNo.toLowerCase()), {
                flatNo: u.flatNo,
                role: u.role
              });
            } catch (createErr: any) {
              console.error(`Failed to create ${u.flatNo}:`, createErr);
              // If email already exists, just try to update the doc (might happen if Auth exists but Firestore doesn't)
              if (createErr.code === 'auth/email-already-in-use') {
                 // We can't easily update Firestore without being logged in, 
                 // but the loop will continue to the next user
              }
            }
          }
        }
      }
      alert("Database initialized successfully! You can now login.");
    } catch (err: any) {
      console.error("Init error:", err);
      alert("Initialization failed: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
      signOut(auth);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleDelete = async (id: string) => {
    setDeletingId(null);
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const exportToPDF = (type: 'monthly' | 'yearly', year: number, month: number) => {
    const doc = new jsPDF();
    
    let filtered = transactions;
    let title = "The Courtyard F wing - Fund Report";
    
    if (type === 'monthly') {
      const start = startOfMonth(new Date(year, month));
      const end = endOfMonth(start);
      filtered = transactions.filter(t => {
        const d = t.date?.toDate();
        return d && d >= start && d <= end;
      });
      title += ` (${format(start, 'MMMM yyyy')})`;
    } else {
      const start = startOfYear(new Date(year, 0));
      const end = endOfYear(start);
      filtered = transactions.filter(t => {
        const d = t.date?.toDate();
        return d && d >= start && d <= end;
      });
      title += ` (Year ${year})`;
    }

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 30);
    
    const periodIncome = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const periodExpense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    doc.text(`Total Income: Rs. ${periodIncome.toLocaleString()}`, 14, 38);
    doc.text(`Total Expense: Rs. ${periodExpense.toLocaleString()}`, 14, 44);
    doc.text(`Net Balance: Rs. ${(periodIncome - periodExpense).toLocaleString()}`, 14, 50);

    const tableData = filtered.map(t => [
      t.date ? format(t.date.toDate(), 'MMM d, yyyy') : 'Pending',
      t.type.toUpperCase(),
      t.category,
      t.description || '-',
      `Rs. ${t.amount.toLocaleString()}`,
      t.createdBy
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Date', 'Type', 'Category', 'Description', 'Amount', 'By']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [90, 90, 64] },
    });

    doc.save(`Courtyard_F_Wing_${type}_${year}${type === 'monthly' ? '_' + (month + 1) : ''}.pdf`);
    setIsExportModalOpen(false);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || t.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, filterType]);

  const totalIncome = useMemo(() => 
    transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  const totalExpense = useMemo(() => 
    transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  const balance = totalIncome - totalExpense;

  // --- Skeleton Components ---
  const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 animate-pulse">
      <div className="h-3 w-24 bg-[#F5F5F0] rounded mb-4" />
      <div className="h-10 w-32 bg-[#F5F5F0] rounded" />
    </div>
  );

  const SkeletonTransaction = () => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#F5F5F0] rounded-xl" />
        <div className="space-y-2">
          <div className="h-4 w-24 bg-[#F5F5F0] rounded" />
          <div className="h-3 w-32 bg-[#F5F5F0] rounded" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <div className="h-5 w-20 bg-[#F5F5F0] rounded ml-auto" />
        <div className="h-3 w-12 bg-[#F5F5F0] rounded ml-auto" />
      </div>
    </div>
  );

  // --- Chart Data Calculations ---
  const chartData = useMemo(() => {
    if (timeRange === 'monthly') {
      const start = startOfMonth(new Date(selectedYear, selectedMonth));
      const end = endOfMonth(start);
      const filtered = transactions.filter(t => {
        const d = t.date?.toDate();
        return d && d >= start && d <= end;
      });

      if (chartView === 'pie') {
        // Expenses by category
        const expenses = filtered.filter(t => t.type === 'expense');
        const data: { name: string; value: number }[] = [];
        CATEGORIES.forEach(cat => {
          const total = expenses.filter(t => t.category === cat.name).reduce((acc, t) => acc + t.amount, 0);
          if (total > 0) data.push({ name: cat.name, value: total });
        });
        return data;
      } else {
        // Daily Income vs Expense
        const days = eachDayOfInterval({ start, end });
        return days.map(day => {
          const dayTransactions = filtered.filter(t => isSameDay(t.date?.toDate(), day));
          return {
            name: format(day, 'd'),
            income: dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
            expense: dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
          };
        });
      }
    } else {
      const start = startOfYear(new Date(selectedYear, 0));
      const end = endOfYear(start);
      const filtered = transactions.filter(t => {
        const d = t.date?.toDate();
        return d && d >= start && d <= end;
      });

      if (chartView === 'pie') {
        const expenses = filtered.filter(t => t.type === 'expense');
        const data: { name: string; value: number }[] = [];
        CATEGORIES.forEach(cat => {
          const total = expenses.filter(t => t.category === cat.name).reduce((acc, t) => acc + t.amount, 0);
          if (total > 0) data.push({ name: cat.name, value: total });
        });
        return data;
      } else {
        // Monthly Income vs Expense
        const months = eachMonthOfInterval({ start, end });
        return months.map(month => {
          const monthTransactions = filtered.filter(t => isSameMonth(t.date?.toDate(), month));
          return {
            name: format(month, 'MMM'),
            income: monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
            expense: monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
          };
        });
      }
    }
  }, [transactions, chartView, timeRange, selectedYear, selectedMonth]);

  const COLORS = ['#5A5A40', '#8E8E6B', '#C2C296', '#E6E6D1', '#A3A375', '#70704F'];

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-sm border border-black/5"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#5A5A40] rounded-full flex items-center justify-center mb-4">
              <Building2 className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-serif text-[#1A1A1A]">{t('app.title')}</h1>
            <p className="text-[#5A5A40]/60 font-serif italic text-center">{t('app.subtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('login.flatNo')}</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
                <input 
                  name="flatNo"
                  required
                  placeholder="e.g. F601"
                  className="w-full pl-12 pr-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('login.password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
                <input 
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                {t('login.invalid')}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors shadow-lg shadow-[#5A5A40]/20"
            >
              {t('login.enter')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-black/5 text-center space-y-4">
            <p className="text-xs text-[#5A5A40]/40 uppercase tracking-tighter">
              {t('login.authorized')}
            </p>
            <button 
              onClick={initializeDatabase}
              className="text-xs text-[#5A5A40]/60 hover:text-[#5A5A40] underline underline-offset-4"
            >
              {t('login.setup')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg leading-tight">{t('app.title')}</h2>
              <p className="text-xs text-[#5A5A40]/60 font-medium uppercase tracking-widest">
                {t('login.flatNo')} {flatInfo?.flatNo} • {flatInfo?.role === 'admin' ? t('admin.admin') : t('admin.resident')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === 'en' ? 'gu' : 'en')}
              className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors"
            >
              {language === 'en' ? 'GU' : 'EN'}
            </button>
            {flatInfo?.role === 'admin' && (
              <Link 
                to="/adminpanel" 
                className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5A5A40]/40 hover:text-[#5A5A40] transition-colors"
              >
                <Shield className="w-4 h-4" />
                {t('dash.adminPanel')}
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors text-[#5A5A40]"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 cursor-default"
              >
                <p className="text-xs uppercase tracking-widest text-[#5A5A40]/60 mb-2 font-medium">Current Balance</p>
                <h3 className="text-4xl font-serif">₹{balance.toLocaleString()}</h3>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 cursor-default"
              >
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <p className="text-xs uppercase tracking-widest font-medium">Total Income</p>
                </div>
                <h3 className="text-3xl font-serif">₹{totalIncome.toLocaleString()}</h3>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 cursor-default"
              >
                <div className="flex items-center gap-2 text-rose-600 mb-2">
                  <TrendingDown className="w-4 h-4" />
                  <p className="text-xs uppercase tracking-widest font-medium">Total Expenses</p>
                </div>
                <h3 className="text-3xl font-serif">₹{totalExpense.toLocaleString()}</h3>
              </motion.div>
            </>
          )}
        </div>

        {/* Actions & List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transaction List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-serif">Recent Transactions</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 bg-white border border-black/5 text-[#5A5A40] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#F5F5F0] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                {flatInfo?.role === 'admin' && (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Entry
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
                <input 
                  type="text"
                  placeholder="Search by category or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all text-sm"
                />
              </div>
              <div className="flex bg-white border border-black/5 rounded-2xl p-1">
                {(['all', 'income', 'expense'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                      filterType === type ? "bg-[#5A5A40] text-white shadow-sm" : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <motion.div 
                    key="skeleton-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <SkeletonTransaction />
                    <SkeletonTransaction />
                    <SkeletonTransaction />
                  </motion.div>
                ) : filteredTransactions.length === 0 ? (
                  <motion.div 
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-20 bg-white rounded-[32px] border border-dashed border-[#5A5A40]/20"
                  >
                    <p className="text-[#5A5A40]/40 font-serif italic">No transactions found.</p>
                  </motion.div>
                ) : (
                  filteredTransactions.map((t) => (
                    <motion.div 
                      key={t.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {t.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-[#1A1A1A]">{t.category}</h4>
                          <p className="text-xs text-[#5A5A40]/60">
                            {t.date ? format(t.date.toDate(), 'MMM d, yyyy • h:mm a') : 'Processing...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={cn(
                            "font-serif text-lg",
                            t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/40 font-medium">
                            By {t.createdBy}
                          </p>
                        </div>
                        {flatInfo?.role === 'admin' && (
                          <button 
                            onClick={() => setDeletingId(t.id)}
                            className="p-2 text-rose-600/60 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Charts Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-serif">{t('chart.overview')}</h3>
                <div className="flex gap-2">
                  <select 
                    value={chartView}
                    onChange={(e) => setChartView(e.target.value as any)}
                    className="text-xs bg-[#F5F5F0] border-none rounded-lg px-2 py-1 outline-none font-medium"
                  >
                    <option value="pie">{t('chart.pie')}</option>
                    <option value="line">{t('chart.line')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTimeRange('monthly')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      timeRange === 'monthly' ? "bg-[#5A5A40] text-white" : "bg-[#F5F5F0] text-[#5A5A40]/40"
                    )}
                  >
                    {t('pdf.monthly')}
                  </button>
                  <button 
                    onClick={() => setTimeRange('yearly')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      timeRange === 'yearly' ? "bg-[#5A5A40] text-white" : "bg-[#F5F5F0] text-[#5A5A40]/40"
                    )}
                  >
                    {t('pdf.yearly')}
                  </button>
                </div>

                <div className="flex gap-2">
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="flex-1 text-xs bg-[#F5F5F0] border-none rounded-xl px-3 py-2 outline-none font-medium"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {timeRange === 'monthly' && (
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="flex-1 text-xs bg-[#F5F5F0] border-none rounded-xl px-3 py-2 outline-none font-medium"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i}>{format(new Date(2024, i), 'MMMM')}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#5A5A40' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#5A5A40' }}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="income" 
                        stroke="#10B981" 
                        strokeWidth={2} 
                        dot={false} 
                        name={t('income')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expense" 
                        stroke="#EF4444" 
                        strokeWidth={2} 
                        dot={false} 
                        name={t('expense')}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#5A5A40] p-6 rounded-[32px] text-white">
              <h3 className="text-lg font-serif mb-2">Financial Health</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                {balance > 0 
                  ? "The building fund is healthy. We have a positive surplus for future maintenance."
                  : "The building fund is currently in deficit. Please ensure all dues are cleared."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-serif mb-6">New Transaction</h3>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    type: formData.get('type') as TransactionType,
                    amount: Number(formData.get('amount')),
                    category: formData.get('category') as string,
                    description: formData.get('description') as string,
                    date: serverTimestamp(),
                    createdBy: flatInfo?.flatNo || 'Unknown'
                  };
                  
                  setIsAdding(false);
                  try {
                    await addDoc(collection(db, 'transactions'), data);
                  } catch (err) {
                    console.error("Error adding transaction:", err);
                    alert("Failed to add transaction. Check permissions.");
                  }
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <label className="relative cursor-pointer">
                    <input type="radio" name="type" value="income" defaultChecked className="peer sr-only" />
                    <div className="p-4 rounded-2xl bg-[#F5F5F0] border-2 border-transparent peer-checked:border-emerald-500 peer-checked:bg-emerald-50 transition-all text-center">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-widest">Income</span>
                    </div>
                  </label>
                  <label className="relative cursor-pointer">
                    <input type="radio" name="type" value="expense" className="peer sr-only" />
                    <div className="p-4 rounded-2xl bg-[#F5F5F0] border-2 border-transparent peer-checked:border-rose-500 peer-checked:bg-rose-50 transition-all text-center">
                      <TrendingDown className="w-6 h-6 mx-auto mb-2 text-rose-600" />
                      <span className="text-xs font-bold uppercase tracking-widest">Expense</span>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Amount (₹)</label>
                    <input 
                      name="amount"
                      type="number"
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Category</label>
                    <select 
                      name="category"
                      required
                      className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none appearance-none"
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Description</label>
                  <textarea 
                    name="description"
                    rows={3}
                    placeholder="Brief details..."
                    className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* PDF Export Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExportModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-serif mb-6">{t('pdf.generate')}</h3>
              
              <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-[#F5F5F0] rounded-2xl">
                  <button 
                    onClick={() => setExportType('monthly')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                      exportType === 'monthly' ? "bg-[#5A5A40] text-white shadow-sm" : "text-[#5A5A40]/40"
                    )}
                  >
                    {t('pdf.monthly')}
                  </button>
                  <button 
                    onClick={() => setExportType('yearly')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                      exportType === 'yearly' ? "bg-[#5A5A40] text-white shadow-sm" : "text-[#5A5A40]/40"
                    )}
                  >
                    {t('pdf.yearly')}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('pdf.year')}</label>
                    <select 
                      value={exportYear}
                      onChange={(e) => setExportYear(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none appearance-none font-medium"
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {exportType === 'monthly' && (
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('pdf.month')}</label>
                      <select 
                        value={exportMonth}
                        onChange={(e) => setExportMonth(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none appearance-none font-medium"
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i} value={i}>{format(new Date(2024, i), 'MMMM')}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsExportModalOpen(false)}
                    className="flex-1 py-4 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={() => exportToPDF(exportType, exportYear, exportMonth)}
                    className="flex-1 bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('pdf.download')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-rose-600 w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif mb-2">{t('del.title')}</h3>
              <p className="text-sm text-[#5A5A40]/60 mb-8">
                {t('del.desc')}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={() => handleDelete(deletingId)}
                  className="flex-1 bg-rose-600 text-white py-3 rounded-full font-medium hover:bg-rose-700 transition-colors"
                >
                  {t('del.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/adminpanel" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
