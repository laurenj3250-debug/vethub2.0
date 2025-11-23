'use client';

import { AppointmentSchedule } from '@/components/appointment-schedule/AppointmentSchedule';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

// Neo-pop styling constants
const NEO_BORDER = '2px solid #000';
const NEO_SHADOW = '6px 6px 0 #000';
const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

export default function AppointmentsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
      <header
        className="sticky top-0 z-50"
        style={{ backgroundColor: 'white', borderBottom: NEO_BORDER }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5"
            style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
          >
            <ArrowLeft size={18} />
            Back
          </Link>

          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Calendar size={24} style={{ color: '#2563EB' }} />
            Appointments
          </h1>

          <div className="w-24"></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <AppointmentSchedule />
      </main>
    </div>
  );
}
