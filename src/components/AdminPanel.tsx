import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  Users,
  Plus,
  Trash2,
  Shield,
  LogOut,
  ArrowLeft,
  Loader2,
  Bell,
  Tag,
  Pin,
  AlertCircle,
  X,
  Wrench,
  Zap,
  Building2,
  Droplets,
  Car,
  Flame,
  Package,
  Wifi,
  TreePine,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --------------- Types ---------------
interface Flat {
  id: string;
  flatNo: string;
  role: 'admin' | 'resident';
}

interface Notice {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: Timestamp;
  isPinned: boolean;
}

interface Category {
  id: string;
  name: string;
  iconName: string;
  order: number;
}

// --------------- Icon Map ---------------
const ICON_OPTIONS = [
  { name: 'wrench', label: 'Wrench', Icon: Wrench },
  { name: 'zap', label: 'Electric', Icon: Zap },
  { name: 'building', label: 'Building', Icon: Building2 },
  { name: 'shield', label: 'Security', Icon: Shield },
  { name: 'droplets', label: 'Water', Icon: Droplets },
  { name: 'flame', label: 'Gas', Icon: Flame },
  { name: 'car', label: 'Parking', Icon: Car },
  { name: 'wifi', label: 'Internet', Icon: Wifi },
  { name: 'treepine', label: 'Garden', Icon: TreePine },
  { name: 'package', label: 'Supplies', Icon: Package },
  { name: 'star', label: 'Special', Icon: Star },
  { name: 'tag', label: 'Other', Icon: Tag },
];

export function getIconByName(name: string) {
  return ICON_OPTIONS.find((o) => o.name === name)?.Icon ?? Tag;
}

const DEFAULT_CATEGORIES = [
  { name: 'Plumbing', iconName: 'wrench', order: 0 },
  { name: 'Wiring', iconName: 'zap', order: 1 },
  { name: 'Maintenance', iconName: 'building', order: 2 },
  { name: 'Security', iconName: 'shield', order: 3 },
  { name: 'Cleaning', iconName: 'building', order: 4 },
  { name: 'Others', iconName: 'tag', order: 5 },
];

type TabId = 'residents' | 'notices' | 'categories';

// ==================== MAIN COMPONENT ====================
export function AdminPanel() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('residents');

  const { t, language, setLanguage } = useLanguage();

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.email) {
        if (u.email === 'manthankansagra@gmail.com' || u.email === 'admin@building.local') {
          setIsAuthorized(true);
        } else {
          try {
            const flatId = u.email.split('@')[0];
            const docSnap = await getDoc(doc(db, 'flats', flatId));
            if (docSnap.exists() && docSnap.data().role === 'admin') {
              setIsAuthorized(true);
            }
          } catch (err) {
            console.error('Error checking admin status:', err);
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F0]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-xl border border-black/5 text-center"
        >
          <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="text-[#5A5A40] w-8 h-8" />
          </div>
          <h2 className="text-3xl font-serif text-center mb-2">Access Denied</h2>
          <p className="text-center text-[#5A5A40]/60 mb-8 text-sm">
            You must be logged in as an administrator to view this page.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5A5A40] text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#4A4A30] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </motion.div>
      </div>
    );
  }

  const flatNo = user?.email?.split('@')[0]?.toUpperCase() ?? 'Admin';

  return (
    <div className="min-h-screen bg-[#F5F5F0] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center overflow-hidden">
              <img
                src="https://raw.githubusercontent.com/acegikmo135/assets/main/vbub4efh.jpg"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-serif">{t('admin.title')}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#5A5A40]/40 font-bold">
                {t('dash.adminPanel')}
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
              to="/"
              className="text-sm font-medium text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors"
            >
              {t('admin.back')}
            </Link>
            <button
              onClick={() => signOut(auth)}
              className="p-2 text-[#5A5A40]/40 hover:text-rose-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 pb-0">
          {(
            [
              { id: 'residents', label: 'Residents', Icon: Users },
              { id: 'notices', label: 'Notices', Icon: Bell },
              { id: 'categories', label: 'Categories', Icon: Tag },
            ] as { id: TabId; label: string; Icon: React.ElementType }[]
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all',
                activeTab === id
                  ? 'border-[#5A5A40] text-[#5A5A40]'
                  : 'border-transparent text-[#5A5A40]/40 hover:text-[#5A5A40]/70'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'residents' && (
            <motion.div
              key="residents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ResidentsTab t={t} />
            </motion.div>
          )}
          {activeTab === 'notices' && (
            <motion.div
              key="notices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <NoticesTab flatNo={flatNo} />
            </motion.div>
          )}
          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CategoriesTab />
            </motion.div>
          )}
        </AnimatePresence>
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
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=dev@manthank.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] border border-[#5A5A40]/20 px-6 py-3 rounded-full hover:bg-[#F5F5F0] transition-colors"
          >
            Email Support
          </a>
        </div>
      </footer>
    </div>
  );
}

// ==================== RESIDENTS TAB ====================
function ResidentsTab({ t }: { t: (key: string) => string }) {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'flats'), orderBy('flatNo', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Flat[];
      setFlats(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleRole = async (flat: Flat) => {
    const newRole = flat.role === 'admin' ? 'resident' : 'admin';
    try {
      await setDoc(doc(db, 'flats', flat.id), { ...flat, role: newRole }, { merge: true });
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const deleteFlat = async (id: string) => {
    if (window.confirm(t('admin.deleteConfirm').replace('{id}', id))) {
      try {
        await deleteDoc(doc(db, 'flats', id));
      } catch (err) {
        console.error('Error deleting flat:', err);
      }
    }
  };

  const addFlat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError('');
    const formData = new FormData(e.currentTarget);
    const flatNo = (formData.get('flatNo') as string).trim().toUpperCase();
    const role = formData.get('role') as 'admin' | 'resident';
    const password = formData.get('password') as string;

    if (!flatNo || !password) {
      setAddError(t('admin.errorRequired'));
      return;
    }
    if (password.length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }

    try {
      const { initializeApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword, signOut: signOutSecondary } = await import('firebase/auth');
      const firebaseConfig = (await import('../../firebase-applet-config.json')).default;
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp' + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      const email = `${flatNo.toLowerCase()}@building.local`;

      try {
        await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await signOutSecondary(secondaryAuth);
      } catch (authErr: any) {
        if (authErr.code !== 'auth/email-already-in-use') throw authErr;
      }

      await setDoc(doc(db, 'flats', flatNo.toLowerCase()), { flatNo, role });
      setIsAdding(false);
    } catch (err: any) {
      setAddError(err.message || t('admin.errorAdd'));
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif">{t('admin.flats')}</h2>
          <p className="text-[#5A5A40]/60 text-sm">{t('admin.manage')}</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-[#5A5A40] text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('admin.addFlat')}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {flats.map((flat) => (
              <motion.div
                key={flat.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center',
                        flat.role === 'admin'
                          ? 'bg-[#5A5A40] text-white'
                          : 'bg-[#F5F5F0] text-[#5A5A40]'
                      )}
                    >
                      {flat.role === 'admin' ? (
                        <Shield className="w-6 h-6" />
                      ) : (
                        <Users className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-serif">{flat.flatNo}</h3>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">
                        {flat.role === 'admin' ? t('admin.admin') : t('admin.resident')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteFlat(flat.id)}
                    className="p-2 text-rose-500/20 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => toggleRole(flat)}
                  className={cn(
                    'w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all border',
                    flat.role === 'admin'
                      ? 'border-rose-500/20 text-rose-500 hover:bg-rose-50'
                      : 'border-[#5A5A40]/20 text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white'
                  )}
                >
                  {flat.role === 'admin' ? t('admin.demote') : t('admin.promote')}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Flat Modal */}
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
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-serif mb-6">{t('admin.addNew')}</h3>
              {addError && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-medium">
                  {addError}
                </div>
              )}
              <form onSubmit={addFlat} className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">
                    {t('login.flatNo')}
                  </label>
                  <input
                    name="flatNo"
                    type="text"
                    required
                    placeholder={t('admin.flatNoPlaceholder')}
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">
                    {t('login.password')}
                  </label>
                  <input
                    name="password"
                    type="text"
                    required
                    placeholder={t('admin.passwordPlaceholder')}
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">
                    {t('admin.initialRole')}
                  </label>
                  <div className="flex gap-2 p-1 bg-[#F5F5F0] rounded-2xl">
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="role" value="resident" defaultChecked className="peer sr-only" />
                      <div className="py-3 rounded-xl text-center text-xs font-bold uppercase tracking-widest transition-all peer-checked:bg-[#5A5A40] peer-checked:text-white text-[#5A5A40]/40">
                        {t('admin.resident')}
                      </div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="role" value="admin" className="peer sr-only" />
                      <div className="py-3 rounded-xl text-center text-xs font-bold uppercase tracking-widest transition-all peer-checked:bg-[#5A5A40] peer-checked:text-white text-[#5A5A40]/40">
                        {t('admin.admin')}
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
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
                    {t('admin.saveFlat')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== NOTICES TAB ====================
function NoticesTab({ flatNo }: { flatNo: string }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Notice[];
      data.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
      setNotices(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'notices'), {
        title: title.trim(),
        content: content.trim(),
        createdBy: flatNo,
        createdAt: serverTimestamp(),
        isPinned: false,
      });
      setTitle('');
      setContent('');
      setIsAdding(false);
    } catch (err: any) {
      setError('Failed to post notice. Check Firestore permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (notice: Notice) => {
    try {
      await updateDoc(doc(db, 'notices', notice.id), { isPinned: !notice.isPinned });
    } catch (err) {
      console.error('Pin error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notices', id));
      setDeletingId(null);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif">Notice Board</h2>
          <p className="text-[#5A5A40]/60 text-sm">Post and manage building announcements.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-[#5A5A40] text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Post Notice</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-black/5 p-16 text-center">
          <Bell className="w-12 h-12 text-[#5A5A40]/20 mx-auto mb-4" />
          <p className="text-[#5A5A40]/40 font-serif text-xl">No notices yet</p>
          <p className="text-xs text-[#5A5A40]/30 mt-2 uppercase tracking-widest">Post the first notice above</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {notices.map((notice) => (
              <motion.div
                key={notice.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'bg-white rounded-[24px] border p-6 shadow-sm',
                  notice.isPinned ? 'border-[#5A5A40]/20 bg-[#5A5A40]/[0.02]' : 'border-black/5'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {notice.isPinned && (
                        <span className="inline-flex items-center gap-1 bg-[#5A5A40] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                      <h3 className="font-serif text-xl text-[#1A1A1A]">{notice.title}</h3>
                    </div>
                    <p className="text-sm text-[#1A1A1A]/70 leading-relaxed whitespace-pre-wrap">
                      {notice.content}
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <span className="text-[10px] uppercase tracking-widest text-[#5A5A40]/40 font-medium">
                        By {notice.createdBy}
                      </span>
                      {notice.createdAt && (
                        <span className="text-[10px] text-[#5A5A40]/30">
                          {format(notice.createdAt.toDate(), 'MMM d, yyyy • h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => togglePin(notice)}
                      title={notice.isPinned ? 'Unpin' : 'Pin to top'}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
                        notice.isPinned
                          ? 'bg-[#5A5A40] text-white hover:bg-[#4A4A30]'
                          : 'bg-[#F5F5F0] text-[#5A5A40]/60 hover:text-[#5A5A40] hover:bg-[#5A5A40]/10'
                      )}
                    >
                      <Pin className="w-3.5 h-3.5" />
                      {notice.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => setDeletingId(notice.id)}
                      className="p-2 rounded-xl text-rose-400/40 hover:text-rose-500 hover:bg-rose-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Notice Modal */}
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-serif">Post Notice</h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors text-[#5A5A40]/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-2xl text-sm mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <form onSubmit={handleAdd} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">
                    Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Notice title..."
                    className="w-full px-5 py-3.5 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">
                    Message
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={4}
                    placeholder="Write your announcement here..."
                    className="w-full px-5 py-3.5 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    Post Notice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-xl font-serif mb-2">Delete Notice?</h3>
              <p className="text-sm text-[#5A5A40]/60 mb-8">This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="flex-1 bg-rose-500 text-white py-3 rounded-full font-medium hover:bg-rose-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== CATEGORIES TAB ====================
function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('tag');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Category[];
      setCategories(data);
      setLoading(false);

      // Seed defaults if empty
      if (data.length === 0 && !seeded) {
        setSeeded(true);
        try {
          for (const cat of DEFAULT_CATEGORIES) {
            await addDoc(collection(db, 'categories'), cat);
          }
        } catch (err) {
          console.error('Seeding categories failed:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.order ?? 0), -1);
      await addDoc(collection(db, 'categories'), {
        name: newName.trim(),
        iconName: newIcon,
        order: maxOrder + 1,
      });
      setNewName('');
      setNewIcon('tag');
      setIsAdding(false);
    } catch (err: any) {
      setError('Failed to add category. Check Firestore permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"? Existing transactions will keep their category label.`)) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (err) {
      console.error('Delete category error:', err);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif">Expense Categories</h2>
          <p className="text-[#5A5A40]/60 text-sm">Manage the categories used when logging expenses.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-[#5A5A40] text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Category</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {categories.map((cat) => {
              const IconComponent = getIconByName(cat.iconName);
              return (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white p-5 rounded-[24px] shadow-sm border border-black/5 flex items-center justify-between hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F5F5F0] rounded-2xl flex items-center justify-center text-[#5A5A40] group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A1A]">{cat.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/40">{cat.iconName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-2 rounded-xl text-rose-400/0 group-hover:text-rose-400/40 hover:!text-rose-500 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Category Modal */}
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
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-serif">Add Category</h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors text-[#5A5A40]/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-2xl text-sm mb-4">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <form onSubmit={handleAdd} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">
                    Category Name
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    placeholder="e.g. Lift Maintenance"
                    className="w-full px-5 py-3.5 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-3 font-medium">
                    Icon
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {ICON_OPTIONS.map(({ name, label, Icon }) => (
                      <button
                        key={name}
                        type="button"
                        title={label}
                        onClick={() => setNewIcon(name)}
                        className={cn(
                          'w-full aspect-square rounded-2xl flex items-center justify-center transition-all',
                          newIcon === name
                            ? 'bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20'
                            : 'bg-[#F5F5F0] text-[#5A5A40]/50 hover:bg-[#5A5A40]/10 hover:text-[#5A5A40]'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                    Add Category
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
