'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithRedirect,
  signOut,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

/**
 * Google sign-in with redirect (works everywhere).
 */
export async function signInWithGoogle(authInstance: Auth): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    // This is crucial for web to keep the user signed in.
    await setPersistence(authInstance, browserLocalPersistence);
    await signInWithRedirect(authInstance, provider);
  } catch (error) {
    console.error('Google sign-in error', error);
    // Using alert for visibility in demo environments
    alert(`Sign-in failed: ${(error as Error).message}`);
  }
}

/**
 * Sign out current user.
 */
export async function signOutUser(authInstance: Auth): Promise<void> {
  try {
    await signOut(authInstance);
  } catch (error) {
    console.error('Sign-out error', error);
  }
}

/** Email/password sign-up */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password);
}

/** Email/password sign-in */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password);
}
