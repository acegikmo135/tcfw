import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User 
} from 'firebase/auth';
import { 
  Users, 
  Plus, 
  Trash2, 
  Shield, 
  LogOut, 
  Lock,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Flat {
  id: string;
  flatNo: string;
  role: 'admin' | 'resident';
  password?: string;
}

const ADMIN_PASSWORD = "admin123"; // Updated password

export function AdminPanel() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const { t, language, setLanguage } = useLanguage();

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
            console.error("Error checking admin status:", err);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    const q = query(collection(db, 'flats'), orderBy('flatNo', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Flat[];
      setFlats(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAuthorized]);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      try {
        await signInWithEmailAndPassword(auth, 'admin@building.local', ADMIN_PASSWORD);
        setIsAuthorized(true);
        setError("");
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          try {
            await createUserWithEmailAndPassword(auth, 'admin@building.local', ADMIN_PASSWORD);
            await setDoc(doc(db, 'flats', 'admin'), {
              flatNo: 'ADMIN',
              role: 'admin',
              password: ADMIN_PASSWORD
            });
            setIsAuthorized(true);
            setError("");
          } catch (createErr) {
            console.error("Error creating admin user:", createErr);
            setError(t('admin.errorAuth'));
          }
        } else {
          console.error("Error signing in admin:", err);
          setError(t('admin.errorAuth'));
        }
      }
    } else {
      setError(t('admin.errorAuth'));
    }
  };

  const toggleRole = async (flat: Flat) => {
    const newRole = flat.role === 'admin' ? 'resident' : 'admin';
    try {
      await setDoc(doc(db, 'flats', flat.id), { ...flat, role: newRole }, { merge: true });
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const deleteFlat = async (id: string) => {
    if (window.confirm(t('admin.deleteConfirm').replace('{id}', id))) {
      try {
        await deleteDoc(doc(db, 'flats', id));
      } catch (err) {
        console.error("Error deleting flat:", err);
      }
    }
  };

  const addFlat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError("");
    const formData = new FormData(e.currentTarget);
    const flatNo = (formData.get('flatNo') as string).trim().toUpperCase();
    const role = formData.get('role') as 'admin' | 'resident';
    const password = formData.get('password') as string;

    if (!flatNo || !password) {
      setAddError(t('admin.errorRequired'));
      return;
    }

    try {
      if (!user) {
        throw new Error("Not authenticated");
      }
      await setDoc(doc(db, 'flats', flatNo.toLowerCase()), {
        flatNo,
        role,
        password
      });
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding flat:", err);
      setAddError(t('admin.errorAdd'));
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F0]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-xl border border-black/5"
        >
          <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-[#5A5A40] w-8 h-8" />
          </div>
          <h2 className="text-3xl font-serif text-center mb-2">{t('admin.access')}</h2>
          <p className="text-center text-[#5A5A40]/60 mb-8 text-sm">{t('admin.subtitle')}</p>
          
          <form onSubmit={handleAuthorize} className="space-y-6">
            <div>
              <input 
                type="password"
                placeholder={t('admin.masterPass')}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none text-center text-lg tracking-widest"
                autoFocus
              />
              {error && <p className="text-rose-500 text-xs mt-2 text-center font-medium">{error}</p>}
            </div>
            <button 
              type="submit"
              className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
            >
              {t('admin.authorize')}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <Link to="/" className="text-[#5A5A40]/40 hover:text-[#5A5A40] text-xs font-medium flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              {t('admin.back')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center overflow-hidden">
              <img src="https://raw.githubusercontent.com/acegikmo135/assets/main/vbub4efh.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-serif">{t('admin.title')}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#5A5A40]/40 font-bold">{t('dash.adminPanel')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === 'en' ? 'gu' : 'en')}
              className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors"
            >
              {language === 'en' ? 'GU' : 'EN'}
            </button>
            <Link to="/" className="text-sm font-medium text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors">
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
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
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
                  className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 flex flex-col justify-between group hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        flat.role === 'admin' ? "bg-[#5A5A40] text-white" : "bg-[#F5F5F0] text-[#5A5A40]"
                      )}>
                        {flat.role === 'admin' ? <Shield className="w-6 h-6" /> : <Users className="w-6 h-6" />}
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

                  <div className="space-y-4">
                    <div className="bg-[#F5F5F0] p-4 rounded-2xl">
                      <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/40 font-bold mb-1">{t('admin.accessPass')}</p>
                      <p className="font-mono text-sm tracking-widest">{flat.password || '••••••••'}</p>
                    </div>

                    <button 
                      onClick={() => toggleRole(flat)}
                      className={cn(
                        "w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all border",
                        flat.role === 'admin' 
                          ? "border-rose-500/20 text-rose-500 hover:bg-rose-50" 
                          : "border-[#5A5A40]/20 text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white"
                      )}
                    >
                      {flat.role === 'admin' ? t('admin.demote') : t('admin.promote')}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

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
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('login.flatNo')}</label>
                  <input 
                    name="flatNo"
                    type="text"
                    required
                    placeholder={t('admin.flatNoPlaceholder')}
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('login.password')}</label>
                  <input 
                    name="password"
                    type="text"
                    required
                    placeholder={t('admin.passwordPlaceholder')}
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">{t('admin.initialRole')}</label>
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
    </div>
  );
}
