'use client';

import { AppointmentSchedule } from '@/components/appointment-schedule/AppointmentSchedule';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AppointmentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-cyan-400 transition rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-cyan-500/30"
            >
              <ArrowLeft size={18} />
              Back to VetHub
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Appointment Schedule</h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6">
          <AppointmentSchedule />
        </div>
      </main>
    </div>
  );
}
