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
  // Added: 12-hour expiration logic
  useEffect(() => {
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

    const checkExpiry = async (user) => {
      if (!user) return true; // Already logged out

      const loginTime = localStorage.getItem('auth_login_time');
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        if (elapsed > TWELVE_HOURS_MS) {
          await signOut(auth);
          localStorage.removeItem('auth_login_time');
          return true; // Session expired
        }
      } else {
        // Logged in but no timestamp — set one for continuity
        localStorage.setItem('auth_login_time', Date.now().toString());
      }
      return false; // Valid session
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const isExpired = await checkExpiry(firebaseUser);
      
      if (!isExpired && firebaseUser) {
        setCurrentUser(buildUserProfile(firebaseUser));
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    // Background interval to check for expiry every minute (if tab stays open)
    const intervalId = setInterval(() => {
      if (auth.currentUser) {
        checkExpiry(auth.currentUser).then(expired => {
          if (expired) setCurrentUser(null);
        });
      }
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Store login time to enforce 12h session limit
      localStorage.setItem('auth_login_time', Date.now().toString());
      return { success: true };
    } catch (err) {
      return { success: false, error: friendlyError(err.code) };
    }
  };

  const logout = async () => {
    localStorage.removeItem('auth_login_time');
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
