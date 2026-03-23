import React, { useState } from 'react';
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
  ArrowDownRight
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

// Mock Data
const MOCK_EXPENSES = [
  { name: 'Jan', amount: 45000 },
  { name: 'Feb', amount: 52000 },
  { name: 'Mar', amount: 48000 },
  { name: 'Apr', amount: 61000 },
  { name: 'May', amount: 55000 },
  { name: 'Jun', amount: 67000 },
];

const MOCK_NOTICES = [
  {
    id: '1',
    title: 'Water Supply Maintenance',
    content: 'Please note that water supply will be interrupted on Sunday from 10 AM to 2 PM for tank cleaning.',
    type: 'warning',
    date: '2026-03-22',
    author: 'Admin'
  },
  {
    id: '2',
    title: 'Annual General Meeting',
    content: 'The AGM is scheduled for next Saturday at 5 PM in the community hall. All residents are requested to attend.',
    type: 'info',
    date: '2026-03-20',
    author: 'Society Secretary'
  },
  {
    id: '3',
    title: 'Security Update',
    content: 'New security protocols have been implemented at the main gate. Please ensure your visitors are registered.',
    type: 'success',
    date: '2026-03-18',
    author: 'Security Head'
  }
];

const MOCK_TRANSACTIONS = [
  {
    id: '1',
    title: 'Lift Maintenance',
    amount: 12500,
    type: 'expense',
    category: 'Maintenance',
    date: '2026-03-22',
    status: 'completed'
  },
  {
    id: '2',
    title: 'Security Salary',
    amount: 45000,
    type: 'expense',
    category: 'Staff',
    date: '2026-03-21',
    status: 'completed'
  },
  {
    id: '3',
    title: 'Maintenance Collection',
    amount: 150000,
    type: 'income',
    category: 'Collection',
    date: '2026-03-20',
    status: 'completed'
  },
  {
    id: '4',
    title: 'Electricity Bill',
    amount: 8200,
    type: 'expense',
    category: 'Utilities',
    date: '2026-03-19',
    status: 'pending'
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

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
            <button className="p-2 rounded-full hover:bg-slate-100 relative">
              <Bell size={20} className="text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              MK
            </div>
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
                  <h2 className="text-3xl font-bold text-slate-900">₹3,28,000</h2>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-medium">
                  <TrendingUp size={16} />
                  <span>12.5%</span>
                </div>
              </div>
              
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_EXPENSES}>
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
            {MOCK_NOTICES.map((notice, index) => (
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
                    {notice.date}
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
                    <ChevronRight size={16} />
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
              {MOCK_TRANSACTIONS.map((tx, index) => (
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
                        <span className="text-xs font-medium text-slate-400">{tx.date}</span>
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
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center z-20"
      >
        <Plus size={28} />
      </motion.button>

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
