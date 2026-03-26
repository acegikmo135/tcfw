/// <reference types="vite/client" />
import React, { Component, useState, useEffect, useMemo } from 'react';
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
  deleteDoc,
  updateDoc,
  increment,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  signInWithCustomToken,
  User 
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { LayoutDashboard, CirclePlus as PlusCircle, LogOut, Bell, Pin, CreditCard as Edit2, X, TrendingUp, TrendingDown, Wrench, Zap, Shield, Trash2, Building2, Lock, User as UserIcon, Loader as Loader2, CircleAlert as AlertCircle, Download, Search, ListFilter as Filter, Eye, EyeOff, Smartphone } from 'lucide-react';
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
import { InstallPWA } from './components/InstallPWA';
import { OneSignalButton, initOneSignal } from './components/OneSignalNotifications';
import { CommentsModal } from './components/CommentsModal';
import { Profile } from './components/Profile';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendPushNotification } from './lib/notifications';

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
  commentCount?: number;
}

interface FlatInfo {
  flatNo: string;
  role: 'admin' | 'resident';
}

interface Notice {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: Timestamp;
  isPinned?: boolean;
}

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
  const [selectedTransactionForComments, setSelectedTransactionForComments] = useState<Transaction | null>(null);
  const [selectedTransactionForDetails, setSelectedTransactionForDetails] = useState<Transaction | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginFlatNo, setLoginFlatNo] = useState('');
  const [exportType, setExportType] = useState<'monthly' | 'yearly'>('monthly');
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [newTxType, setNewTxType] = useState<TransactionType>('income');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, type: string}[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isAddingNotice, setIsAddingNotice] = useState(false);

  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState("");

  // Chart State
  const [chartView, setChartView] = useState<'pie' | 'line'>('pie');
  const [timeRange, setTimeRange] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (appId) initOneSignal(appId);
  }, []);

  const years = useMemo(() => {
    const uniqueYears = new Set<number>();
    transactions.forEach(tx => {
      const y = tx.date?.toDate().getFullYear();
      if (typeof y === 'number') uniqueYears.add(y);
    });
    uniqueYears.add(new Date().getFullYear());
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [transactions]);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setConnectionError("Firestore is offline. Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);



  const isAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = ['manthankansagra@gmail.com', 'admin@building.local', 'f602@building.local'];
    const isEmailAdmin = adminEmails.includes(user.email || '');
    const isRoleAdmin = flatInfo?.role === 'admin';
    const result = isEmailAdmin || isRoleAdmin;
    console.log("Admin Check:", { email: user.email, isEmailAdmin, isRoleAdmin, result });
    return result;
  }, [user, flatInfo]);

  // Fetch Categories
  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        type: doc.data().type
      }));
      console.log("Fetched categories:", data.length);
      setCategories(data);
    }, (error: any) => {
      handleFirestoreError(error, OperationType.GET, 'categories');
    });
    return () => unsubscribe();
  }, []);

  // Seed Categories if empty and user is admin
  useEffect(() => {
    const seedIfEmpty = async () => {
      if (isAdmin && user) {
        try {
          const q = query(collection(db, 'categories'), limit(1));
          const snap = await getDocs(q);
          if (snap.empty) {
            console.log("Seeding default categories...");
            const defaultCategories = [
              { name: 'Plumbing', type: 'expense' },
              { name: 'Wiring', type: 'expense' },
              { name: 'Maintenance', type: 'expense' },
              { name: 'Security', type: 'expense' },
              { name: 'Cleaning', type: 'expense' },
              { name: 'Others', type: 'expense' },
              { name: 'Salary', type: 'expense' },
              { name: 'Rent', type: 'income' },
              { name: 'Maintenance Collection', type: 'income' },
            ];

            for (const cat of defaultCategories) {
              await addDoc(collection(db, 'categories'), cat);
            }
            console.log("Seeding complete.");
          }
        } catch (error: any) {
          console.error("Error seeding categories:", error);
        }
      }
    };
    seedIfEmpty();
  }, [isAdmin, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u: User | null) => {
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
      } catch (err: any) {
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
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });
    return () => unsubscribe();
  }, [user]);

  // Notices Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notices'), orderBy('isPinned', 'desc'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notice[];
      setNotices(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notices');
    });
    return () => unsubscribe();
  }, [user]);

  const addNotice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNoticeError("");
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string).trim();
    const content = (formData.get('content') as string).trim();

    if (!title || !content) {
      setNoticeError("Please fill all fields.");
      return;
    }

    try {
      if (!user || !user.email) throw new Error("Not authenticated");
      
        if (editingNotice) {
        await updateDoc(doc(db, 'notices', editingNotice.id), {
          title,
          content
        });
      } else {
        await addDoc(collection(db, 'notices'), {
          title,
          content,
          createdBy: flatInfo?.flatNo || user.email.split('@')[0],
          createdAt: serverTimestamp(),
          isPinned: false
        });
        sendPushNotification({
          title: `📢 New Notice: ${title}`,
          message: content.substring(0, 120),
          url: window.location.origin,
        });
      }
      
      setIsAddingNotice(false);
      setEditingNotice(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notices');
    }
  };

  const deleteNotice = async (id: string) => {
    setDeletingNoticeId(id);
  };

  const confirmDeleteNotice = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notices', id));
      setDeletingNoticeId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notices/${id}`);
    }
  };

  const togglePinNotice = async (notice: Notice) => {
    try {
      await updateDoc(doc(db, 'notices', notice.id), {
        isPinned: !notice.isPinned
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notices/${notice.id}`);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    const formData = new FormData(e.currentTarget);
    const flatNo = (formData.get('flatNo') as string).trim();
    const password = (formData.get('password') as string).trim();
    
    const email = `${flatNo.toLowerCase()}@building.local`;

    try {
      // Try to sign in
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Login error code:", err.code);
      console.error("Login error message:", err.message);
      
      // Auto-bootstrap predefined users
      const predefined = PREDEFINED_USERS.find(u => u.flatNo.toUpperCase() === flatNo.toUpperCase() && u.password === password);
      
      if (predefined) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          try {
            // Try to create user if not found
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const docRef = doc(db, 'flats', flatNo.toLowerCase());
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
              await setDoc(docRef, {
                flatNo: predefined.flatNo,
                role: predefined.role
              });
            }
            setUser(userCredential.user);
            return;
          } catch (bootstrapErr: any) {
            if (bootstrapErr.code === 'auth/email-already-in-use') {
              // User exists but password might be wrong or some other issue
              setAuthError("Incorrect password for this flat.");
            } else {
              console.error("Bootstrap error:", bootstrapErr);
              setAuthError("Failed to initialize user account.");
            }
            return;
          }
        }
      }

      if (err.code === 'auth/operation-not-allowed') {
        setAuthError("Email/Password login is not enabled in Firebase Console.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        setAuthError("Invalid Flat Number or Password.");
      } else {
        setAuthError(err.message || "An error occurred during login.");
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleDelete = async (id: string) => {
    setDeletingId(null);
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const exportToPDF = (type: 'monthly' | 'yearly', year: number, month: number) => {
    const doc = new jsPDF();
    
    let filtered = transactions;
    let title = t('pdf.title');
    
    if (type === 'monthly') {
      const start = startOfMonth(new Date(year, month));
      const end = endOfMonth(start);
      filtered = transactions.filter(tx => {
        const d = tx.date?.toDate();
        return d && d >= start && d <= end;
      });
      title += ` (${format(start, 'MMMM yyyy')})`;
    } else {
      const start = startOfYear(new Date(year, 0));
      const end = endOfYear(start);
      filtered = transactions.filter(tx => {
        const d = tx.date?.toDate();
        return d && d >= start && d <= end;
      });
      title += ` (Year ${year})`;
    }

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${t('pdf.generatedOn')}: ${format(new Date(), 'PPP p')}`, 14, 30);
    
    const periodIncome = filtered.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
    const periodExpense = filtered.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
    
    doc.text(`${t('pdf.totalIncome')}: Rs. ${periodIncome.toLocaleString()}`, 14, 38);
    doc.text(`${t('pdf.totalExpense')}: Rs. ${periodExpense.toLocaleString()}`, 14, 44);
    doc.text(`${t('pdf.netBalance')}: Rs. ${(periodIncome - periodExpense).toLocaleString()}`, 14, 50);

    const tableData = filtered.map(tx => [
      tx.date ? format(tx.date.toDate(), 'MMM d, yyyy') : t('pdf.pending'),
      tx.type.toUpperCase(),
      tx.category,
      tx.description || '-',
      `Rs. ${tx.amount.toLocaleString()}`,
      tx.createdBy
    ]);

    autoTable(doc, {
      startY: 55,
      head: [[t('pdf.date'), t('pdf.type'), t('pdf.category'), t('pdf.desc'), t('pdf.amount'), t('pdf.by')]],
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
      const filtered = transactions.filter(tx => {
        const d = tx.date?.toDate();
        return d && d >= start && d <= end;
      });

      if (chartView === 'pie') {
        // Expenses by category
        const expenses = filtered.filter(tx => tx.type === 'expense');
        const data: { name: string; value: number }[] = [];
        categories.filter(c => c.type === 'expense').forEach(cat => {
          const total = expenses.filter(tx => tx.category === cat.name).reduce((acc, tx) => acc + tx.amount, 0);
          if (total > 0) data.push({ name: cat.name, value: total });
        });
        return data;
      } else {
        // Daily Income vs Expense
        const days = eachDayOfInterval({ start, end });
        return days.map(day => {
          const dayTransactions = filtered.filter(tx => isSameDay(tx.date?.toDate(), day));
          return {
            name: format(day, 'd'),
            income: dayTransactions.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0),
            expense: dayTransactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0),
          };
        });
      }
    } else {
      const start = startOfYear(new Date(selectedYear, 0));
      const end = endOfYear(start);
      const filtered = transactions.filter(tx => {
        const d = tx.date?.toDate();
        return d && d >= start && d <= end;
      });

      if (chartView === 'pie') {
        const expenses = filtered.filter(tx => tx.type === 'expense');
        const data: { name: string; value: number }[] = [];
        categories.filter(c => c.type === 'expense').forEach(cat => {
          const total = expenses.filter(tx => tx.category === cat.name).reduce((acc, tx) => acc + tx.amount, 0);
          if (total > 0) data.push({ name: cat.name, value: total });
        });
        return data;
      } else {
        // Monthly Income vs Expense
        const months = eachMonthOfInterval({ start, end });
        return months.map(month => {
          const monthTransactions = filtered.filter(tx => isSameMonth(tx.date?.toDate(), month));
          return {
            name: format(month, 'MMM'),
            income: monthTransactions.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0),
            expense: monthTransactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0),
          };
        });
      }
    }
  }, [transactions, chartView, timeRange, selectedYear, selectedMonth, categories]);

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
            <div className="w-16 h-16 bg-[#5A5A40] rounded-full flex items-center justify-center mb-4 overflow-hidden">
              <img src="https://raw.githubusercontent.com/acegikmo135/assets/main/vbub4efh.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-serif text-[#1A1A1A] text-center whitespace-nowrap">{t('app.title')}</h1>
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
                  value={loginFlatNo}
                  onChange={(e) => setLoginFlatNo(e.target.value)}
                  placeholder={t('login.flatNoPlaceholder')}
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
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full pl-12 pr-12 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#5A5A40]/40 hover:text-[#5A5A40] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
            <div className="pt-4 space-y-3">
              <p className="text-sm font-serif text-[#5A5A40]">Made by Manthan - F602</p>
              <div className="flex flex-col items-center gap-2">
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold uppercase tracking-widest text-white bg-[#5A5A40] px-4 py-2 rounded-full hover:bg-[#4A4A30] transition-colors"
                >
                  Open in New Tab
                </a>
                <p className="text-xs text-[#5A5A40]/60 mt-2">If any issue, contact dev@manthank.com</p>
                <a 
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=dev@manthank.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] border border-[#5A5A40]/20 px-4 py-2 rounded-full hover:bg-[#F5F5F0] transition-colors"
                >
                  Email Support
                </a>
              </div>
            </div>
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
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center overflow-hidden">
              <img src="https://raw.githubusercontent.com/acegikmo135/assets/main/vbub4efh.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-serif text-lg leading-tight">Welcome {flatInfo?.flatNo}!</h2>
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
            <Link 
              to="/profile" 
              className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors text-[#5A5A40]"
            >
              <UserIcon className="w-5 h-5" />
            </Link>
            {isAdmin && (
              <Link 
                to="/adminpanel" 
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5A5A40]/40 hover:text-[#5A5A40] transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">{t('dash.adminPanel')}</span>
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
                <p className="text-xs uppercase tracking-widest text-[#5A5A40]/60 mb-2 font-medium">{t('dash.totalBalance')}</p>
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
                  <p className="text-xs uppercase tracking-widest font-medium">{t('income')}</p>
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
                  <p className="text-xs uppercase tracking-widest font-medium">{t('expense')}</p>
                </div>
                <h3 className="text-3xl font-serif">₹{totalExpense.toLocaleString()}</h3>
              </motion.div>
            </>
          )}
        </div>

        {/* Actions & List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Building Notices - MOVED HERE */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#5A5A40]" />
                  Building Notices
                </h3>
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setEditingNotice(null);
                      setIsAddingNotice(true);
                    }}
                    className="text-[#5A5A40] hover:bg-[#5A5A40]/5 p-2 rounded-full transition-colors"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notices.map((notice) => (
                  <motion.div 
                    key={notice.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-white p-6 rounded-[32px] shadow-md border-2 transition-all",
                      notice.isPinned 
                        ? "border-[#5A5A40] bg-[#5A5A40]/10 ring-4 ring-[#5A5A40]/5" 
                        : "border-[#5A5A40]/20 bg-[#5A5A40]/5"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {notice.isPinned && <Pin className="w-4 h-4 text-[#5A5A40]" />}
                          <h4 className="font-serif text-lg font-bold">{notice.title}</h4>
                        </div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40 mt-1">
                          {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString() : 'Just now'} • By {notice.createdBy}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => togglePinNotice(notice)}
                            className={cn(
                              "p-2 rounded-full transition-colors",
                              notice.isPinned ? "text-[#5A5A40] bg-[#5A5A40]/10" : "text-[#5A5A40]/40 hover:bg-[#F5F5F0]"
                            )}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingNotice(notice);
                              setIsAddingNotice(true);
                            }}
                            className="p-2 text-[#5A5A40]/40 hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteNotice(notice.id)}
                            className="p-2 text-rose-500/40 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-[#1A1A1A] mb-2 whitespace-pre-wrap leading-relaxed font-medium">{notice.content}</p>
                  </motion.div>
                ))}
                {notices.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-[32px] border border-dashed border-[#5A5A40]/20">
                    <p className="text-[#5A5A40]/40 font-serif italic">No notices at the moment.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
              <h3 className="text-xl font-serif">{t('dash.recent')}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 bg-white border border-black/5 text-[#5A5A40] px-4 py-2 rounded-full text-sm font-medium hover:bg-[#F5F5F0] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('dash.export')}
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {t('dash.add')}
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
                  placeholder={t('dash.search')}
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
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>

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
                    <p className="text-[#5A5A40]/40 font-serif italic">{t('dash.noTransactions')}</p>
                  </motion.div>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <motion.div 
                      key={transaction.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      onClick={() => setSelectedTransactionForDetails(transaction)}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                            transaction.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {transaction.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                          </div>
                          <div>
                            <h4 className="font-medium text-[#1A1A1A]">{transaction.category}</h4>
                            <p className="text-xs text-[#5A5A40]/60">
                              {transaction.date ? format(transaction.date.toDate(), 'MMM d, yyyy • h:mm a') : 'Processing...'}
                            </p>
                          </div>
                        </div>
                        <div className="sm:hidden text-right">
                          <p className={cn(
                            "font-serif text-lg",
                            transaction.type === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {transaction.type === 'income' ? '+' : '-'} ₹{transaction.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 border-t sm:border-none pt-4 sm:pt-0">
                        <div className="hidden sm:block text-right">
                          <p className={cn(
                            "font-serif text-lg",
                            transaction.type === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {transaction.type === 'income' ? '+' : '-'} ₹{transaction.amount.toLocaleString()}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/40 font-medium">
                            By {transaction.createdBy}
                          </p>
                        </div>
                        <div className="sm:hidden">
                          <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/40 font-medium">
                            By {transaction.createdBy}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransactionForComments(transaction);
                            }}
                            className="relative p-2 text-[#5A5A40]/60 hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-all"
                            title="View Comments"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                            {transaction.commentCount && transaction.commentCount > 0 && (
                              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                            )}
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(transaction.id);
                              }}
                              className="p-2 text-rose-600/60 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
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

              <div className="h-[250px] w-full" style={{ minHeight: '250px' }}>
                {(chartData as any[]).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    {chartView === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={chartData as any[]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {(chartData as any[]).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    ) : (
                      <LineChart data={chartData as any[]}>
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
                ) : (
                  <div className="h-full flex items-center justify-center text-[#5A5A40]/40 italic font-serif">
                    No data to display
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#5A5A40] p-6 rounded-[32px] text-white">
              <h3 className="text-lg font-serif mb-2">{t('dash.health')}</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                {balance > 0 
                  ? t('dash.healthGood')
                  : t('dash.healthBad')}
              </p>
            </div>

            <InstallPWA
              alwaysShow={true}
              className="flex items-center gap-2 px-6 py-3 rounded-[20px] font-bold transition-all hover:-translate-y-0.5 bg-[#5A5A40] text-white w-full justify-center shadow-sm hover:bg-[#4A4A30]"
            />

            <OneSignalButton
              className="flex items-center gap-2 px-6 py-3 rounded-[20px] font-bold transition-all hover:-translate-y-0.5 bg-white border border-[#5A5A40]/20 text-[#5A5A40] w-full justify-center shadow-sm hover:bg-[#F5F5F0]"
            />
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-8 border-t border-black/5 mt-8 text-center">
        <p className="text-sm font-serif text-[#5A5A40] mb-4">Made by Manthan - F602</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="https://manthank.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-widest text-white bg-[#5A5A40] px-6 py-3 rounded-full hover:bg-[#4A4A30] transition-colors shadow-sm"
          >
            Visit Website
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#5A5A40]/60">If any issue, contact dev@manthank.com</span>
            <a 
              href="https://mail.google.com/mail/?view=cm&fs=1&to=dev@manthank.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] border border-[#5A5A40]/20 px-6 py-3 rounded-full hover:bg-[#F5F5F0] transition-colors"
            >
              Email Support
            </a>
          </div>
        </div>
      </footer>

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
              <h3 className="text-2xl font-serif mb-6">{t('tx.new')}</h3>
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
                    sendPushNotification({
                      title: `${data.type === 'income' ? '💰 New Income' : '💸 New Expense'}: ${data.category}`,
                      message: `${data.type === 'income' ? '+' : '-'}₹${data.amount.toLocaleString()} — ${data.description || 'No description'} (by ${data.createdBy})`,
                      url: window.location.origin,
                    });
                  } catch (error) {
                    handleFirestoreError(error, OperationType.CREATE, 'transactions');
                  }
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <label className="relative cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="income" 
                      checked={newTxType === 'income'} 
                      onChange={() => setNewTxType('income')}
                      className="peer sr-only" 
                    />
                    <div className="p-4 rounded-2xl bg-[#F5F5F0] border-2 border-transparent peer-checked:border-emerald-500 peer-checked:bg-emerald-50 transition-all text-center">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-widest">{t('income')}</span>
                    </div>
                  </label>
                  <label className="relative cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="expense" 
                      checked={newTxType === 'expense'} 
                      onChange={() => setNewTxType('expense')}
                      className="peer sr-only" 
                    />
                    <div className="p-4 rounded-2xl bg-[#F5F5F0] border-2 border-transparent peer-checked:border-rose-500 peer-checked:bg-rose-50 transition-all text-center">
                      <TrendingDown className="w-6 h-6 mx-auto mb-2 text-rose-600" />
                      <span className="text-xs font-bold uppercase tracking-widest">{t('expense')}</span>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('tx.amount')} (₹)</label>
                    <input 
                      name="amount"
                      type="number"
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('tx.category')}</label>
                    <select 
                      name="category"
                      required
                      className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none appearance-none"
                    >
                      {categories.filter(c => c.type === newTxType).length > 0 ? (
                        categories.filter(c => c.type === newTxType).map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                      ) : (
                        <option value="">No categories found. Please seed them in Admin Panel.</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('tx.description')}</label>
                  <textarea 
                    name="description"
                    rows={3}
                    placeholder={t('tx.descPlaceholder')}
                    className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    {t('tx.save')}
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

      {/* Delete Notice Confirmation Modal */}
      <AnimatePresence>
        {deletingNoticeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingNoticeId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif mb-2">{t('del.title')}</h3>
              <p className="text-[#5A5A40]/60 mb-8">Are you sure you want to delete this notice? This action cannot be undone.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingNoticeId(null)}
                  className="flex-1 py-3 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={() => confirmDeleteNotice(deletingNoticeId)}
                  className="flex-1 bg-rose-600 text-white py-3 rounded-full font-medium hover:bg-rose-700 transition-colors"
                >
                  {t('del.confirm')}
                </button>
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
      
      {/* Add/Edit Notice Modal */}
      <AnimatePresence>
        {isAddingNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingNotice(false);
                setEditingNotice(null);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-serif mb-6">{editingNotice ? 'Edit Notice' : 'Add Notice'}</h3>
              
              {noticeError && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-medium">
                  {noticeError}
                </div>
              )}

              <form onSubmit={addNotice} className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Title</label>
                  <input 
                    name="title"
                    type="text"
                    required
                    defaultValue={editingNotice?.title || ''}
                    placeholder="Notice Title"
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Content</label>
                  <textarea 
                    name="content"
                    required
                    rows={4}
                    defaultValue={editingNotice?.content || ''}
                    placeholder="Notice Content"
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingNotice(false);
                      setEditingNotice(null);
                    }}
                    className="flex-1 py-4 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    {editingNotice ? 'Update Notice' : 'Post Notice'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTransactionForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransactionForDetails(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  selectedTransactionForDetails.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {selectedTransactionForDetails.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                </div>
                <button 
                  onClick={() => setSelectedTransactionForDetails(null)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[#5A5A40]" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-3xl font-serif text-[#1A1A1A]">
                    {selectedTransactionForDetails.type === 'income' ? '+' : '-'} ₹{selectedTransactionForDetails.amount.toLocaleString()}
                  </h3>
                  <p className="text-[#5A5A40]/60 font-medium uppercase tracking-widest text-[10px] mt-1">
                    {selectedTransactionForDetails.category}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-[#F5F5F0] rounded-2xl">
                    <label className="block text-[10px] uppercase tracking-widest text-[#5A5A40]/40 mb-2 font-bold">Description</label>
                    <p className="text-[#1A1A1A] leading-relaxed">
                      {selectedTransactionForDetails.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F5F5F0] rounded-2xl">
                      <label className="block text-[10px] uppercase tracking-widest text-[#5A5A40]/40 mb-1 font-bold">Date</label>
                      <p className="text-sm font-medium">
                        {selectedTransactionForDetails.date ? format(selectedTransactionForDetails.date.toDate(), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-[#F5F5F0] rounded-2xl">
                      <label className="block text-[10px] uppercase tracking-widest text-[#5A5A40]/40 mb-1 font-bold">Recorded By</label>
                      <p className="text-sm font-medium">{selectedTransactionForDetails.createdBy}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      setSelectedTransactionForComments(selectedTransactionForDetails);
                      setSelectedTransactionForDetails(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                    View Comments
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
        {selectedTransactionForComments && flatInfo && (
          <CommentsModal
            transactionId={selectedTransactionForComments.id}
            transactionTitle={selectedTransactionForComments.description || selectedTransactionForComments.category}
            currentUserFlatNo={flatInfo.flatNo}
            currentUserRole={flatInfo.role}
            onClose={() => setSelectedTransactionForComments(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4 text-black">
          <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-md w-full text-center">
            <h2 className="text-2xl font-serif mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message?.startsWith('{') 
                ? "A database error occurred. The developers have been notified."
                : "An unexpected error occurred. Please try refreshing the page."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-zinc-800 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/adminpanel" element={<AdminPanel />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
