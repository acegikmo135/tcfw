import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Trash2, Send, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Comment {
  id: string;
  text: string;
  createdBy: string;
  createdAt: Timestamp;
  role: 'admin' | 'resident';
}

interface CommentsModalProps {
  transactionId: string;
  transactionTitle: string;
  currentUserFlatNo: string;
  currentUserRole: 'admin' | 'resident';
  onClose: () => void;
}

export function CommentsModal({ transactionId, transactionTitle, currentUserFlatNo, currentUserRole, onClose }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions', transactionId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(data);
      setLoading(false);
    }, (error: any) => {
      handleFirestoreError(error, OperationType.GET, `transactions/${transactionId}/comments`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [transactionId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions', transactionId, 'comments'), {
        text: newComment.trim(),
        createdBy: currentUserFlatNo.toLowerCase(),
        role: currentUserRole,
        createdAt: serverTimestamp()
      });
      
      // Update comment count on parent transaction
      await updateDoc(doc(db, 'transactions', transactionId), {
        commentCount: increment(1)
      });
      
      // Trigger notification
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New Comment on ${transactionTitle}`,
          message: `${currentUserFlatNo}: ${newComment.trim().substring(0, 50)}${newComment.trim().length > 50 ? '...' : ''}`,
          url: window.location.origin
        })
      }).catch((err) => console.error("Notification error:", err));

      setNewComment('');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `transactions/${transactionId}/comments`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', transactionId, 'comments', commentId));
      
      // Update comment count on parent transaction
      await updateDoc(doc(db, 'transactions', transactionId), {
        commentCount: increment(-1)
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${transactionId}/comments/${commentId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-serif">Comments</h3>
            <p className="text-xs text-[#5A5A40]/60 uppercase tracking-widest mt-1">{transactionTitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#5A5A40]/60 hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F5F5F0]/50">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40]" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-[#5A5A40]/40 italic font-serif">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => {
              const isOwnComment = comment.createdBy === currentUserFlatNo;
              const isAdmin = comment.role === 'admin';
              
              return (
                <div 
                  key={comment.id} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    isOwnComment ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-baseline gap-2 mb-1 px-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#5A5A40]/60">
                      {comment.createdBy}
                    </span>
                    {isAdmin && (
                      <span className="text-[7px] font-bold uppercase tracking-widest text-white bg-[#5A5A40] px-1 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                    <span className="text-[9px] text-[#5A5A40]/40">
                      {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                    </span>
                  </div>
                  
                  <div className={cn(
                    "relative group p-3 rounded-2xl text-sm",
                    isOwnComment 
                      ? "bg-[#5A5A40] text-white rounded-tr-sm" 
                      : "bg-white border border-black/5 text-[#1A1A1A] rounded-tl-sm"
                  )}>
                    <p className="whitespace-pre-wrap break-words">{comment.text}</p>
                    
                    {(isOwnComment || currentUserRole === 'admin') && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all",
                          isOwnComment 
                            ? "-left-10 text-rose-500 hover:bg-rose-50" 
                            : "-right-10 text-rose-500 hover:bg-rose-50"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-black/5 bg-white rounded-b-[32px]">
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="p-3 bg-[#5A5A40] text-white rounded-2xl hover:bg-[#4A4A30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
