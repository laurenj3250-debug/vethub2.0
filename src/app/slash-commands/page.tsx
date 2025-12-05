'use client';

import { SlashCommandManager } from '@/components/SlashCommandManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SlashCommandsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/rounding"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Rounding</span>
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="text-xl font-bold text-gray-900">Slash Commands</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6">
        <SlashCommandManager />
      </div>
    </div>
  );
}
