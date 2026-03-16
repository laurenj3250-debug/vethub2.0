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
  const [selectedEmojis, setSelectedEmojis] = useState<Set<string>>(new Set());
  const [stickerSize, setStickerSize] = useState(36);
  const [stickerOpacity, setStickerOpacity] = useState(60);
  const [randomRotation, setRandomRotation] = useState(true);
  const [scatterCount, setScatterCount] = useState(30);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{ pidx: number; field: string; value: string; rect: DOMRect } | null>(null);

  // Session persistence state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<{ id: string; name: string; patientCount: number; updatedAt: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const stickerLayerRef = useRef<HTMLDivElement>(null);
  const lastScatterCount = useRef(0);

  useEffect(() => {
    setMounted(true);
    // Load saved sessions list on mount
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/rounds-sessions');
      if (res.ok) {
        const data = await res.json();
        setSavedSessions(data);
      }
    } catch { /* ignore fetch errors */ }
    setLoadingSessions(false);
  };

  const saveSession = async (name?: string) => {
    if (patients.length === 0) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/rounds-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          name: name || customTitle,
          patients,
          settings: {
            customTitle, activeTheme, footerText, watermarkEmoji, pageBorder,
            rowOpacity, overlayOpacity, gradColor1, gradColor2, gradAngle, gradOpacity,
            customHeader, customLab, customConsult, bgTile,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
        setSaveStatus('Saved!');
        fetchSessions();
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        setSaveStatus('Save failed');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch {
      setSaveStatus('Save failed');
      setTimeout(() => setSaveStatus(null), 3000);
    }
    setSaving(false);
  };

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`/api/rounds-sessions/${id}`);
      if (!res.ok) {
        setSaveStatus(res.status === 404 ? 'Session not found' : 'Failed to load');
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }
      const data = await res.json();
      const pts = Array.isArray(data.patients) ? data.patients : [];
      setPatients(pts);
      setSessionId(data.id);
      if (data.settings) {
        const s = data.settings;
        if (s.customTitle) setCustomTitle(s.customTitle);
        if (s.footerText !== undefined) setFooterText(s.footerText);
        if (s.watermarkEmoji !== undefined) setWatermarkEmoji(s.watermarkEmoji);
        if (s.pageBorder !== undefined) setPageBorder(s.pageBorder);
        if (s.rowOpacity !== undefined) setRowOpacity(s.rowOpacity);
        if (s.overlayOpacity !== undefined) setOverlayOpacity(s.overlayOpacity);
        if (s.gradColor1) setGradColor1(s.gradColor1);
        if (s.gradColor2) setGradColor2(s.gradColor2);
        if (s.gradAngle !== undefined) setGradAngle(s.gradAngle);
        if (s.gradOpacity !== undefined) setGradOpacity(s.gradOpacity);
        if (s.customHeader) setCustomHeader(s.customHeader);
        if (s.customLab) setCustomLab(s.customLab);
        if (s.customConsult) setCustomConsult(s.customConsult);
        if (s.bgTile !== undefined) setBgTile(s.bgTile);
        if (s.activeTheme !== undefined) {
          setActiveTheme(s.activeTheme);
          // Defer theme application to after state settles
          setTimeout(() => applyTheme(s.activeTheme, s.rowOpacity), 0);
        }
      }
      setPasteText('');
    } catch {
      setSaveStatus('Failed to load session');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this saved session?')) return;
    try {
      await fetch(`/api/rounds-sessions/${id}`, { method: 'DELETE' });
      fetchSessions();
      if (sessionId === id) {
        setSessionId(null);
        setPatients([]);
      }
    } catch {
      setSaveStatus('Failed to delete');
      setTimeout(() => setSaveStatus(null), 3000);
    }
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
  // Stores cleanup function on element for proper listener removal
  const createStickerEl = useCallback((emoji: string, x: number, y: number, sz: number, op: number, rot: number) => {
    const layer = stickerLayerRef.current;
    if (!layer) return;
    const el = document.createElement('span') as HTMLSpanElement & { __cleanup?: () => void };
    el.className = 'sticker';
    el.textContent = emoji;
    el.style.cssText = `font-size:${sz}px;opacity:${op};left:${x}px;top:${y}px;transform:rotate(${rot}deg)`;
    el.dataset.size = String(sz);
    el.dataset.opacity = String(op);

    // Track document-level listeners for cleanup
    let activeDeselect: ((e: MouseEvent) => void) | null = null;

    const cleanupDeselect = () => {
      if (activeDeselect) {
        document.removeEventListener('click', activeDeselect);
        activeDeselect = null;
      }
    };

    // Click to select → show floating toolbar
    const clickHandler = (ev: Event) => {
      ev.stopPropagation();
      // Remove any existing toolbar and deselect listeners
      document.querySelectorAll('.sticker-toolbar').forEach(t => t.remove());
      document.querySelectorAll('.sticker.selected').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');

      const tb = document.createElement('div');
      tb.className = 'sticker-toolbar no-print';
      tb.style.cssText = `position:absolute;left:${el.offsetLeft}px;top:${el.offsetTop - 36}px`;

      // Size buttons
      const makeBtn = (text: string, onClick: () => void, cls = '') => {
        const b = document.createElement('button');
        b.textContent = text;
        b.className = 'sticker-toolbar-btn' + (cls ? ' ' + cls : '');
        b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        return b;
      };
      tb.appendChild(makeBtn('−', () => {
        let s = parseFloat(el.dataset.size || '28');
        s = Math.max(10, s - 6);
        el.style.fontSize = s + 'px'; el.dataset.size = String(s);
      }));
      const sizeLabel = document.createElement('span');
      sizeLabel.className = 'sticker-toolbar-label';
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

      // Delete — clean up listeners before removing
      tb.appendChild(makeBtn('🗑', () => {
        cleanupDeselect();
        el.__cleanup = undefined;
        el.remove();
        tb.remove();
      }, 'danger'));

      layer.appendChild(tb);

      // Click elsewhere to deselect
      cleanupDeselect(); // Remove any prior deselect listener
      const deselect = (e2: MouseEvent) => {
        if (!(e2.target as HTMLElement).closest('.sticker-toolbar') && e2.target !== el) {
          el.classList.remove('selected');
          tb.remove();
          cleanupDeselect();
        }
      };
      activeDeselect = deselect;
      setTimeout(() => {
        if (activeDeselect === deselect) {
          document.addEventListener('click', deselect);
        }
      }, 10);
    };
    el.addEventListener('click', clickHandler);

    // Drag
    const mousedownHandler = (ev: Event) => {
      const mev = ev as MouseEvent;
      if (mev.button !== 0) return;
      mev.preventDefault(); mev.stopPropagation();
      el.classList.add('dragging');
      document.querySelectorAll('.sticker-toolbar').forEach(t => t.remove());
      cleanupDeselect();
      const ox = mev.clientX - el.offsetLeft, oy = mev.clientY - el.offsetTop;
      const mv = (me: MouseEvent) => { el.style.left = (me.clientX - ox) + 'px'; el.style.top = (me.clientY - oy) + 'px'; };
      const up = () => { el.classList.remove('dragging'); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    };
    el.addEventListener('mousedown', mousedownHandler);

    // Scroll resize
    const wheelHandler = (ev: Event) => {
      ev.preventDefault();
      const wev = ev as WheelEvent;
      let s = parseFloat(el.dataset.size || '28');
      s = Math.max(10, Math.min(120, s + (wev.deltaY < 0 ? 4 : -4)));
      el.style.fontSize = s + 'px'; el.dataset.size = String(s);
    };
    el.addEventListener('wheel', wheelHandler);

    // Store cleanup function for proper teardown
    el.__cleanup = () => {
      cleanupDeselect();
      el.removeEventListener('click', clickHandler);
      el.removeEventListener('mousedown', mousedownHandler);
      el.removeEventListener('wheel', wheelHandler);
    };

    layer.appendChild(el);
  }, []);

  // Click-to-place when emoji is selected
  useEffect(() => {
    if (!mounted || selectedEmojis.size === 0) return;
    const emojiArr = Array.from(selectedEmojis);
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
      const emoji = emojiArr[Math.floor(Math.random() * emojiArr.length)];
      createStickerEl(emoji, x, y, sz, op, rot);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [mounted, selectedEmojis, stickerSize, stickerOpacity, randomRotation, createStickerEl]);

  const scatterStickers = () => {
    const wrap = contentRef.current;
    if (!wrap) return;
    const emojis = selectedEmojis.size > 0
      ? Array.from(selectedEmojis)
      : (STICKER_CATEGORIES[activeStickerCat] || STICKER_CATEGORIES['🐶 Dogs']);
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

  const cleanupStickerEl = (el: Element) => {
    (el as HTMLElement & { __cleanup?: () => void }).__cleanup?.();
  };

  const undoStickers = () => {
    const layer = stickerLayerRef.current;
    if (!layer) return;
    const count = lastScatterCount.current > 0 ? lastScatterCount.current : 1;
    for (let i = 0; i < count; i++) {
      const last = layer.lastElementChild;
      if (last && !last.classList.contains('sticker-toolbar')) {
        cleanupStickerEl(last);
        last.remove();
      }
    }
    lastScatterCount.current = 0;
  };

  const clearStickers = () => {
    const layer = stickerLayerRef.current;
    if (!layer) return;
    layer.querySelectorAll('.sticker').forEach(cleanupStickerEl);
    layer.innerHTML = '';
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
      case 'time': return p.time || '';
      case 'name': return `${p.name || ''}\n${p.owner || ''}\n${p.species || ''}`;
      case 'needsToday': return p.needsToday || '';
      case 'dx': return `${p.dx || ''}\n---\n${p.lastVisit || ''}`;
      case 'imaging': return `${p.surgery ? p.surgery + '\n---\n' : ''}${p.imaging || ''}`;
      case 'meds': return p.meds || '';
      default: return '';
    }
  };

  // Save the edited value back to the patient
  const saveFieldValue = (pidx: number, field: string, value: string) => {
    setPatients(prev => {
      if (pidx < 0 || pidx >= prev.length) return prev;
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
            {/* Saved Sessions */}
            {loadingSessions && savedSessions.length === 0 && (
              <div className="loading-text">Loading saved rounds...</div>
            )}
            {savedSessions.length > 0 && (
              <div style={{ width: '100%', maxWidth: 600, marginBottom: 24 }}>
                <h3 className="saved-sessions-title">Saved Rounds</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedSessions.map(s => (
                    <div key={s.id} className="saved-session-card" onClick={() => loadSession(s.id)}>
                      <div style={{ flex: 1 }}>
                        <div className="saved-session-name">{s.name}</div>
                        <div className="saved-session-meta">
                          {s.patientCount} patients · Last updated {new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                      <button className="saved-session-delete" onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        title="Delete session">Delete</button>
                    </div>
                  ))}
                </div>
                <div className="divider-line"><span className="divider-text">or paste new</span></div>
              </div>
            )}

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
            {saveStatus && <div className="error-msg">{saveStatus}</div>}
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
          <span className="toolbar-title">Neurology Rounds</span>
          <span className="toolbar-count">{patients.length} patients</span>
        </div>
        <div className="toolbar-actions">
          <button className="toolbar-btn secondary" onClick={() => { setPatients([]); setPasteText(''); setSessionId(null); }}>New Sheet</button>
          <button className="toolbar-btn secondary" onClick={toggleEdit}>{editMode ? '🔒 Lock' : '✏️ Edit'}</button>
          <button className="toolbar-btn save" onClick={() => saveSession()} disabled={saving}>
            {saving ? 'Saving...' : saveStatus || (sessionId ? '💾 Save' : '💾 Save to Site')}
          </button>
          <button className="toolbar-btn print" onClick={handlePrint}>🖨️ Print</button>
          <button className="toolbar-btn panel-toggle" data-open={String(panelOpen)} onClick={() => setPanelOpen(!panelOpen)}>
            {panelOpen ? '✕' : '🎨'}
          </button>
        </div>
      </div>

      {/* Sheet content */}
      <div className="content-wrap" ref={contentRef} data-panel={String(panelOpen)}>
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
        {footerText && <div className="sheet-footer">{footerText}</div>}

        {/* Watermark */}
        {watermarkEmoji && <div className="sheet-watermark">{watermarkEmoji}</div>}

        {/* Page border */}
        {pageBorder && <div className="sheet-border" />}
      </div>

      {/* ===== CONTROL PANEL ===== */}
      <div className="panel no-print" data-open={String(panelOpen)}>
        <div className="panel-header">
          <div className="panel-header-title">Customize</div>
          <div className="panel-header-sub">Theme · Background · Stickers</div>
        </div>

        <div className="panel-body">

          {/* ── THEMES ── */}
          <SectionHeader title="Themes" icon="🎨" section="themes" active={activeSection} onToggle={toggleSection} />
          {activeSection === 'themes' && (
            <div className="panel-section">
              <div className="theme-grid">
                {THEME_PRESETS.map((t, i) => (
                  <button key={t.name} className="theme-btn" data-active={String(i === activeTheme)}
                    onClick={() => { setActiveTheme(i); applyTheme(i); }}
                    style={{ background: t.gradient }}>
                    <div className="theme-preview">
                      <div className="theme-preview-bar" style={{ background: 'rgba(255,255,255,0.5)' }} />
                      <div className="theme-preview-bar" style={{ background: 'rgba(255,255,255,0.3)' }} />
                      <div className="theme-preview-bar" style={{ background: 'rgba(255,255,255,0.4)' }} />
                    </div>
                    {t.name}
                    {i === activeTheme && <span className="theme-check">✓</span>}
                  </button>
                ))}
              </div>

              <div className="panel-subsection">
                <div className="panel-sublabel">Fine-tune Colors</div>
                <div className="color-row">
                  <ColorPick label="Header" value={customHeader} onChange={v => { setCustomHeader(v); setActiveTheme(-1); }} />
                  <ColorPick label="Lab Box" value={customLab} onChange={v => { setCustomLab(v); setActiveTheme(-1); }} />
                  <ColorPick label="Consult" value={customConsult} onChange={v => { setCustomConsult(v); setActiveTheme(-1); }} />
                </div>
                <div className="panel-hint" style={{ marginBottom: 6 }}>Row Transparency</div>
                <SliderRow value={rowOpacity} min={30} max={100} suffix="%" onChange={v => { setRowOpacity(v); if (activeTheme >= 0) applyTheme(activeTheme, v); }} />
              </div>
            </div>
          )}

          {/* ── BACKGROUND ── */}
          <SectionHeader title="Background" icon="🖼️" section="background" active={activeSection} onToggle={toggleSection} />
          {activeSection === 'background' && (
            <div className="panel-section">
              {/* Upload zone */}
              <label className={`bg-upload-zone${bgImage ? ' has-image' : ''}`}>
                {bgImage ? (
                  <div className="bg-preview">
                    <img src={bgImage} alt="Background" />
                    <button className="bg-preview-remove" onClick={(e) => { e.preventDefault(); setBgImage(null); }}>×</button>
                  </div>
                ) : (
                  <>
                    <span className="bg-upload-icon">📷</span>
                    <span className="bg-upload-text">Drop image or click to upload</span>
                    <span className="bg-upload-hint">Scales, sparkles, patterns — anything</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />
              </label>

              {/* URL input */}
              <div className="bg-url-row">
                <input type="text" className="panel-input" placeholder="Paste image URL..." value={bgUrlInput}
                  onChange={e => setBgUrlInput(e.target.value)}
                  style={{ flex: 1, marginBottom: 0 }}
                  onKeyDown={e => { if (e.key === 'Enter' && bgUrlInput.trim()) { setBgImage(bgUrlInput.trim()); setBgUrlInput(''); } }}
                />
                <button className="bg-url-go" onClick={() => { if (bgUrlInput.trim()) { setBgImage(bgUrlInput.trim()); setBgUrlInput(''); } }}>Go</button>
              </div>

              {/* Tile vs Cover toggle */}
              {bgImage && (
                <div className="bg-mode-row">
                  {(['cover', 'tile'] as const).map(mode => (
                    <button key={mode} className="bg-mode-btn" data-active={String((mode === 'tile') === bgTile)}
                      onClick={() => setBgTile(mode === 'tile')}>
                      {mode === 'cover' ? '🖼 Cover' : '🔲 Tile'}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick gradient presets */}
              <div className="panel-hint">Quick Gradients</div>
              <div className="gradient-presets">
                {[
                  { name: 'Sunset', c1: '#F0A878', c2: '#E8508A', angle: 135 },
                  { name: 'Ocean', c1: '#5BC0BE', c2: '#3A5080', angle: 135 },
                  { name: 'Forest', c1: '#2D8B6B', c2: '#A8B868', angle: 135 },
                  { name: 'Lavender', c1: '#8B6CB0', c2: '#DCC6E8', angle: 135 },
                  { name: 'Rose', c1: '#C4868E', c2: '#F0D8DC', angle: 135 },
                  { name: 'Mint', c1: '#80D8D0', c2: '#E4F1EF', angle: 135 },
                ].map(g => (
                  <button key={g.name} className="gradient-swatch"
                    onClick={() => { setGradColor1(g.c1); setGradColor2(g.c2); setGradAngle(g.angle); setGradOpacity(50); }}
                    style={{ background: `linear-gradient(${g.angle}deg, ${g.c1}, ${g.c2})` }}
                    title={g.name}
                  />
                ))}
              </div>

              <div className="panel-subsection">
                <div className="color-row">
                  <ColorPick label="Color 1" value={gradColor1} onChange={setGradColor1} />
                  <ColorPick label="Color 2" value={gradColor2} onChange={setGradColor2} />
                </div>
                <div className="panel-hint" style={{ marginBottom: 4 }}>Gradient Strength</div>
                <SliderRow value={gradOpacity} min={0} max={100} suffix="%" onChange={setGradOpacity} />
                <div className="panel-hint" style={{ marginBottom: 4, marginTop: 6 }}>Angle</div>
                <SliderRow value={gradAngle} min={0} max={360} suffix="°" onChange={setGradAngle} />
                <div className="panel-hint" style={{ marginBottom: 4, marginTop: 6 }}>White Overlay</div>
                <SliderRow value={overlayOpacity} min={0} max={60} suffix="%" onChange={setOverlayOpacity} />
              </div>
            </div>
          )}

          {/* ── EXTRAS ── */}
          <SectionHeader title="Extras" icon="✏️" section="extras" active={activeSection} onToggle={toggleSection} />
          {activeSection === 'extras' && (
            <div className="panel-section">
              <div className="panel-hint">Sheet Title</div>
              <input type="text" className="panel-input title-input" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />

              <div className="panel-hint">Footer Message</div>
              <input type="text" className="panel-input" value={footerText} onChange={e => setFooterText(e.target.value)}
                placeholder="Made with love by Lauren" />

              <div className="panel-hint">Watermark Emoji</div>
              <div className="watermark-grid">
                {['', '🧠', '🐾', '🌸', '💜', '✨', '🍄', '🐸', '☀️', '🦴'].map(e => (
                  <button key={e} className="watermark-btn" data-active={String(watermarkEmoji === e)}
                    onClick={() => setWatermarkEmoji(e)}
                    style={{ fontSize: e ? 18 : 11, color: e ? undefined : 'rgba(255,255,255,0.3)' }}>
                    {e || '∅'}
                  </button>
                ))}
              </div>

              <label className="border-label">
                <input type="checkbox" checked={pageBorder} onChange={e => setPageBorder(e.target.checked)} style={{ accentColor: '#80D8D0' }} />
                Decorative page border
              </label>
            </div>
          )}

        </div>

        <div className="panel-footer">
          <button className="panel-print-btn" onClick={handlePrint}>🖨️ Print / Export PDF</button>
        </div>
      </div>
      {/* ===== FLOATING STICKER DOCK ===== */}
      <div className="sticker-dock no-print" data-panel={String(panelOpen)}>
        <div className="sticker-tabs">
          {Object.keys(STICKER_CATEGORIES).map(cat => {
            const isActive = cat === activeStickerCat && stickerDockOpen;
            const emoji = cat.split(' ')[0];
            return (
              <button key={cat} className="sticker-tab" data-active={String(isActive)}
                onClick={() => { setActiveStickerCat(cat); setStickerDockOpen(true); }}
                title={cat}>
                {emoji}
              </button>
            );
          })}
          <button className="sticker-tab scatter" onClick={scatterStickers} title="Scatter!">🎲</button>
          <button className="sticker-tab undo" onClick={undoStickers} title="Undo (Cmd+Z)">↩</button>
          <button className="sticker-tab clear" onClick={clearStickers} title="Clear all stickers">×</button>
        </div>

        <div className="sticker-palette" data-open={String(stickerDockOpen)}>
          <div className="sticker-palette-inner">
            {(STICKER_CATEGORIES[activeStickerCat] || []).map(emoji => {
              const isSelected = selectedEmojis.has(emoji);
              return (
                <span key={emoji} className="sticker-emoji" data-selected={String(isSelected)}
                  onClick={() => {
                    setSelectedEmojis(prev => {
                      const next = new Set(prev);
                      if (next.has(emoji)) next.delete(emoji); else next.add(emoji);
                      return next;
                    });
                  }}>
                  {emoji}
                </span>
              );
            })}
            {selectedEmojis.size > 0 && (
              <button className="sticker-size-btn" style={{ marginLeft: 4, fontSize: 9 }}
                onClick={() => setSelectedEmojis(new Set())}>
                Clear ({selectedEmojis.size})
              </button>
            )}
            <div className="sticker-size-group">
              {([['S', 22], ['M', 36], ['L', 52], ['XL', 74]] as const).map(([label, sz]) => (
                <button key={label} className="sticker-size-btn" data-active={String(stickerSize === sz)}
                  onClick={() => setStickerSize(sz)}>
                  {label}
                </button>
              ))}
            </div>
            {/* Opacity slider */}
            <div className="sticker-opacity-row">
              <span className="sticker-opacity-label">👻</span>
              <input type="range" min={10} max={100} value={stickerOpacity}
                onChange={e => setStickerOpacity(Number(e.target.value))}
                className="sticker-opacity-slider" />
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
    <button onClick={() => onToggle(section)} className="section-header-btn" data-open={String(isOpen)}>
      <span className="section-header-icon">{icon}</span>
      <span className="section-header-title">{title}</span>
      <span className="section-header-arrow">›</span>
    </button>
  );
}

function PanelLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="panel-label" style={style}>{children}</div>;
}

function SliderRow({ value, min, max, suffix, onChange }: {
  value: number; min: number; max: number; suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row">
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="slider-row-input" />
      <span className="slider-row-value">{value}{suffix}</span>
    </div>
  );
}

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="color-pick">
      <div className="color-pick-label">{label}</div>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="color-pick-input" />
    </div>
  );
}
