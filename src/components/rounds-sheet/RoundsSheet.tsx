'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RoundsPatient } from './types';
import { renderTableRows, renderHeader } from './renderer';
import { THEME_PRESETS, DEFAULT_THEME_INDEX } from './themes';
import { STICKER_CATEGORIES } from './stickers';
import { hexToRgba } from './clinical-logic';

export default function RoundsSheet() {
  const [patients, setPatients] = useState<RoundsPatient[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [pastePreview, setPastePreview] = useState<{ count: number; names: string[]; overdue: number } | null>(null);

  // Theme state
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME_INDEX);
  const [rowOpacity, setRowOpacity] = useState(62);
  const [overlayOpacity, setOverlayOpacity] = useState(10);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgTile, setBgTile] = useState(false);
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [customTitle, setCustomTitle] = useState('Neurology Rounds');
  const [footerText, setFooterText] = useState('');
  const [watermarkEmoji, setWatermarkEmoji] = useState('');
  const [pageBorder, setPageBorder] = useState(false);
  const [gradColor1, setGradColor1] = useState('#B8E0EA');
  const [gradColor2, setGradColor2] = useState('#E8D0F0');
  const [gradAngle, setGradAngle] = useState(135);
  const [gradOpacity, setGradOpacity] = useState(40);
  const [customHeader, setCustomHeader] = useState('#5BC0BE');
  const [customLab, setCustomLab] = useState('#A8DCD8');
  const [customConsult, setCustomConsult] = useState('#FFF5D6');

  // Panel state
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>('themes');
  const [stickerDockOpen, setStickerDockOpen] = useState(false);

  // Sticker state
  const [activeStickerCat, setActiveStickerCat] = useState('🌊 Ocean');
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);
  const [stickerSize, setStickerSize] = useState(36);
  const [stickerOpacity, setStickerOpacity] = useState(60);
  const [randomRotation, setRandomRotation] = useState(true);
  const [scatterCount, setScatterCount] = useState(30);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{ pidx: number; field: string; value: string; rect: DOMRect } | null>(null);

  // Emoji multi-select for sticker bomb
  const [bombEmojis, setBombEmojis] = useState<Set<string>>(new Set());

  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const stickerLayerRef = useRef<HTMLDivElement>(null);
  const lastScatterCount = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  // Auto-load saved sheet on mount
  useEffect(() => {
    if (!mounted) return;
    const loadSaved = async () => {
      try {
        const todayDate = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/rounds-sheets?date=${todayDate}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.patients && Array.isArray(data.patients) && data.patients.length > 0) {
          setPatients(data.patients);
          setLastSaved(new Date(data.updatedAt));
          // Restore settings if saved
          if (data.settings) {
            const s = data.settings;
            if (s.activeTheme !== undefined) setActiveTheme(s.activeTheme);
            if (s.rowOpacity !== undefined) setRowOpacity(s.rowOpacity);
            if (s.overlayOpacity !== undefined) setOverlayOpacity(s.overlayOpacity);
            if (s.customTitle) setCustomTitle(s.customTitle);
            if (s.footerText !== undefined) setFooterText(s.footerText);
            if (s.watermarkEmoji !== undefined) setWatermarkEmoji(s.watermarkEmoji);
            if (s.pageBorder !== undefined) setPageBorder(s.pageBorder);
            if (s.gradColor1) setGradColor1(s.gradColor1);
            if (s.gradColor2) setGradColor2(s.gradColor2);
            if (s.gradAngle !== undefined) setGradAngle(s.gradAngle);
            if (s.gradOpacity !== undefined) setGradOpacity(s.gradOpacity);
            if (s.customHeader) setCustomHeader(s.customHeader);
            if (s.customLab) setCustomLab(s.customLab);
            if (s.customConsult) setCustomConsult(s.customConsult);
          }
        }
      } catch { /* No saved sheet, that's fine */ }
    };
    loadSaved();
  }, [mounted]);

  // Save to server
  const saveSheet = useCallback(async () => {
    if (patients.length === 0) return;
    setSaveStatus('saving');
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/rounds-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayDate,
          patients,
          settings: {
            activeTheme, rowOpacity, overlayOpacity, customTitle, footerText,
            watermarkEmoji, pageBorder, gradColor1, gradColor2, gradAngle,
            gradOpacity, customHeader, customLab, customConsult,
          },
        }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [patients, activeTheme, rowOpacity, overlayOpacity, customTitle, footerText,
      watermarkEmoji, pageBorder, gradColor1, gradColor2, gradAngle, gradOpacity,
      customHeader, customLab, customConsult]);

  // Row management
  const deletePatient = (index: number) => {
    setPatients(prev => prev.filter((_, i) => i !== index));
  };

  const movePatient = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= patients.length) return;
    setPatients(prev => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  // Ctrl+Z / Cmd+Z to undo last sticker
  useEffect(() => {
    if (!mounted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoStickers();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted]);

  // Paste preview — parse pasteText for preview before loading
  useEffect(() => {
    if (!pasteText.trim()) { setPastePreview(null); return; }
    try {
      const parsed = JSON.parse(pasteText);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
        const overdueCount = parsed.filter((p: any) => {
          const dx = (p.dx || '').toLowerCase();
          const isSz = dx.includes('seizure') || dx.includes('epilepsy');
          if (!p.lastCBC && isSz) return true;
          const cbcDays = p.lastCBC ? Math.floor((Date.now() - new Date(p.lastCBC).getTime()) / 86400000) : Infinity;
          if (cbcDays >= 365) return true;
          if (p.lastPhenoDate) { const d = Math.floor((Date.now() - new Date(p.lastPhenoDate).getTime()) / 86400000); if (d >= 180) return true; }
          if (p.lastKBrDate) { const d = Math.floor((Date.now() - new Date(p.lastKBrDate).getTime()) / 86400000); if (d >= 180) return true; }
          return false;
        }).length;
        setPastePreview({ count: parsed.length, names: parsed.map((p: any) => p.name), overdue: overdueCount });
      } else { setPastePreview(null); }
    } catch { setPastePreview(null); }
  }, [pasteText]);

  // Apply theme via CSS custom properties
  const applyTheme = useCallback((idx: number, opacity?: number) => {
    const t = THEME_PRESETS[idx];
    if (!t) return;
    const op = (opacity ?? rowOpacity) / 100;
    const s = document.documentElement.style;
    s.setProperty('--header-bg', hexToRgba(t.hd, 0.75)); // spec: ~75%
    s.setProperty('--row-even', `linear-gradient(90deg,${hexToRgba(t.evL, op)},${hexToRgba(t.evR, op)})`);
    s.setProperty('--row-odd', `linear-gradient(90deg,${hexToRgba(t.odL, op)},${hexToRgba(t.odR, op)})`);
    s.setProperty('--lab-box', hexToRgba(t.lb, 0.65)); // spec: ~65%
    s.setProperty('--consult-row', hexToRgba(t.cn, op));
    // Set page background color
    s.setProperty('--page-bg', t.hd + '15'); // Very subtle tint
    setCustomHeader(t.hd);
    setCustomLab(t.lb);
    setCustomConsult(t.cn);
  }, [rowOpacity]);

  const applyCustomColors = useCallback(() => {
    const op = rowOpacity / 100;
    const s = document.documentElement.style;
    s.setProperty('--header-bg', hexToRgba(customHeader, 0.75));
    s.setProperty('--lab-box', hexToRgba(customLab, 0.65));
    s.setProperty('--consult-row', hexToRgba(customConsult, op));
  }, [rowOpacity, customHeader, customLab, customConsult]);

  useEffect(() => {
    if (mounted) applyTheme(activeTheme);
  }, [mounted, activeTheme, applyTheme]);

  useEffect(() => {
    if (mounted) applyCustomColors();
  }, [mounted, rowOpacity, customHeader, customLab, customConsult, applyCustomColors]);

  // Global paste handler
  useEffect(() => {
    if (!mounted) return;
    const handlePaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || (active as HTMLElement).contentEditable === 'true')) return;
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          e.preventDefault();
          setPatients(parsed);
          setError('');
          setPasteText('');
        }
      } catch { /* Not JSON, ignore */ }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [mounted]);

  // Sticker placement — vanilla DOM for performance
  // Creates a sticker element with drag, click-to-select, and floating toolbar
  const createStickerEl = useCallback((emoji: string, x: number, y: number, sz: number, op: number, rot: number) => {
    const layer = stickerLayerRef.current;
    if (!layer) return;
    const el = document.createElement('span');
    el.className = 'sticker';
    el.textContent = emoji;
    el.style.cssText = `font-size:${sz}px;opacity:${op};left:${x}px;top:${y}px;transform:rotate(${rot}deg)`;
    el.dataset.size = String(sz);
    el.dataset.opacity = String(op);

    // Click to select → show floating toolbar
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // Remove any existing toolbar
      document.querySelectorAll('.sticker-toolbar').forEach(t => t.remove());
      document.querySelectorAll('.sticker.selected').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');

      const tb = document.createElement('div');
      tb.className = 'sticker-toolbar no-print';
      tb.style.cssText = `position:absolute;left:${el.offsetLeft}px;top:${el.offsetTop - 36}px;z-index:60;display:flex;gap:4px;align-items:center;background:rgba(26,46,58,0.95);padding:4px 8px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.3);border:1px solid rgba(128,216,208,0.2);`;

      // Size buttons
      const makeBtn = (text: string, onClick: () => void, color = '#80D8D0') => {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = `border:none;background:rgba(128,216,208,0.15);color:${color};cursor:pointer;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;`;
        b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        return b;
      };
      tb.appendChild(makeBtn('−', () => {
        let s = parseFloat(el.dataset.size || '28');
        s = Math.max(10, s - 6);
        el.style.fontSize = s + 'px'; el.dataset.size = String(s);
      }));
      const sizeLabel = document.createElement('span');
      sizeLabel.style.cssText = 'font-size:10px;color:#80D8D0;min-width:20px;text-align:center;';
      sizeLabel.textContent = Math.round(parseFloat(el.dataset.size || '28')) + '';
      tb.appendChild(sizeLabel);
      tb.appendChild(makeBtn('+', () => {
        let s = parseFloat(el.dataset.size || '28');
        s = Math.min(120, s + 6);
        el.style.fontSize = s + 'px'; el.dataset.size = String(s);
        sizeLabel.textContent = Math.round(s) + '';
      }));

      // Opacity toggle
      tb.appendChild(makeBtn('👻', () => {
        const cur = parseFloat(el.dataset.opacity || '0.6');
        const next = cur > 0.5 ? 0.3 : cur > 0.2 ? 1 : 0.6;
        el.style.opacity = String(next); el.dataset.opacity = String(next);
      }));

      // Delete
      tb.appendChild(makeBtn('🗑', () => { el.remove(); tb.remove(); }, '#D4644A'));

      layer.appendChild(tb);

      // Click elsewhere to deselect
      const deselect = (e2: MouseEvent) => {
        if (!(e2.target as HTMLElement).closest('.sticker-toolbar') && e2.target !== el) {
          el.classList.remove('selected');
          tb.remove();
          document.removeEventListener('click', deselect);
        }
      };
      setTimeout(() => document.addEventListener('click', deselect), 10);
    });

    // Drag
    el.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault(); ev.stopPropagation();
      el.classList.add('dragging');
      document.querySelectorAll('.sticker-toolbar').forEach(t => t.remove());
      const ox = ev.clientX - el.offsetLeft, oy = ev.clientY - el.offsetTop;
      const mv = (me: MouseEvent) => { el.style.left = (me.clientX - ox) + 'px'; el.style.top = (me.clientY - oy) + 'px'; };
      const up = () => { el.classList.remove('dragging'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });

    // Scroll resize
    el.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      let s = parseFloat(el.dataset.size || '28');
      s = Math.max(10, Math.min(120, s + (ev.deltaY < 0 ? 4 : -4)));
      el.style.fontSize = s + 'px'; el.dataset.size = String(s);
    });

    layer.appendChild(el);
  }, []);

  // Click-to-place when emoji is selected
  useEffect(() => {
    if (!mounted || !activeEmoji) return;
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.panel')) return;
      if ((e.target as HTMLElement).closest('.toolbar')) return;
      if ((e.target as HTMLElement).closest('.sticker-toolbar')) return;
      if ((e.target as HTMLElement).classList.contains('sticker')) return;
      const wrap = contentRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const sz = stickerSize;
      const op = stickerOpacity / 100;
      const rot = randomRotation ? Math.round(-40 + Math.random() * 80) : 0;
      const x = e.clientX - rect.left + wrap.scrollLeft - sz / 2;
      const y = e.clientY - rect.top + wrap.scrollTop - sz / 2;
      createStickerEl(activeEmoji, x, y, sz, op, rot);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [mounted, activeEmoji, stickerSize, stickerOpacity, randomRotation, createStickerEl]);

  const scatterStickers = () => {
    const wrap = contentRef.current;
    if (!wrap) return;
    const emojis = STICKER_CATEGORIES[activeStickerCat] || STICKER_CATEGORIES['🌊 Ocean'];
    const w = wrap.scrollWidth - 60;
    const h = wrap.scrollHeight - 40;
    lastScatterCount.current = scatterCount;
    for (let i = 0; i < scatterCount; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const x = 20 + Math.random() * w;
      const y = 20 + Math.random() * h;
      const s = stickerSize * 0.6 + Math.random() * stickerSize * 0.8;
      const r = Math.round(-40 + Math.random() * 80);
      const o = Math.min((stickerOpacity / 100) * 0.6 + Math.random() * (stickerOpacity / 100) * 0.5, 1);
      createStickerEl(emoji, x, y, s, o, r);
    }
  };

  const undoStickers = () => {
    const layer = stickerLayerRef.current;
    if (!layer) return;
    // If last action was scatter, undo the whole batch
    const count = lastScatterCount.current > 0 ? lastScatterCount.current : 1;
    for (let i = 0; i < count; i++) {
      if (layer.lastElementChild && !layer.lastElementChild.classList.contains('sticker-toolbar')) {
        layer.lastElementChild.remove();
      }
    }
    lastScatterCount.current = 0;
  };

  const clearStickers = () => {
    if (stickerLayerRef.current) stickerLayerRef.current.innerHTML = '';
  };

  // Scatter stickers using only the selected bomb emojis
  const bombWithSelected = () => {
    const wrap = contentRef.current;
    if (!wrap || bombEmojis.size === 0) return;
    const emojiArr = Array.from(bombEmojis);
    const w = wrap.scrollWidth - 60;
    const h = wrap.scrollHeight - 40;
    lastScatterCount.current = scatterCount;
    for (let i = 0; i < scatterCount; i++) {
      const emoji = emojiArr[Math.floor(Math.random() * emojiArr.length)];
      const x = 20 + Math.random() * w;
      const y = 20 + Math.random() * h;
      const s = stickerSize * 0.6 + Math.random() * stickerSize * 0.8;
      const r = Math.round(-40 + Math.random() * 80);
      const o = Math.min((stickerOpacity / 100) * 0.6 + Math.random() * (stickerOpacity / 100) * 0.5, 1);
      createStickerEl(emoji, x, y, s, o, r);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBgImage(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleLoad = () => {
    setError('');
    try {
      const parsed = JSON.parse(pasteText);
      if (!Array.isArray(parsed)) { setError('Expected a JSON array'); return; }
      if (parsed.length === 0) { setError('Array is empty'); return; }
      if (!parsed[0].name) { setError('Missing "name" field'); return; }
      setPatients(parsed);
      setPasteText('');
    } catch {
      setError('Invalid JSON — paste the patient array from Claude');
    }
  };

  const handlePrint = () => {
    const wasEdit = editMode;
    if (wasEdit) setEditMode(false);
    setTimeout(() => {
      window.print();
      if (wasEdit) setTimeout(() => setEditMode(true), 500);
    }, 100);
  };

  // Field label mapping for the editor
  const FIELD_LABELS: Record<string, string> = {
    time: 'Time',
    name: 'Patient Info',
    needsToday: "Today's Plan",
    dx: 'Diagnosis / Case Profile',
    imaging: 'Imaging / Surgery',
    meds: 'Medications',
  };

  // Get the editable value for a field from a patient
  const getFieldValue = (p: RoundsPatient, field: string): string => {
    switch (field) {
      case 'time': return p.time;
      case 'name': return `${p.name}\n${p.owner}\n${p.species}`;
      case 'needsToday': return p.needsToday || '';
      case 'dx': return `${p.dx}\n---\n${p.lastVisit}`;
      case 'imaging': return `${p.surgery ? p.surgery + '\n---\n' : ''}${p.imaging}`;
      case 'meds': return p.meds || '';
      default: return '';
    }
  };

  // Save the edited value back to the patient
  const saveFieldValue = (pidx: number, field: string, value: string) => {
    setPatients(prev => {
      const updated = [...prev];
      const p = { ...updated[pidx] };
      switch (field) {
        case 'time':
          p.time = value.trim();
          break;
        case 'name': {
          const lines = value.split('\n').map(l => l.trim());
          p.name = lines[0] || p.name;
          p.owner = lines[1] ?? p.owner;
          p.species = lines[2] ?? p.species;
          break;
        }
        case 'needsToday':
          p.needsToday = value.trim();
          break;
        case 'dx': {
          const parts = value.split('---').map(s => s.trim());
          p.dx = parts[0] || p.dx;
          if (parts[1] !== undefined) p.lastVisit = parts[1];
          break;
        }
        case 'imaging': {
          const parts = value.split('---').map(s => s.trim());
          if (parts.length > 1) {
            p.surgery = parts[0] || '';
            p.imaging = parts.slice(1).join('\n').trim();
          } else {
            p.imaging = value.trim();
          }
          break;
        }
        case 'meds':
          p.meds = value.trim();
          break;
      }
      updated[pidx] = p;
      return updated;
    });
  };

  const toggleEdit = () => {
    const next = !editMode;
    setEditMode(next);
    if (!next) setEditingCell(null);
  };

  // Add row management buttons in edit mode
  useEffect(() => {
    if (!mounted) return;
    // Clean up existing row actions
    document.querySelectorAll('.row-actions').forEach(el => el.remove());
    // Add row management buttons in edit mode (inside time cell)
    if (editMode) {
      document.querySelectorAll('#roundsBody tr').forEach((tr, i) => {
        const timeCell = tr.querySelector('td:first-child') as HTMLElement;
        if (!timeCell) return;
        const btn = document.createElement('div');
        btn.className = 'row-actions no-print';
        btn.style.cssText = 'display:flex;gap:2px;justify-content:center;margin-top:4px;';
        btn.innerHTML = `
          <button class="row-act-btn row-move-up" title="Move up" style="border:none;cursor:pointer;padding:1px 4px;border-radius:3px;font-size:9px;background:rgba(128,216,208,0.2);color:#80D8D0;">▲</button>
          <button class="row-act-btn row-delete" title="Remove patient" style="border:none;cursor:pointer;padding:1px 4px;border-radius:3px;font-size:9px;background:rgba(212,100,74,0.2);color:#D4644A;font-weight:700;">✕</button>
          <button class="row-act-btn row-move-down" title="Move down" style="border:none;cursor:pointer;padding:1px 4px;border-radius:3px;font-size:9px;background:rgba(128,216,208,0.2);color:#80D8D0;">▼</button>
        `;
        timeCell.appendChild(btn);

        btn.querySelector('.row-delete')?.addEventListener('click', (e) => {
          e.stopPropagation();
          deletePatient(i);
        });
        btn.querySelector('.row-move-up')?.addEventListener('click', (e) => {
          e.stopPropagation();
          movePatient(i, -1);
        });
        btn.querySelector('.row-move-down')?.addEventListener('click', (e) => {
          e.stopPropagation();
          movePatient(i, 1);
        });
      });
    }
  }, [editMode, patients, mounted]);

  // Handle cell clicks in edit mode
  const handleTableClick = useCallback((e: React.MouseEvent) => {
    if (!editMode) return;
    // Don't intercept checkbox clicks
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    // Find the closest td with a data-field
    const td = (e.target as HTMLElement).closest('td[data-field]') as HTMLElement | null;
    if (!td) return;
    const tr = td.closest('tr[data-pidx]') as HTMLElement | null;
    if (!tr) return;
    const pidx = parseInt(tr.dataset.pidx || '', 10);
    const field = td.dataset.field || '';
    if (isNaN(pidx) || !field) return;
    if (patients[pidx]?.isBlank) return;

    const rect = td.getBoundingClientRect();
    const value = getFieldValue(patients[pidx], field);
    setEditingCell({ pidx, field, value, rect });
  }, [editMode, patients]);

  const handleEditorSave = useCallback(() => {
    if (!editingCell) return;
    saveFieldValue(editingCell.pidx, editingCell.field, editingCell.value);
    setEditingCell(null);
  }, [editingCell]);

  const handleEditorCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const today = mounted ? new Date() : new Date('2026-03-13');
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (!mounted) return null;

  // ===== EMPTY STATE =====
  if (patients.length === 0) {
    return (
      <>
        <div className="bg-layer" style={bgImage ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: bgTile ? '150px' : 'cover',
        backgroundRepeat: bgTile ? 'repeat' : 'no-repeat',
      } : {}} />
        <div className="bg-overlay" style={{ background: `rgba(255,255,255,${overlayOpacity / 100})` }} />
        <div className="content-wrap">
          <div dangerouslySetInnerHTML={{ __html: renderHeader(dateString).replace('Neurology Rounds', customTitle) }} />
          <div className="empty-state">
            <h2>Paste Your Rounds</h2>
            <p>Paste the JSON patient array from Claude, or <strong>Cmd+V</strong> anywhere on this page to auto-load.</p>
            <textarea className="paste-area" value={pasteText} onChange={e => setPasteText(e.target.value)}
              placeholder={'[\n  { "time": "9:00 AM", "name": "Piper", ... }\n]'} />
            {pastePreview && (
              <div style={{ fontSize: 12, color: '#3A6B6B', maxWidth: 600, lineHeight: 1.5 }}>
                <strong style={{ color: '#1B3A4B' }}>{pastePreview.count} patients found:</strong>{' '}
                {pastePreview.names.join(', ')}
                {pastePreview.overdue > 0 && (
                  <span style={{ color: '#D4644A', fontWeight: 700 }}> — {pastePreview.overdue} with overdue labs</span>
                )}
              </div>
            )}
            {error && <div className="error-msg">{error}</div>}
            <button className="load-btn" onClick={handleLoad} disabled={!pasteText.trim()}>Load Patients</button>
          </div>
        </div>
      </>
    );
  }

  // ===== RENDERED STATE =====
  const tableHtml = renderTableRows(patients, today);

  return (
    <>
      {/* Background layers */}
      <div className="bg-layer" style={bgImage ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: bgTile ? '150px' : 'cover',
        backgroundRepeat: bgTile ? 'repeat' : 'no-repeat',
      } : {}} />
      <div className="bg-gradient" style={{
        background: gradOpacity > 0 ? `linear-gradient(${gradAngle}deg, ${gradColor1}, ${gradColor2})` : 'none',
        opacity: gradOpacity / 100,
      }} />
      <div className="bg-overlay" style={{ background: `rgba(255,255,255,${overlayOpacity / 100})` }} />

      {/* Toolbar */}
      <div className="toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900 }}>Neurology Rounds</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>{patients.length} patients</span>
        </div>
        <div className="toolbar-actions">
          <button className="toolbar-btn secondary" onClick={() => { setPatients([]); setPasteText(''); }}>New Sheet</button>
          <button className="toolbar-btn secondary" onClick={toggleEdit}>{editMode ? '🔒 Lock' : '✏️ Edit'}</button>
          <button className="toolbar-btn" onClick={saveSheet}
            style={{
              background: saveStatus === 'saved' ? '#5BC0BE' : saveStatus === 'error' ? '#D4644A' : 'rgba(255,255,255,0.12)',
              color: saveStatus === 'saved' || saveStatus === 'error' ? '#fff' : '#80D8D0',
              transition: 'all 0.3s',
            }}>
            {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✕ Error' : '💾 Save'}
          </button>
          <button className="toolbar-btn" onClick={handlePrint} style={{ background: 'linear-gradient(135deg, #80D8D0, #5BC0BE)' }}>🖨️ Print</button>
          <button className="toolbar-btn" onClick={() => setPanelOpen(!panelOpen)}
            style={{ background: panelOpen ? '#fff' : 'rgba(255,255,255,0.12)', color: panelOpen ? '#1a2e3a' : '#80D8D0' }}>
            {panelOpen ? '✕' : '🎨'}
          </button>
        </div>
      </div>

      {/* Sheet content */}
      <div className="content-wrap" ref={contentRef} style={{ paddingRight: panelOpen ? 316 : 16, transition: 'padding-right 0.3s' }}>
        <div ref={stickerLayerRef} className="sticker-layer" />
        <div dangerouslySetInnerHTML={{ __html: renderHeader(dateString).replace('Neurology Rounds', customTitle) }} />
        <table className={editMode ? 'edit-mode' : ''}>
          <thead><tr>
            <th style={{ width: 72, textAlign: 'center' }}>Time</th>
            <th style={{ width: 110 }}>Patient</th>
            <th style={{ width: 160 }}>Today&apos;s Plan</th>
            <th>Case Profile</th>
            <th>Imaging / Surgery</th>
            <th style={{ width: 250 }}>Meds &amp; Labs</th>
          </tr></thead>
          <tbody id="roundsBody" dangerouslySetInnerHTML={{ __html: tableHtml }} onClick={handleTableClick} />
        </table>

        {/* Inline Cell Editor */}
        {editingCell && (
          <div className="cell-editor-overlay no-print" onClick={handleEditorSave}>
            <div className="cell-editor" onClick={e => e.stopPropagation()}
              style={{
                top: Math.min(editingCell.rect.top, window.innerHeight - 280),
                left: Math.max(8, editingCell.rect.left - 8),
                minWidth: Math.max(editingCell.rect.width + 16, 200),
                maxWidth: Math.min(editingCell.rect.width + 100, 500),
              }}>
              <div className="cell-editor-header">
                <span className="cell-editor-label">
                  {FIELD_LABELS[editingCell.field] || editingCell.field}
                  <span className="cell-editor-patient"> — {patients[editingCell.pidx]?.name}</span>
                </span>
                <div className="cell-editor-actions">
                  <button className="cell-editor-btn cancel" onClick={handleEditorCancel}>Cancel</button>
                  <button className="cell-editor-btn save" onClick={handleEditorSave}>Save</button>
                </div>
              </div>
              {editingCell.field === 'time' ? (
                <input
                  type="text"
                  className="cell-editor-input"
                  value={editingCell.value}
                  onChange={e => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEditorSave(); if (e.key === 'Escape') handleEditorCancel(); }}
                  autoFocus
                />
              ) : (
                <textarea
                  className="cell-editor-textarea"
                  value={editingCell.value}
                  onChange={e => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                  onKeyDown={e => { if (e.key === 'Escape') handleEditorCancel(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEditorSave(); }}
                  autoFocus
                  rows={editingCell.field === 'name' ? 3 : editingCell.field === 'meds' ? 6 : 4}
                />
              )}
              {editingCell.field !== 'time' && (
                <div className="cell-editor-hint">
                  {editingCell.field === 'name' && 'Line 1: Name • Line 2: Owner • Line 3: Species'}
                  {editingCell.field === 'dx' && 'Diagnosis on top • --- separator • Visit notes below'}
                  {editingCell.field === 'imaging' && 'Surgery on top • --- separator • Imaging below'}
                  {editingCell.field === 'needsToday' && 'Use " · " to separate plan lines'}
                  {editingCell.field === 'meds' && 'One medication per line'}
                  {' • Cmd+Enter to save • Esc to cancel'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer message */}
        {footerText && (
          <div style={{
            textAlign: 'center', padding: '12px 0 4px', fontSize: 10,
            fontWeight: 600, color: 'var(--text-secondary)', fontStyle: 'italic',
            letterSpacing: '0.05em',
          }}>
            {footerText}
          </div>
        )}

        {/* Watermark */}
        {watermarkEmoji && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 300, opacity: 0.04, pointerEvents: 'none',
            zIndex: 5, lineHeight: 1,
          }}>
            {watermarkEmoji}
          </div>
        )}

        {/* Page border */}
        {pageBorder && (
          <div style={{
            position: 'absolute', top: 4, left: 4, right: 4, bottom: 4,
            border: '3px double var(--text-secondary)', borderRadius: 12,
            pointerEvents: 'none', zIndex: 5, opacity: 0.3,
          }} />
        )}
      </div>

      {/* ===== CONTROL PANEL ===== */}
      <div className="panel no-print" style={{
        position: 'fixed', top: 0, right: 0, width: 300, height: '100vh', zIndex: 1000,
        background: 'linear-gradient(180deg, #0f1c24 0%, #162430 40%, #1a2e3a 100%)',
        color: '#fff', overflowY: 'auto', fontSize: 11,
        boxShadow: '-4px 0 30px rgba(0,0,0,0.4)',
        borderLeft: '1px solid rgba(128,216,208,0.1)',
        transform: panelOpen ? 'translateX(0)' : 'translateX(300px)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '16px 18px 12px', borderBottom: '1px solid rgba(128,216,208,0.12)',
          background: 'linear-gradient(135deg, rgba(128,216,208,0.08), rgba(91,192,190,0.04))',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#80D8D0' }}>
            Customize
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            Theme · Background · Stickers
          </div>
        </div>

        <div style={{ padding: '8px 16px 20px' }}>

          {/* ── THEMES ── */}
          <SectionHeader title="Themes" icon="🎨" section="themes" active={activeSection} onToggle={toggleSection} />
          {activeSection === 'themes' && (
            <div style={{ paddingBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                {THEME_PRESETS.map((t, i) => (
                  <button key={t.name} onClick={() => { setActiveTheme(i); applyTheme(i); }}
                    style={{
                      padding: '12px 8px', position: 'relative', overflow: 'hidden',
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      fontSize: 10, fontWeight: 700, textAlign: 'left', color: '#fff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      background: t.gradient, transition: 'all 0.2s',
                      boxShadow: i === activeTheme
                        ? '0 0 0 2px #fff, 0 4px 12px rgba(0,0,0,0.3)'
                        : '0 2px 8px rgba(0,0,0,0.2)',
                      transform: i === activeTheme ? 'scale(1.02)' : 'scale(1)',
                    }}>
                    {/* Mini preview strips */}
                    <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                      <div style={{ width: 16, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.5)' }} />
                      <div style={{ width: 16, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
                      <div style={{ width: 16, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
                    </div>
                    {t.name}
                    {i === activeTheme && <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 12 }}>✓</span>}
                  </button>
                ))}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#80D8D0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fine-tune Colors</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <ColorPick label="Header" value={customHeader} onChange={v => { setCustomHeader(v); setActiveTheme(-1); }} />
                  <ColorPick label="Lab Box" value={customLab} onChange={v => { setCustomLab(v); setActiveTheme(-1); }} />
                  <ColorPick label="Consult" value={customConsult} onChange={v => { setCustomConsult(v); setActiveTheme(-1); }} />
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>Row Transparency</div>
                <SliderRow value={rowOpacity} min={30} max={100} suffix="%" onChange={v => { setRowOpacity(v); if (activeTheme >= 0) applyTheme(activeTheme, v); }} />
              </div>
            </div>
          )}

          {/* ── BACKGROUND ── */}
          <SectionHeader title="Background" icon="🖼️" section="background" active={activeSection} onToggle={toggleSection} />
          {activeSection === 'background' && (
            <div style={{ paddingBottom: 16 }}>
              {/* Upload zone */}
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: bgImage ? '6px' : '16px 12px', borderRadius: 8, cursor: 'pointer',
                border: '2px dashed rgba(128,216,208,0.25)', marginBottom: 10,
                background: 'rgba(128,216,208,0.04)', transition: 'all 0.2s',
              }}>
                {bgImage ? (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <img src={bgImage} alt="Background" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} />
                    <button onClick={(e) => { e.preventDefault(); setBgImage(null); }}
                      style={{
                        position: 'absolute', top: 4, right: 4, width: 22, height: 22,
                        borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)',
                        color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>×</button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: 24, marginBottom: 4 }}>📷</span>
                    <span style={{ fontSize: 10, color: '#80D8D0', fontWeight: 600 }}>Drop image or click to upload</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Scales, sparkles, patterns — anything</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />
              </label>

              {/* URL input */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                <input type="text" placeholder="Paste image URL..." value={bgUrlInput}
                  onChange={e => setBgUrlInput(e.target.value)}
                  style={{
                    flex: 1, padding: '6px 8px', fontSize: 10, borderRadius: 6,
                    border: '1px solid rgba(128,216,208,0.2)', background: 'rgba(0,0,0,0.3)',
                    color: '#fff', outline: 'none',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && bgUrlInput.trim()) { setBgImage(bgUrlInput.trim()); setBgUrlInput(''); } }}
                />
                <button onClick={() => { if (bgUrlInput.trim()) { setBgImage(bgUrlInput.trim()); setBgUrlInput(''); } }}
                  style={{
                    padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
                    background: '#80D8D0', color: '#0f1c24', fontSize: 10, fontWeight: 700,
                  }}>Go</button>
              </div>

              {/* Tile vs Cover toggle */}
              {bgImage && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  {(['cover', 'tile'] as const).map(mode => (
                    <button key={mode} onClick={() => setBgTile(mode === 'tile')}
                      style={{
                        flex: 1, padding: '5px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        background: (mode === 'tile') === bgTile ? '#80D8D0' : 'rgba(255,255,255,0.06)',
                        color: (mode === 'tile') === bgTile ? '#0f1c24' : 'rgba(255,255,255,0.4)',
                      }}>
                      {mode === 'cover' ? '🖼 Cover' : '🔲 Tile'}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick gradient presets */}
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Gradients</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                {[
                  { name: 'Sunset', c1: '#F0A878', c2: '#E8508A', angle: 135 },
                  { name: 'Ocean', c1: '#5BC0BE', c2: '#3A5080', angle: 135 },
                  { name: 'Forest', c1: '#2D8B6B', c2: '#A8B868', angle: 135 },
                  { name: 'Lavender', c1: '#8B6CB0', c2: '#DCC6E8', angle: 135 },
                  { name: 'Rose', c1: '#C4868E', c2: '#F0D8DC', angle: 135 },
                  { name: 'Mint', c1: '#80D8D0', c2: '#E4F1EF', angle: 135 },
                ].map(g => (
                  <button key={g.name} onClick={() => { setGradColor1(g.c1); setGradColor2(g.c2); setGradAngle(g.angle); setGradOpacity(50); }}
                    style={{
                      width: 40, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: `linear-gradient(${g.angle}deg, ${g.c1}, ${g.c2})`,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      transition: 'transform 0.15s',
                    }}
                    title={g.name}
                  />
                ))}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <ColorPick label="Color 1" value={gradColor1} onChange={setGradColor1} />
                  <ColorPick label="Color 2" value={gradColor2} onChange={setGradColor2} />
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Gradient Strength</div>
                <SliderRow value={gradOpacity} min={0} max={100} suffix="%" onChange={setGradOpacity} />
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 4, marginTop: 6 }}>Angle</div>
                <SliderRow value={gradAngle} min={0} max={360} suffix="°" onChange={setGradAngle} />
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 4, marginTop: 6 }}>White Overlay</div>
                <SliderRow value={overlayOpacity} min={0} max={60} suffix="%" onChange={setOverlayOpacity} />
              </div>
            </div>
          )}

          {/* ── EXTRAS ── */}
          <SectionHeader title="Extras" icon="✏️" section="extras" active={activeSection} onToggle={toggleSection} />
          {activeSection === 'extras' && (
            <div style={{ paddingBottom: 16 }}>
              {/* Custom title */}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Sheet Title</div>
              <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 11, borderRadius: 6,
                  border: '1px solid rgba(128,216,208,0.2)', background: 'rgba(0,0,0,0.3)',
                  color: '#fff', outline: 'none', marginBottom: 10,
                  fontFamily: "'Playfair Display', serif", fontWeight: 700,
                }} />

              {/* Footer message */}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Footer Message</div>
              <input type="text" value={footerText} onChange={e => setFooterText(e.target.value)}
                placeholder="Made with love by Lauren"
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 10, borderRadius: 6,
                  border: '1px solid rgba(128,216,208,0.2)', background: 'rgba(0,0,0,0.3)',
                  color: '#fff', outline: 'none', marginBottom: 10,
                }} />

              {/* Watermark */}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Watermark Emoji</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                {['', '🧠', '🐾', '🌸', '💜', '✨', '🍄', '🐸', '☀️', '🦴'].map(e => (
                  <button key={e} onClick={() => setWatermarkEmoji(e)}
                    style={{
                      width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: e ? 18 : 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: watermarkEmoji === e ? 'rgba(128,216,208,0.2)' : 'rgba(255,255,255,0.05)',
                      boxShadow: watermarkEmoji === e ? '0 0 0 2px #80D8D0' : 'none',
                      color: e ? undefined : 'rgba(255,255,255,0.3)',
                    }}>
                    {e || '∅'}
                  </button>
                ))}
              </div>

              {/* Page border */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                <input type="checkbox" checked={pageBorder} onChange={e => setPageBorder(e.target.checked)} style={{ accentColor: '#80D8D0' }} />
                Decorative page border
              </label>
            </div>
          )}

        </div>

        {/* Panel footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(128,216,208,0.08)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <button onClick={handlePrint}
            style={{
              width: '100%', padding: '10px 0', border: 'none', borderRadius: 20, cursor: 'pointer',
              fontWeight: 800, fontSize: 12, letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #80D8D0, #5BC0BE)', color: '#0f1c24',
              boxShadow: '0 3px 15px rgba(128,216,208,0.25)',
              transition: 'all 0.2s',
            }}>
            🖨️ Print / Export PDF
          </button>
        </div>
      </div>
      {/* ===== FLOATING STICKER DOCK ===== */}
      <div className="no-print" style={{
        position: 'fixed', bottom: 0, left: 0, right: panelOpen ? 300 : 0,
        zIndex: 900, transition: 'right 0.3s',
      }}>
        {/* Category tabs */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 2, paddingBottom: 0,
        }}>
          {Object.keys(STICKER_CATEGORIES).map(cat => {
            const isActive = cat === activeStickerCat;
            const emoji = cat.split(' ')[0];
            return (
              <button key={cat} onClick={() => { setActiveStickerCat(cat); setActiveEmoji(null); setStickerDockOpen(true); }}
                style={{
                  padding: '4px 8px', border: 'none', cursor: 'pointer',
                  borderRadius: '8px 8px 0 0', fontSize: 14, transition: 'all 0.15s',
                  background: isActive && stickerDockOpen
                    ? 'rgba(26,46,58,0.95)'
                    : 'rgba(26,46,58,0.6)',
                  color: isActive ? '#80D8D0' : 'rgba(255,255,255,0.5)',
                  transform: isActive && stickerDockOpen ? 'translateY(-2px)' : 'none',
                }}
                title={cat}>
                {emoji}
              </button>
            );
          })}
          <button onClick={scatterStickers} title="Scatter from full category"
            style={{
              padding: '4px 8px', border: 'none', cursor: 'pointer',
              borderRadius: '8px 8px 0 0', fontSize: 14,
              background: 'rgba(128,216,208,0.3)', color: '#80D8D0',
              marginLeft: 4,
            }}>
            🎲
          </button>
          {bombEmojis.size > 0 && (
            <button onClick={bombWithSelected}
              title={`Bomb with ${bombEmojis.size} selected emoji${bombEmojis.size > 1 ? 's' : ''}`}
              style={{
                padding: '4px 8px', border: 'none', cursor: 'pointer',
                borderRadius: '8px 8px 0 0', fontSize: 12, fontWeight: 700,
                background: 'linear-gradient(135deg, #80D8D0, #5BC0BE)',
                color: '#0f1c24', animation: 'pulse 1.5s infinite',
              }}>
              💣 {bombEmojis.size}
            </button>
          )}
          {bombEmojis.size > 0 && (
            <button onClick={() => setBombEmojis(new Set())}
              title="Clear emoji selection"
              style={{
                padding: '4px 8px', border: 'none', cursor: 'pointer',
                borderRadius: '8px 8px 0 0', fontSize: 11,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
              }}>
              ✕
            </button>
          )}
          <button onClick={undoStickers}
            title="Undo (Cmd+Z)"
            style={{
              padding: '4px 8px', border: 'none', cursor: 'pointer',
              borderRadius: '8px 8px 0 0', fontSize: 12,
              background: 'rgba(212,170,40,0.2)', color: '#D4AA28',
            }}>
            ↩
          </button>
          <button onClick={clearStickers} title="Clear all stickers"
            style={{
              padding: '4px 8px', border: 'none', cursor: 'pointer',
              borderRadius: '8px 8px 0 0', fontSize: 12,
              background: 'rgba(212,100,74,0.2)', color: '#D4644A',
            }}>
            ×
          </button>
        </div>

        {/* Emoji palette dock */}
        <div style={{
          background: 'rgba(26,46,58,0.95)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(128,216,208,0.15)',
          padding: stickerDockOpen ? '8px 16px 10px' : '0 16px',
          maxHeight: stickerDockOpen ? 80 : 0, overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div style={{
            display: 'flex', gap: 4, overflowX: 'auto', alignItems: 'center',
            scrollbarWidth: 'none',
          }}>
            {(STICKER_CATEGORIES[activeStickerCat] || []).map(emoji => {
              const isPlaceActive = activeEmoji === emoji;
              const isInBomb = bombEmojis.has(emoji);
              return (
                <span key={emoji}
                  onClick={() => {
                    setActiveEmoji(isPlaceActive ? null : emoji);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setBombEmojis(prev => {
                      const next = new Set(prev);
                      if (next.has(emoji)) next.delete(emoji);
                      else next.add(emoji);
                      return next;
                    });
                  }}
                  style={{
                    fontSize: 28, cursor: 'pointer', padding: '4px 6px', borderRadius: 8,
                    flexShrink: 0, lineHeight: 1, transition: 'all 0.15s',
                    position: 'relative',
                    background: isPlaceActive
                      ? 'rgba(128,216,208,0.25)'
                      : isInBomb
                        ? 'rgba(255,180,50,0.2)'
                        : 'transparent',
                    boxShadow: isPlaceActive
                      ? '0 0 0 2px #80D8D0, 0 0 12px rgba(128,216,208,0.3)'
                      : isInBomb
                        ? '0 0 0 2px #FFB432'
                        : 'none',
                    transform: isPlaceActive ? 'scale(1.2) translateY(-4px)' : 'scale(1)',
                  }}>
                  {emoji}
                  {isInBomb && (
                    <span style={{
                      position: 'absolute', top: -2, right: -2, fontSize: 10,
                      background: '#FFB432', color: '#0f1c24', borderRadius: '50%',
                      width: 14, height: 14, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 900, lineHeight: 1,
                    }}>💣</span>
                  )}
                </span>
              );
            })}
            {/* S / M / L / XL size toggle */}
            <div style={{
              display: 'flex', gap: 3, marginLeft: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: 2,
            }}>
              {([['S', 22], ['M', 36], ['L', 52], ['XL', 74]] as const).map(([label, sz]) => (
                <button key={label} onClick={() => setStickerSize(sz)}
                  style={{
                    padding: '3px 10px', border: 'none', borderRadius: 4, cursor: 'pointer',
                    fontSize: 11, fontWeight: 800, transition: 'all 0.15s',
                    background: stickerSize === sz ? '#80D8D0' : 'transparent',
                    color: stickerSize === sz ? '#0f1c24' : 'rgba(255,255,255,0.4)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {/* Opacity slider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>👻</span>
              <input type="range" min={10} max={100} value={stickerOpacity}
                onChange={e => setStickerOpacity(Number(e.target.value))}
                style={{ width: 60, cursor: 'pointer', accentColor: '#80D8D0' }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ===== PANEL SUB-COMPONENTS =====

function SectionHeader({ title, icon, section, active, onToggle }: {
  title: string; icon: string; section: string; active: string | null;
  onToggle: (s: string) => void;
}) {
  const isOpen = active === section;
  return (
    <button onClick={() => onToggle(section)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '12px 0', background: 'none', border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer', color: isOpen ? '#80D8D0' : 'rgba(255,255,255,0.55)',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        transition: 'all 0.2s',
      }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
      <span style={{
        fontSize: 11, transition: 'transform 0.2s',
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
        opacity: 0.4,
      }}>›</span>
    </button>
  );
}

function PanelLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 10, color: '#99b', margin: '6px 0 2px', ...style }}>{children}</div>;
}

function SliderRow({ value, min, max, suffix, onChange }: {
  value: number; min: number; max: number; suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, cursor: 'pointer', accentColor: '#80D8D0' }} />
      <span style={{ minWidth: 32, textAlign: 'right', fontSize: 10, color: '#80D8D0' }}>
        {value}{suffix}
      </span>
    </div>
  );
}

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: '#99b', marginBottom: 2 }}>{label}</div>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 24, border: 'none', borderRadius: 3, cursor: 'pointer' }} />
    </div>
  );
}
