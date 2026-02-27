import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

// Map Firebase email → display name
const USER_DISPLAY_NAMES = {
  'adnan@scalepods.co':  { username: 'Adnan',  initials: 'AD', role: 'Admin' },
  'adnan@scalepods.com':  { username: 'Adnan',  initials: 'AD', role: 'Admin' },
  'raunak@scalepods.co': { username: 'Raunak', initials: 'RA', role: 'Admin' },
  'raunak@scalepods.com': { username: 'Raunak', initials: 'RA', role: 'Admin' },
};

function buildUserProfile(firebaseUser) {
  if (!firebaseUser) return null;
  const profile = USER_DISPLAY_NAMES[firebaseUser.email?.toLowerCase()] || {
    username: firebaseUser.email,
    initials: firebaseUser.email?.slice(0, 2).toUpperCase(),
    role: 'User',
  };
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    ...profile,
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to Firebase auth state — persists sessions automatically via Firebase SDK
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCurrentUser(buildUserProfile(firebaseUser));
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err) {
      return { success: false, error: friendlyError(err.code) };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return { success: false, error: 'Not authenticated.' };
    try {
      // Re-authenticate first (Firebase requires this before sensitive ops)
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      return { success: true };
    } catch (err) {
      return { success: false, error: friendlyError(err.code) };
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
