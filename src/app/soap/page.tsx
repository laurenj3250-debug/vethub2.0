'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

export default function SOAPBuilderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-purple-400 transition rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-purple-500/30"
            >
              <ArrowLeft size={18} />
              Back to VetHub
            </Link>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
            <FileText size={24} />
            SOAP Builder
          </h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-12 text-center">
          <div className="text-6xl mb-6">🏗️</div>
          <h2 className="text-3xl font-bold text-white mb-4">SOAP Builder - Under Construction</h2>
          <p className="text-slate-400 text-lg mb-6">
            The SOAP Builder is being moved to its own page for better performance.
          </p>
          <p className="text-slate-500 text-sm">
            This feature will be available soon. For now, please use the main VetHub page.
          </p>
        </div>
      </main>
    </div>
  );
}
