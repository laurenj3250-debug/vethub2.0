import type { RoundsPatient, VisitType, VisitTypeColors } from './types';

// ===== DATE HELPERS =====

export function daysSince(isoDate: string, today: Date = new Date()): number {
  if (!isoDate) return Infinity;
  return Math.floor((today.getTime() - new Date(isoDate).getTime()) / 86400000);
}

export function monthsSince(isoDate: string, today: Date = new Date()): number | string {
  if (!isoDate) return '—';
  return Math.floor(daysSince(isoDate, today) / 30.44);
}

// ===== LAB STATUS =====

export function labStatus(
  isoDate: string | undefined,
  thresholdDays: number,
  today: Date = new Date()
): { text: string; color: string } {
  if (!isoDate) return { text: '—', color: '#8AAFAD' };
  const days = daysSince(isoDate, today);
  const months = Math.floor(days / 30.44);
  if (days >= thresholdDays) {
    return {
      text: `DUE (${months}mo)`,
      color: days >= 365 ? '#D4644A' : '#B07030',
    };
  }
  return { text: `${months}mo`, color: '#5A7D52' };
}

// ===== OVERDUE LABS =====

export function hasOverdueLabs(p: RoundsPatient, today: Date = new Date()): boolean {
  const dxLower = (p.dx || '').toLowerCase();
  const isSeizure = dxLower.includes('seizure') || dxLower.includes('epilepsy');
  if (!p.lastCBC && isSeizure) return true;
  if (p.lastCBC && daysSince(p.lastCBC, today) >= 365) return true;
  if (p.lastPhenoDate && daysSince(p.lastPhenoDate, today) >= 180) return true;
  if (p.lastKBrDate && daysSince(p.lastKBrDate, today) >= 180) return true;
  return false;
}

// ===== VISIT TYPE =====

export function isSurgical(surgery: string | undefined): boolean {
  return !!surgery && ![
    'Medical Management',
    'Medical Management Trial',
    'Initial Consultation',
    'Initial Evaluation',
  ].includes(surgery);
}

export function getVisitType(p: RoundsPatient): VisitType {
  if (isSurgical(p.surgery)) return 'postop';
  if (p.surgery === 'Initial Consultation' || p.surgery === 'Initial Evaluation') return 'consult';
  return 'medmgmt';
}

export const VISIT_TYPE_COLORS: Record<VisitType, VisitTypeColors> = {
  medmgmt: { stripe: '#7B8FA1', bg: 'rgba(90,120,150,0.07)', border: 'rgba(90,120,150,0.2)', text: '#4A6178' },
  postop: { stripe: '#8FAD82', bg: 'rgba(107,127,94,0.10)', border: 'rgba(107,127,94,0.3)', text: '#5E6B52' },
  consult: { stripe: '#D4AA28', bg: 'rgba(212,170,40,0.09)', border: 'rgba(212,170,40,0.3)', text: '#8B6914' },
};

// ===== TEXT PARSING =====

export function extractVisitDate(text: string): { dateHeader: string | null; summary: string } {
  const m = text.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|rDVM[^:]*):?\s*/);
  if (m) return { dateHeader: m[1], summary: text.slice(m[0].length) };
  return { dateHeader: null, summary: text };
}

export function stripMriPrefix(text: string): string {
  return text.replace(/^MRI\s*[:\-–—\s]*/i, '');
}

export function isNoImaging(text: string): boolean {
  const stripped = stripMriPrefix(text);
  return !stripped || /^none\.?$/i.test(stripped);
}

export function parseMeds(medsString: string): string[] {
  return medsString.split(',').map(m => m.trim()).filter(Boolean);
}

export function parseNeedsToday(needsString: string): { line1: string; line2: string | null } {
  const parts = needsString.split(' · ');
  return { line1: parts[0] || '', line2: parts[1] || null };
}

export function parseTime(timeString: string): { time: string; period: string } {
  const parts = timeString.split(' ');
  return { time: parts[0], period: parts[1] || '' };
}

export function isSeizurePatient(dx: string): boolean {
  const lower = dx.toLowerCase();
  return lower.includes('seizure') || lower.includes('epilepsy');
}

export function shouldShowPhenoRow(p: RoundsPatient): boolean {
  return !!p.lastPhenoDate || (isSeizurePatient(p.dx) && !p.bromideOnly);
}

export function shouldShowBromideRow(p: RoundsPatient): boolean {
  return !!p.lastKBrDate || !!p.onKBr;
}

// ===== HELPERS =====

export function splitImagingByDate(imagingText: string): Array<{ dateLabel: string | null; findings: string }> {
  const stripped = stripMriPrefix(imagingText);
  if (!stripped || /^none\.?$/i.test(stripped)) return [];

  // Split on " Prior:", " Hx:", or ". XX/XX:" patterns
  const blocks: Array<{ dateLabel: string | null; findings: string }> = [];

  // Try splitting on Prior: and Hx:
  const parts = stripped.split(/\s+(?=Prior:|Hx:)/);

  if (parts.length > 1) {
    parts.forEach((part, i) => {
      const dateMatch = part.match(/^(Prior:\s*|Hx:\s*)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[:\-–—]\s*/);
      if (dateMatch) {
        const prefix = dateMatch[1] || '';
        blocks.push({
          dateLabel: prefix + dateMatch[2],
          findings: part.slice(dateMatch[0].length).trim(),
        });
      } else if (i === 0) {
        // First block - try to extract date
        const firstDate = part.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[:\-–—]\s*/);
        if (firstDate) {
          blocks.push({ dateLabel: firstDate[1], findings: part.slice(firstDate[0].length).trim() });
        } else {
          blocks.push({ dateLabel: null, findings: part.trim() });
        }
      } else {
        blocks.push({ dateLabel: null, findings: part.trim() });
      }
    });
    return blocks;
  }

  // No split needed — single block
  return [{ dateLabel: null, findings: stripped }];
}

// ===== HTML SANITIZATION =====

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch]);
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
