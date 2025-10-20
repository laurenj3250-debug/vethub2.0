'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
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
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
  apiKey: 'AIzaSyDQuWjzERjmaHPg5gOcBMhQktkGQtX0w0s',
  authDomain: 'studio-7953091324-ebe83.firebaseapp.com',
  projectId: 'studio-7953091324-ebe83',
  storageBucket: 'studio-7953091324-ebe83.firebasestorage.app',
  messagingSenderId: '145084129999',
  appId: '1:145084129999:web:32c6c14152b45ebed00dba',
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  firestore = getFirestore(app);

  setPersistence(auth, browserLocalPersistence).catch((e) => {
    console.warn('Auth persistence could not be set:', e?.code || e);
  });
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

let signInInProgress = false;

export const signInWithGoogle = async (authInstance: Auth) => {
  if (signInInProgress) {
    console.log('⏳ Sign-in already in progress...');
    return authInstance.currentUser || null;
  }

  signInInProgress = true;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    console.log('🔄 Starting Google sign-in with redirect...');
    await signInWithRedirect(authInstance, provider);
    return null;
  } catch (error: any) {
    console.error('❌ Sign-in error:', error.code, error.message);
    
    if (error.code === 'auth/unauthorized-domain') {
      alert('Domain not authorized. Add this domain in Firebase Console → Authentication → Settings → Authorized domains.');
    } else if (error.code === 'auth/operation-not-allowed') {
      alert('Google sign-in not enabled. Enable in Firebase Console → Authentication → Sign-in method → Google.');
    } else {
      alert(`Sign-in failed: ${error.message}`);
    }
    
    throw error;
  } finally {
    signInInProgress = false;
  }
};

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

export const deleteDocumentNonBlocking = async (docRef: DocumentReference): Promise<void> => {
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
    handleRedirectResult(auth).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsUserLoading(false);
      if (currentUser) {
        console.log('✅ User authenticated:', currentUser.email);
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

export const useMemoFirebase = <T,>(factory: () => T, deps: React.DependencyList): T => {
  return useMemo(factory, deps);
};

export const useCollection = (queryRef: Query | null) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!queryRef) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      queryRef,
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
  }, [queryRef]);

  return { data, isLoading, error };
};

export { auth, firestore };