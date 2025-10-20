'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

export async function signInWithGoogle(authInstance: Auth): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await setPersistence(authInstance, browserLocalPersistence);
    console.log('🔄 Attempting popup sign-in...');
    await signInWithPopup(authInstance, provider);
    console.log('✅ Popup sign-in successful');
  } catch (error: any) {
    console.error('❌ Popup failed:', error.code);
    
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      console.log('🔀 Switching to redirect...');
      try {
        await signInWithRedirect(authInstance, provider);
      } catch (redirectError) {
        console.error('❌ Redirect also failed:', redirectError);
        alert('Sign-in failed. Please try again.');
      }
    } else {
      alert(`Sign-in failed: ${error.message}`);
    }
  }
}

export async function signOutUser(authInstance: Auth): Promise<void> {
  try {
    await signOut(authInstance);
    console.log('✅ Sign-out successful');
  } catch (error) {
    console.error('❌ Sign-out error', error);
  }
}

export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password)
    .catch(error => {
      console.error("❌ Sign-up error", error);
      alert(`Account creation failed: ${error.message}`);
    });
}

export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch(error => {
      console.error("❌ Sign-in error", error);
      alert(`Sign-in failed: ${error.message}`);
    });
}

    