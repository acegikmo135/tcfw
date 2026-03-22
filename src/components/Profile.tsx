import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updatePassword, updateProfile, User } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowLeft, Key, User as UserIcon, Loader2, CheckCircle2, Fingerprint } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasPasskey, setHasPasskey] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.displayName || '');
        
        // Also fetch name from firestore to be safe
        try {
          const flatId = currentUser.email?.split('@')[0] || '';
          if (flatId) {
            const flatDoc = await getDoc(doc(db, 'flats', flatId));
            if (flatDoc.exists()) {
              if (flatDoc.data().name) setName(flatDoc.data().name);
              if (flatDoc.data().passkeyEnabled) setHasPasskey(true);
            }
          }
        } catch (err) {
          console.error("Error fetching flat data:", err);
        }
        
      } else {
        navigate('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update Auth Profile
      if (name !== user.displayName) {
        await updateProfile(user, { displayName: name });
        // Update Firestore
        const flatId = user.email?.split('@')[0] || '';
        if (flatId) {
          await updateDoc(doc(db, 'flats', flatId), { name });
        }
      }

      // Update Password
      if (newPassword) {
        await updatePassword(user, newPassword);
        setNewPassword('');
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile. You may need to re-authenticate to change your password.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPasskey = async () => {
    if (!user) return;
    setError('');
    setSuccess('');

    try {
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser.");
      }

      // 1. Get options from server
      const optionsRes = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      
      if (!optionsRes.ok) throw new Error("Failed to get registration options");
      const options = await optionsRes.json();

      // 2. Convert options for navigator.credentials.create
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
        user: {
          ...options.user,
          id: Uint8Array.from(options.user.id, c => c.charCodeAt(0))
        }
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as any;

      if (credential) {
        // 3. Verify with server
        const flatId = user.email?.split('@')[0] || '';
        const verifyRes = await fetch("/api/auth/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            flatId,
            attestationResponse: {
              id: credential.id,
              rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
              response: {
                attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
                clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON)))
              }
            }
          })
        });

        if (!verifyRes.ok) throw new Error("Failed to verify passkey registration");

        setHasPasskey(true);
        setSuccess('Passkey added successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message.includes('Permissions Policy')) {
        setError('Passkeys are restricted in this preview window. Please open the app in a new tab to add a passkey.');
      } else {
        setError('Failed to add passkey: ' + (err.message || 'Unknown error'));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      <header className="bg-white border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-20 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-[#F5F5F0] rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-[#5A5A40]" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif">Profile Settings</h1>
            <p className="text-sm text-[#5A5A40]/60">Manage your account details</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5"
        >
          {error && (
            <div className="mb-8 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-8 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {success}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-8">
            <div>
              <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-[#5A5A40]" />
                Personal Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Email (Flat Number)</label>
                  <input 
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-6 py-4 bg-[#F5F5F0] text-[#5A5A40]/60 border-none rounded-2xl outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Name</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-black/5">
              <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                <Key className="w-5 h-5 text-[#5A5A40]" />
                Security
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">New Password</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-6 py-4 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#5A5A40]/20 outline-none transition-all"
                  />
                  <p className="text-xs text-[#5A5A40]/60 mt-2">
                    Note: You may need to sign out and sign back in to change your password for security reasons.
                  </p>
                </div>

                <div className="pt-4">
                  <label className="block text-xs uppercase tracking-widest text-[#5A5A40] mb-2 font-medium">Passkey Authentication</label>
                  <div className="flex items-center justify-between bg-[#F5F5F0] p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Fingerprint className="w-5 h-5 text-[#5A5A40]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">Sign in with Passkey</p>
                        <p className="text-xs text-[#5A5A40]/60">Use your device's fingerprint, face, or screen lock</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPasskey}
                      disabled={hasPasskey}
                      className="px-4 py-2 bg-white text-[#5A5A40] text-sm font-bold uppercase tracking-widest rounded-full shadow-sm hover:bg-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black/5"
                    >
                      {hasPasskey ? 'Added' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="bg-[#5A5A40] text-white px-8 py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#5A5A40]/20"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
