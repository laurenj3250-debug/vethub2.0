// In your component, REMOVE this entire useEffect block:
/*
useEffect(() => {
  if (!user && !isUserLoading) {
    initiateAnonymousSignIn(auth);
  }
}, [user, isUserLoading, auth]);
*/

// Also REMOVE this import:
// import { initiateAnonymousSignIn } from '@/firebase';

// Your component should look like this:

export default function VetPatientTracker() {
  const { firestore, auth, user, isUserLoading } = useFirebase();

  // Remove the anonymous sign-in useEffect - delete it completely!

  // Firestore queries scoped to user
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/patients`));
  }, [firestore, user]);
  const patientsRes = useCollection(patientsQuery);
  const patients = patientsRes?.data ?? [];
  const isLoadingPatients = patientsRes?.isLoading ?? false;

  // ... rest of your queries ...

  // ... rest of your component code ...

  // Loading screen
  if (isUserLoading || isLoadingPatients || isLoadingGeneralTasks) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700">Loading VetCare Hub...</p>
        </div>
      </div>
    );
  }

  // Not signed in - show sign-in screen
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            RBVH Patient Task Manager
          </h1>
          <p className="text-gray-600 mb-8">
            Sign in with your Google account to access your patient dashboard
          </p>
          <button 
            onClick={() => signInWithGoogle(auth)} 
            className="w-full px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-3 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Your data is private and only accessible to you
          </p>
        </div>
      </div>
    );
  }

  // User is signed in - show the main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">RBVH Patient Task Manager</h1>
              <p className="text-gray-600">Track tasks and prep rounding sheets</p>
            </div>
            <div className="flex items-center gap-4">
              {/* ... your expand/collapse buttons ... */}
              
              {/* ... your view mode toggle ... */}

              {/* User info and sign out */}
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{user.displayName || 'User'}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <button 
                  onClick={() => signOutUser(auth)} 
                  className="px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Rest of your header content (Add patient form, etc.) */}
        </div>

        {/* Rest of your app content */}
      </div>
    </div>
  );
}