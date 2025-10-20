'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  Auth,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentReference,
  DocumentData,
  Firestore,
  Query,
  onSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';

// ============================================
// FIREBASE CONFIGURATION - YOUR PROJECT
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDQuWjzERjmaHPg5gOcBMhQktkGQtX0w0s",
  authDomain: "studio-7953091324-ebe83.firebaseapp.com",
  projectId: "studio-7953091324-ebe83",
  storageBucket: "studio-7953091324-ebe83.firebasestorage.app",
  messagingSenderId: "145084129999",
  appId: "1:145084129999:web:YOUR_APP_ID"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  firestore = getFirestore(app);
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export const initiateAnonymousSignIn = async (authInstance: Auth) => {
  try {
    const result = await signInAnonymously(authInstance);
    console.log('✅ Anonymous sign-in successful:', result.user.uid);
    return result.user;
  } catch (error: any) {
    console.error('❌ Anonymous sign-in error:', error.code, error.message);
    return null;
  }
};

// Google Sign-In with Popup (default)
export const signInWithGoogle = async (authInstance: Auth) => {
  try {
    console.log('🔄 Starting Google sign-in...');
    const provider = new GoogleAuthProvider();
    
    // Optional: Force account selection
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(authInstance, provider);
    console.log('✅ Google sign-in successful:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('❌ Google sign-in error:', error.code, error.message);
    
    // Handle specific errors with user-friendly messages
    if (error.code === 'auth/popup-blocked') {
      alert('⚠️ Pop-up was blocked!\n\nPlease:\n1. Allow pop-ups for this site\n2. Or try clicking the button again');
    } else if (error.code === 'auth/popup-closed-by-user') {
      console.log('ℹ️ User closed the sign-in popup');
    } else if (error.code === 'auth/unauthorized-domain') {
      alert('⚠️ Domain not authorized!\n\nPlease add this domain in:\nFirebase Console → Authentication → Settings → Authorized domains');
    } else if (error.code === 'auth/operation-not-allowed') {
      alert('⚠️ Google sign-in is not enabled!\n\nPlease enable it in:\nFirebase Console → Authentication → Sign-in method → Google');
    } else {
      alert(`Sign-in failed: ${error.message}`);
    }
    
    throw error;
  }
};

// Google Sign-In with Redirect (for mobile or popup issues)
export const signInWithGoogleRedirect = async (authInstance: Auth) => {
  try {
    console.log('🔄 Starting Google redirect sign-in...');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    await signInWithRedirect(authInstance, provider);
  } catch (error: any) {
    console.error('❌ Google redirect error:', error.code, error.message);
    throw error;
  }
};

// Handle redirect result (must be called on component mount if using redirect)
export const handleRedirectResult = async (authInstance: Auth) => {
  try {
    const result = await getRedirectResult(authInstance);
    if (result) {
      console.log('✅ Redirect sign-in successful:', result.user.email);
      return result.user;
    }
  } catch (error: any) {
    console.error('❌ Redirect result error:', error.code, error.message);
    alert(`Sign-in failed: ${error.message}`);
  }
  return null;
};

export const signOutUser = async (authInstance: Auth) => {
  try {
    await signOut(authInstance);
    console.log('✅ Sign-out successful');
  } catch (error: any) {
    console.error('❌ Sign-out error:', error.code, error.message);
  }
};

// ============================================
// FIRESTORE FUNCTIONS
// ============================================

export const addDocumentNonBlocking = async (
  collectionRef: any,
  data: DocumentData
): Promise<DocumentReference | null> => {
  try {
    const docRef = await addDoc(collectionRef, data);
    return docRef;
  } catch (error) {
    console.error('Error adding document:', error);
    return null;
  }
};

export const updateDocumentNonBlocking = async (
  docRef: DocumentReference,
  data: Partial<DocumentData>
): Promise<void> => {
  try {
    await updateDoc(docRef, data);
  } catch (error) {
    console.error('Error updating document:', error);
  }
};

export const deleteDocumentNonBlocking = async (
  docRef: DocumentReference
): Promise<void> => {
  try {
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting document:', error);
  }
};

// ============================================
// REACT HOOKS
// ============================================

export const useFirebase = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handle redirect result on mount
    handleRedirectResult(auth).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsUserLoading(false);
      if (currentUser) {
        console.log('✅ User authenticated:', currentUser.uid, currentUser.email || 'anonymous');
      } else {
        console.log('ℹ️ No user authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    firestore,
    auth,
    user,
    isUserLoading,
  };
};

export const useMemoFirebase = <T,>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps);
};

export const useCollection = (query: Query | null) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(documents);
        setIsLoading(false);
      },
      (err) => {
        console.error('Firestore query error:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, isLoading, error };
};

export { auth, firestore };