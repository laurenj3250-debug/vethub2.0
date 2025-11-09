'use client';

import React, { useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Trash2, AlertCircle, Check } from 'lucide-react';

/**
 * Deduplication Utility Component
 *
 * This component helps remove duplicate entries from Firebase collections
 * by comparing titles, names, or categories and keeping only unique items.
 */
export default function DeduplicateData() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const deduplicateCollection = async (
    collectionName: string,
    uniqueKey: string // The field to use for deduplication (e.g., 'title', 'name', 'category')
  ) => {
    if (!firestore || !user) return 0;

    const collectionRef = collection(firestore, `users/${user.uid}/${collectionName}`);
    const snapshot = await getDocs(collectionRef);
    const docs = snapshot.docs;

    // Group documents by their unique key
    const groups = new Map<string, any[]>();
    docs.forEach(doc => {
      const data = doc.data();
      const key = data[uniqueKey];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push({ id: doc.id, ...data });
    });

    // Find duplicates (groups with more than one document)
    const batch = writeBatch(firestore);
    let deletedCount = 0;

    groups.forEach((items, key) => {
      if (items.length > 1) {
        // Keep the first one, delete the rest
        for (let i = 1; i < items.length; i++) {
          const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, items[i].id);
          batch.delete(docRef);
          deletedCount++;
        }
      }
    });

    if (deletedCount > 0) {
      await batch.commit();
    }

    return deletedCount;
  };

  const handleDeduplicate = async () => {
    if (!firestore || !user) {
      alert('Not logged in or Firestore not initialized');
      return;
    }

    if (!confirm('This will remove duplicate entries from all collections. Continue?')) {
      return;
    }

    setIsDeduplicating(true);
    setResults([]);
    setShowResults(true);

    try {
      // Deduplicate each collection
      const collections = [
        { name: 'quickTips', key: 'title' },
        { name: 'workups', key: 'title' },
        { name: 'medicationCategories', key: 'category' },
        { name: 'normalValues', key: 'category' },
        { name: 'commonMedications', key: 'name' },
        { name: 'commonComments', key: 'name' },
        { name: 'commonProblems', key: 'name' },
      ];

      const newResults: string[] = [];

      for (const { name, key } of collections) {
        const deletedCount = await deduplicateCollection(name, key);
        if (deletedCount > 0) {
          newResults.push(`✓ Removed ${deletedCount} duplicate(s) from ${name}`);
        } else {
          newResults.push(`✓ No duplicates found in ${name}`);
        }
      }

      setResults(newResults);
    } catch (error: any) {
      console.error('Deduplication error:', error);
      alert(`Error during deduplication: ${error.message}`);
    } finally {
      setIsDeduplicating(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-bold text-red-900 mb-1">Data Cleanup Tool</h3>
          <p className="text-sm text-red-700 mb-3">
            If you're seeing duplicate entries in your reference guide, click the button below to remove them.
            This will keep only one copy of each unique item.
          </p>
          <button
            onClick={handleDeduplicate}
            disabled={isDeduplicating}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold"
          >
            {isDeduplicating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Removing duplicates...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Remove Duplicate Data
              </>
            )}
          </button>

          {showResults && results.length > 0 && (
            <div className="mt-4 p-3 bg-white rounded border border-red-200">
              <h4 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
                <Check className="text-green-600" size={16} />
                Cleanup Results:
              </h4>
              <div className="space-y-1">
                {results.map((result, idx) => (
                  <p key={idx} className="text-xs text-gray-700">{result}</p>
                ))}
              </div>
              <p className="text-xs text-green-700 font-semibold mt-3">
                ✓ Cleanup complete! Refresh the page to see the updated data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
