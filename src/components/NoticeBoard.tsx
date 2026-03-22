import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, Pin, Trash2, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Notice {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: Timestamp;
  isPinned: boolean;
}

interface NoticeBoardProps {
  isAdmin: boolean;
  flatNo: string;
}

export function NoticeBoard({ isAdmin, flatNo }: NoticeBoardProps) {
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
      // Pinned first, then by date
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

  const handleAddNotice = async (e: React.FormEvent) => {
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
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#5A5A40]" />
          </div>
          <div>
            <h2 className="text-2xl font-serif text-[#1A1A1A]">Notice Board</h2>
            <p className="text-xs uppercase tracking-widest text-[#5A5A40]/50 font-medium">
              Building Announcements
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-[#5A5A40] text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#4A4A30] transition-colors shadow-lg shadow-[#5A5A40]/20"
          >
            <Plus className="w-4 h-4" />
            Post Notice
          </button>
        )}
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40]" />
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-black/5 p-10 text-center">
          <Bell className="w-10 h-10 text-[#5A5A40]/20 mx-auto mb-3" />
          <p className="text-[#5A5A40]/40 font-serif text-lg">No notices yet</p>
          {isAdmin && (
            <p className="text-xs text-[#5A5A40]/30 mt-1 uppercase tracking-widest">
              Post the first notice above
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {notices.map((notice) => (
              <motion.div
                key={notice.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'bg-white rounded-[24px] border p-5 shadow-sm transition-all',
                  notice.isPinned
                    ? 'border-[#5A5A40]/20 bg-[#5A5A40]/[0.02]'
                    : 'border-black/5'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {notice.isPinned && (
                        <span className="inline-flex items-center gap-1 bg-[#5A5A40] text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                      <h3 className="font-serif text-lg text-[#1A1A1A] leading-tight">
                        {notice.title}
                      </h3>
                    </div>
                    <p className="text-sm text-[#1A1A1A]/70 leading-relaxed whitespace-pre-wrap">
                      {notice.content}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] uppercase tracking-widest text-[#5A5A40]/40 font-medium">
                        By {notice.createdBy}
                      </span>
                      {notice.createdAt && (
                        <span className="text-[10px] text-[#5A5A40]/30">
                          {format(notice.createdAt.toDate(), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => togglePin(notice)}
                        title={notice.isPinned ? 'Unpin' : 'Pin'}
                        className={cn(
                          'p-2 rounded-xl transition-all',
                          notice.isPinned
                            ? 'bg-[#5A5A40] text-white hover:bg-[#4A4A30]'
                            : 'text-[#5A5A40]/30 hover:text-[#5A5A40] hover:bg-[#F5F5F0]'
                        )}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(notice.id)}
                        className="p-2 rounded-xl text-rose-400/40 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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

              <form onSubmit={handleAddNotice} className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">
                    Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Notice title..."
                    className="w-full px-5 py-3.5 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none text-[#1A1A1A] placeholder:text-[#5A5A40]/30"
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
                    className="w-full px-5 py-3.5 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none resize-none text-[#1A1A1A] placeholder:text-[#5A5A40]/30"
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
    </section>
  );
}
