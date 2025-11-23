'use client';

import React from 'react';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
}

interface DashboardHeaderProps {
  navItems?: NavItem[];
  onLogout?: () => void;
}

const defaultNavItems: NavItem[] = [
  { label: 'Tasks', href: '/', active: true },
  { label: 'Rounds', href: '/rounding' },
  { label: 'Schedule', href: '/appointments' },
];

export function DashboardHeader({ navItems = defaultNavItems, onLogout }: DashboardHeaderProps) {
  return (
    <header className="relative">
      {/* Main Header */}
      <div className="bg-gradient-to-r from-neo-purple to-neo-lavender px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <span className="text-3xl">🐾</span>
            <span className="text-2xl font-extrabold text-white">VetHub</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-5 py-2.5 rounded-pill
                  font-bold text-sm
                  transition-all duration-200
                  hover:-translate-y-0.5
                  ${item.active
                    ? 'bg-white text-neo-purple'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }
                `}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </Link>
            ))}

            {/* Print Button */}
            <button
              className="
                px-5 py-2.5 rounded-pill
                font-bold text-sm
                bg-white/20 text-white hover:bg-white/30
                transition-all duration-200
                hover:-translate-y-0.5
              "
            >
              🖨️ Print
            </button>

            {/* Tools Button */}
            <button
              className="
                px-5 py-2.5 rounded-pill
                font-bold text-sm
                bg-white/20 text-white hover:bg-white/30
                transition-all duration-200
                hover:-translate-y-0.5
              "
            >
              ⚙️ Tools
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="
                  px-5 py-2.5 rounded-pill
                  font-bold text-sm
                  bg-white/20 text-white hover:bg-white/30
                  transition-all duration-200
                  hover:-translate-y-0.5
                  ml-2
                "
              >
                👋
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Wavy Bottom Edge */}
      <div
        className="absolute bottom-0 left-0 right-0 h-6 bg-neo-cream"
        style={{
          borderRadius: '100% 100% 0 0 / 100% 100% 0 0',
          transform: 'translateY(50%)',
        }}
      />
    </header>
  );
}
