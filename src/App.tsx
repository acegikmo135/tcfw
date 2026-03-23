import React, { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { 
  Bell, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Filter,
  ChevronRight,
  Calendar,
  User,
  Info,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Settings,
  Trash2,
  Edit2,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  limit,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Transaction, Notice, Category, Comment, UserProfile } from './types';
import { format } from 'date-fns';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // OneSignal Init
  useEffect(() => {
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: import.meta.env.VITE_ONESIGNAL_APP_ID || '',
          allowLocalhostAsSecureOrigin: true,
        });
      } catch (err) {
        console.error('OneSignal Init Error:', err);
      }
    };
    initOneSignal();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch or create user profile
        const userDoc = doc(db, 'users', firebaseUser.uid);
        onSnapshot(userDoc, (snapshot) => {
          if (snapshot.exists()) {
            setUser({ ...snapshot.data() } as UserProfile);
          } else {
            // New user, default to resident
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              role: 'resident',
              photoURL: firebaseUser.photoURL || ''
            };
            addDoc(collection(db, 'users'), newUser);
          }
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    const qNotices = query(collection(db, 'notices'), orderBy('date', 'desc'), limit(10));
    const unsubscribeNotices = onSnapshot(qNotices, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
    });

    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(20));
    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    const qCategories = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    return () => {
      unsubscribeNotices();
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, []);

  const sendNotification = async (title: string, message: string, url: string = '/') => {
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, url })
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
            <CreditCard size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">The Courtyard F wing</h1>
            <p className="text-slate-500 mt-2">Please sign in to access the building dashboard</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">The Courtyard F wing</h1>
            <p className="text-xs text-slate-500 font-medium">Building Management Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <button 
                onClick={() => setShowAdminPanel(true)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
              >
                <Settings size={20} />
              </button>
            )}
            <button className="p-2 rounded-full hover:bg-slate-100 relative">
              <Bell size={20} className="text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt={user.displayName} /> : user.displayName.charAt(0)}
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Total Expense Section */}
        <section id="total-expense">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Expenses (Last 6 Months)</p>
                  <h2 className="text-3xl font-bold text-slate-900">₹{transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}</h2>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-medium">
                  <TrendingUp size={16} />
                  <span>12.5%</span>
                </div>
              </div>
              
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={transactions.slice(0, 6).map(t => ({ name: format(new Date(t.date), 'MMM'), amount: t.amount }))}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CreditCard size={20} />
                  </div>
                  <MoreVertical size={20} className="opacity-60" />
                </div>
                <p className="text-indigo-100 text-sm font-medium mb-1">Available Funds</p>
                <h3 className="text-2xl font-bold mb-6">₹8,42,500</h3>
                <div className="flex items-center justify-between text-xs text-indigo-100">
                  <span>Society Account</span>
                  <span>**** 4290</span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending Dues</p>
                    <p className="text-lg font-bold text-slate-900">₹12,400</p>
                  </div>
                </div>
                <button className="w-full py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
                  View Details
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Building Notice Section - POSITIONED BETWEEN EXPENSE AND TRANSACTIONS */}
        <section id="building-notices" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bell size={20} className="text-indigo-600" />
              Building Notices
            </h2>
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notices.map((notice, index) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group`}
              >
                {/* Accent Bar */}
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  notice.type === 'warning' ? 'bg-amber-500' : 
                  notice.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'
                }`} />

                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${
                    notice.type === 'warning' ? 'bg-amber-50 text-amber-600' : 
                    notice.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {notice.type === 'warning' ? <AlertTriangle size={18} /> : 
                     notice.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {format(new Date(notice.date), 'dd MMM yyyy')}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {notice.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                  {notice.content}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {notice.author.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-slate-500">{notice.author}</span>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400">
                    <MessageSquare size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Transactions Section */}
        <section id="recent-transactions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard size={20} className="text-indigo-600" />
              Recent Transactions
            </h2>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm">
                <Search size={18} />
              </button>
              <button className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {transactions.map((tx, index) => (
                <motion.div 
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + (index * 0.05) }}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {tx.type === 'income' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{tx.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-slate-400">{tx.category}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-xs font-medium text-slate-400">{format(new Date(tx.date), 'dd MMM')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
            <button className="w-full py-4 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all border-t border-slate-100">
              View All Transactions
            </button>
          </div>
        </section>
      </main>

      {/* Floating Action Button */}
      {user.role === 'admin' && (
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddTransaction(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center z-20"
        >
          <Plus size={28} />
        </motion.button>
      )}

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTransaction(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">New Transaction</h3>
                <button onClick={() => setShowAddTransaction(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  title: formData.get('title') as string,
                  amount: Number(formData.get('amount')),
                  type: formData.get('type') as 'income' | 'expense',
                  category: formData.get('category') as string,
                  date: new Date().toISOString(),
                  status: 'completed',
                  creatorUid: user.uid,
                  createdBy: user.displayName
                };
                await addDoc(collection(db, 'transactions'), data);
                await sendNotification('New Transaction', `A new ${data.type} of ₹${data.amount} for ${data.title} has been recorded.`);
                setShowAddTransaction(false);
              }} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</label>
                  <input name="title" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Lift Maintenance" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                    <input name="amount" type="number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
                    <select name="type" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <select name="category" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  Record Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel / Category Manager */}
      <AnimatePresence>
        {showAdminPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminPanel(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Admin Panel</h3>
                <button onClick={() => setShowAdminPanel(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowCategoryManager(true)}
                    className="p-6 bg-indigo-50 rounded-2xl text-left hover:bg-indigo-100 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm group-hover:scale-110 transition-transform">
                      <Filter size={24} />
                    </div>
                    <h4 className="font-bold text-slate-900">Manage Categories</h4>
                    <p className="text-xs text-slate-500 mt-1">Add, edit or delete transaction categories</p>
                  </button>
                  <button 
                    onClick={() => setShowAddNotice(true)}
                    className="p-6 bg-emerald-50 rounded-2xl text-left hover:bg-emerald-100 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm group-hover:scale-110 transition-transform">
                      <Bell size={24} />
                    </div>
                    <h4 className="font-bold text-slate-900">Post New Notice</h4>
                    <p className="text-xs text-slate-500 mt-1">Broadcast important updates to residents</p>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Manager Modal */}
      <AnimatePresence>
        {showCategoryManager && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryManager(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Manage Categories</h3>
                <button onClick={() => setShowCategoryManager(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {cat.type === 'income' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{cat.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{cat.type}</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        if (confirm('Delete this category?')) {
                          await deleteDoc(doc(db, 'categories', cat.id));
                        }
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  type: formData.get('type') as 'income' | 'expense'
                };
                await addDoc(collection(db, 'categories'), data);
                e.currentTarget.reset();
              }} className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
                <input name="name" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="New category name" />
                <div className="flex gap-2">
                  <select name="type" className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                  <button type="submit" className="px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
                    Add
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Notice Modal */}
      <AnimatePresence>
        {showAddNotice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddNotice(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Post New Notice</h3>
                <button onClick={() => setShowAddNotice(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  title: formData.get('title') as string,
                  content: formData.get('content') as string,
                  type: formData.get('type') as 'info' | 'warning' | 'success',
                  date: new Date().toISOString(),
                  author: user.displayName,
                  authorUid: user.uid
                };
                await addDoc(collection(db, 'notices'), data);
                await sendNotification('New Notice: ' + data.title, data.content.substring(0, 100) + '...');
                setShowAddNotice(false);
              }} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</label>
                  <input name="title" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Notice Title" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
                  <select name="type" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="info">Information</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Content</label>
                  <textarea name="content" required rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Write notice details here..." />
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  Post Notice
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-3 flex items-center justify-between md:hidden z-20">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <TrendingUp size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('notices')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'notices' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Bell size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Notices</span>
        </button>
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <CreditCard size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Wallet</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <User size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
