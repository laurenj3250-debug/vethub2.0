'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
} from 'firebase/auth';

/**
 * Google sign-in with durable browser session.
 * Call like: signInWithGoogle(auth)
 */
export async function signInWithGoogle(authInstance: Auth): Promise<void> {
  const provider = new GoogleAuthProvider();

  // Ensure auth state sticks across tabs & reloads.
  await setPersistence(authInstance, browserLocalPersistence);

  try {
    await signInWithPopup(authInstance, provider);
  } catch (error) {
    // Don’t crash UI – just log (and you can toast if you want)
    console.error('Google sign-in error', error);
  }
}

/**
 * Optional anonymous sign-in (if you want a temporary session for guests).
 * Call like: initiateAnonymousSignIn(auth)
 */
export async function initiateAnonymousSignIn(authInstance: Auth): Promise<void> {
  try {
    await setPersistence(authInstance, browserLocalPersistence);
    await signInAnonymously(authInstance);
  } catch (error) {
    console.error('Anonymous sign-in error', error);
  }
}

/**
 * Sign out current user.
 * Call like: signOutUser(auth)
 */
export async function signOutUser(authInstance: Auth): Promise<void> {
  try {
    await signOut(authInstance);
  } catch (error) {
    console.error('Sign-out error', error);
  }
}
