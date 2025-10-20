'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

/**
 * Initiates Google Sign-In process.
 * @param authInstance The Firebase Auth instance.
 */
export function signInWithGoogle(authInstance: Auth): void {
  const provider = new GoogleAuthProvider();
  signInWithPopup(authInstance, provider).catch((error) => {
    console.error("Google sign-in error", error);
    // Optionally, show a toast or message to the user
  });
}

/**
 * Signs out the current user.
 * @param authInstance The Firebase Auth instance.
 */
export function signOutUser(authInstance: Auth): void {
  signOut(authInstance).catch((error) => {
    console.error("Sign-out error", error);
    // Optionally, show a toast or message to the user
  });
}
