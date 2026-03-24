import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
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
  Loader2,
  TrendingUp,
  TrendingDown
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
  name?: string;
  role: 'admin' | 'resident';
  password?: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  createdBy: string;
}

export function AdminPanel() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingNotice, setIsAddingNotice] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense' });
  const [addError, setAddError] = useState("");
  const [noticeError, setNoticeError] = useState("");
  const [categoryError, setCategoryError] = useState("");

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
    const qFlats = query(collection(db, 'flats'), orderBy('flatNo', 'asc'));
    const unsubscribeFlats = onSnapshot(qFlats, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Flat[];
      setFlats(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'flats');
    });

    const qNotices = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubscribeNotices = onSnapshot(qNotices, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notice[];
      setNotices(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notices');
    });

    const qCategories = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'categories');
    });

    return () => {
      unsubscribeFlats();
      unsubscribeNotices();
      unsubscribeCategories();
    };
  }, [isAuthorized]);

  const toggleRole = async (flat: Flat) => {
    const newRole = flat.role === 'admin' ? 'resident' : 'admin';
    try {
      await setDoc(doc(db, 'flats', flat.id), { ...flat, role: newRole }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `flats/${flat.id}`);
    }
  };

  const deleteFlat = async (id: string) => {
    if (window.confirm(t('admin.deleteConfirm').replace('{id}', id))) {
      try {
        await deleteDoc(doc(db, 'flats', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `flats/${id}`);
      }
    }
  };

  const addFlat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError("");
    const formData = new FormData(e.currentTarget);
    const flatNo = (formData.get('flatNo') as string).trim().toUpperCase();
    const name = (formData.get('name') as string).trim();
    const role = formData.get('role') as 'admin' | 'resident';
    const password = formData.get('password') as string;

    if (!flatNo || !password || !name) {
      setAddError(t('admin.errorRequired') || "Please fill all required fields.");
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
      const { getAuth, createUserWithEmailAndPassword, updateProfile, signOut: signOutSecondary } = await import('firebase/auth');
      const firebaseConfig = (await import('../../firebase-applet-config.json')).default;
      
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      
      const email = `${flatNo.toLowerCase()}@building.local`;
      
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
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
        name,
        role
      });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `flats/${flatNo.toLowerCase()}`);
    }
  };

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
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'notices'), {
        title,
        content,
        createdBy: user.email.split('@')[0],
        createdAt: serverTimestamp()
      });
      
      // Trigger notification
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "New Notice",
          message: `${title}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          url: window.location.origin
        })
      }).catch(err => console.error("Notification error:", err));

      setIsAddingNotice(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notices');
    }
  };

  const deleteNotice = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this notice?")) {
      try {
        await deleteDoc(doc(db, 'notices', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `notices/${id}`);
      }
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError("");
    if (!newCategory.name.trim()) {
      setCategoryError("Please enter a category name");
      return;
    }

    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'categories'), {
        name: newCategory.name.trim(),
        type: newCategory.type
      });
      setNewCategory({ name: '', type: 'expense' });
      setIsAddingCategory(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const deleteCategory = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
      }
    }
  };

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
          <h2 className="text-3xl font-serif text-center mb-2">{t('admin.accessDenied') || 'Access Denied'}</h2>
          <p className="text-center text-[#5A5A40]/60 mb-8 text-sm">You must be logged in as an administrator to view this page.</p>
          
          <div className="mt-8 text-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5A5A40] text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#4A4A30] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {t('dash.back') || 'Back'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
                        <p className="text-sm text-[#5A5A40]/80 font-medium">{flat.name || 'No Name'}</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40 mt-1">
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

        <div className="flex items-center justify-between mb-8 mt-12 border-t border-black/5 pt-12">
          <div>
            <h2 className="text-3xl font-serif">Notices</h2>
            <p className="text-[#5A5A40]/60 text-sm">Manage building notices</p>
          </div>
          <button 
            onClick={() => setIsAddingNotice(true)}
            className="bg-[#5A5A40] text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Notice</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {notices.map((notice) => (
              <motion.div 
                key={notice.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 flex flex-col justify-between group hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-serif mb-2">{notice.title}</h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">
                      {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString() : 'Just now'} • By {notice.createdBy}
                    </p>
                  </div>
                  <button 
                    onClick={() => deleteNotice(notice.id)}
                    className="p-2 text-rose-500/20 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[#5A5A40]/80 text-sm whitespace-pre-wrap">{notice.content}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {notices.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#5A5A40]/40">
              No notices found.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mb-8 mt-12 border-t border-black/5 pt-12">
          <div>
            <h2 className="text-3xl font-serif">Categories</h2>
            <p className="text-[#5A5A40]/60 text-sm">Manage income and expense categories</p>
          </div>
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="bg-[#5A5A40] text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Category</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {categories.map((category) => (
              <motion.div 
                key={category.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 flex items-center justify-between group hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    category.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {category.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-[#1A1A1A]">{category.name}</h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">
                      {category.type}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteCategory(category.id)}
                  className="p-2 text-rose-500/20 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {categories.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#5A5A40]/40">
              No categories found.
            </div>
          )}
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
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Name</label>
                  <input 
                    name="name"
                    type="text"
                    required
                    placeholder="Enter resident name"
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
      {/* Add Notice Modal */}
      <AnimatePresence>
        {isAddingNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingNotice(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-serif mb-6">Add Notice</h3>
              
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
                    placeholder="Notice Content"
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingNotice(false)}
                    className="flex-1 py-4 rounded-full font-medium text-[#5A5A40] bg-[#F5F5F0] hover:bg-black/5 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    Post Notice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Category Modal */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCategory(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-serif mb-6">Add New Category</h3>
              <form onSubmit={addCategory} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-2">Category Name</label>
                  <input 
                    type="text"
                    required
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all"
                    placeholder="e.g. Plumbing, Wiring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-2">Type</label>
                  <div className="flex bg-[#F5F5F0] p-1 rounded-2xl">
                    {(['income', 'expense'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewCategory({ ...newCategory, type })}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                          newCategory.type === type ? "bg-[#5A5A40] text-white shadow-sm" : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                {categoryError && <p className="text-rose-500 text-xs font-medium">{categoryError}</p>}
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-[#5A5A40] border border-[#5A5A40]/10 rounded-full hover:bg-[#F5F5F0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-white bg-[#5A5A40] rounded-full hover:bg-[#4A4A30] transition-colors shadow-lg shadow-[#5A5A40]/20"
                  >
                    Add Category
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
