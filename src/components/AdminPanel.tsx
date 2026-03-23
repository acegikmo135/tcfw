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

export function AdminPanel() {
  const [isAuthorized, setIsAuthorized] = useState(false);
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

    if (password.length < 6) {
      setAddError("Password must be at least 6 characters.");
      return;
    }

    try {
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Create user in Firebase Auth using a secondary app
      const { initializeApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword, signOut: signOutSecondary } = await import('firebase/auth');
      const firebaseConfig = (await import('../../firebase-applet-config.json')).default;
      
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      
      const email = `${flatNo.toLowerCase()}@building.local`;
      
      try {
        await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await signOutSecondary(secondaryAuth);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // User already exists in Auth, we can just update their role in Firestore
          console.log("User already exists in Auth, updating Firestore only.");
          alert(`Note: The user ${flatNo} already exists in the authentication system. Their password was NOT changed. If they forgot their password, they cannot be reset from this panel without a real email address.`);
        } else {
          throw authErr;
        }
      }

      await setDoc(doc(db, 'flats', flatNo.toLowerCase()), {
        flatNo,
        role
      });
      setIsAdding(false);
    } catch (err: any) {
      console.error("Error adding flat:", err);
      setAddError(err.message || t('admin.errorAdd'));
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-black/5 text-center"
        >
          <div className="w-16 h-16 bg-blue-700/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="text-blue-700 w-8 h-8" />
          </div>
          <h2 className="text-3xl font-sans font-bold text-center mb-2">{t('admin.accessDenied') || 'Access Denied'}</h2>
          <p className="text-center text-blue-700/60 mb-8 text-sm">You must be logged in as an administrator to view this page.</p>
          
          <div className="mt-8 text-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-blue-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {t('dash.back') || 'Back'}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="https://raw.githubusercontent.com/acegikmo135/assets/main/vbub4efh.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-sans font-bold">{t('admin.title')}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-700/40 font-bold">{t('dash.adminPanel')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === 'en' ? 'gu' : 'en')}
              className="text-xs font-bold uppercase tracking-widest text-blue-700/60 hover:text-blue-700 transition-colors"
            >
              {language === 'en' ? 'GU' : 'EN'}
            </button>
            <Link to="/" className="text-sm font-bold text-blue-700/60 hover:text-blue-700 transition-colors">
              {t('admin.back')}
            </Link>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 text-blue-700/40 hover:text-rose-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-sans font-bold">{t('admin.flats')}</h2>
            <p className="text-blue-700/60 text-sm">{t('admin.manage')}</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-700 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('admin.addFlat')}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
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
                  className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex flex-col justify-between group hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        flat.role === 'admin' ? "bg-blue-700 text-white" : "bg-gray-50 text-blue-700"
                      )}>
                        {flat.role === 'admin' ? <Shield className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-sans font-bold">{flat.flatNo}</h3>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-blue-700/40">
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
                    <button 
                      onClick={() => toggleRole(flat)}
                      className={cn(
                        "w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all border",
                        flat.role === 'admin' 
                          ? "border-rose-500/20 text-rose-500 hover:bg-rose-50" 
                          : "border-blue-700/20 text-blue-700 hover:bg-blue-700 hover:text-white"
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

      <footer className="max-w-5xl mx-auto px-4 py-8 border-t border-black/5 mt-8 text-center">
        <p className="text-sm font-sans font-bold text-blue-700 mb-4">Made by Manthan - F602</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="https://manthank.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-widest text-white bg-blue-700 px-6 py-3 rounded-full hover:bg-blue-800 transition-colors shadow-sm"
          >
            Visit Website
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-blue-700/60">If any issue, contact dev@manthank.com</span>
            <a 
              href="https://mail.google.com/mail/?view=cm&fs=1&to=dev@manthank.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-widest text-blue-700 border border-blue-700/20 px-6 py-3 rounded-full hover:bg-gray-50 transition-colors"
            >
              Email Support
            </a>
          </div>
        </div>
      </footer>

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
              className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-sans font-bold mb-6">{t('admin.addNew')}</h3>
              
              {addError && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold">
                  {addError}
                </div>
              )}

              <form onSubmit={addFlat} className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-blue-700 mb-2 font-bold">{t('login.flatNo')}</label>
                  <input 
                    name="flatNo"
                    type="text"
                    required
                    placeholder={t('admin.flatNoPlaceholder')}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-blue-700 mb-2 font-bold">{t('login.password')}</label>
                  <input 
                    name="password"
                    type="text"
                    required
                    placeholder={t('admin.passwordPlaceholder')}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-blue-700 mb-2 font-bold">{t('admin.initialRole')}</label>
                  <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="role" value="resident" defaultChecked className="peer sr-only" />
                      <div className="py-3 rounded-lg text-center text-xs font-bold uppercase tracking-widest transition-all peer-checked:bg-blue-700 peer-checked:text-white text-blue-700/40">
                        {t('admin.resident')}
                      </div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="role" value="admin" className="peer sr-only" />
                      <div className="py-3 rounded-lg text-center text-xs font-bold uppercase tracking-widest transition-all peer-checked:bg-blue-700 peer-checked:text-white text-blue-700/40">
                        {t('admin.admin')}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-full font-bold text-blue-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-700 text-white py-4 rounded-full font-bold hover:bg-blue-800 transition-colors"
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
