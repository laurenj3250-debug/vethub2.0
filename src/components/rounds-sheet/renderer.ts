/**
 * Vanilla HTML renderer — ported directly from the working sample HTML.
 * Produces an HTML string for the table body. All clinical logic preserved exactly.
 */
import type { RoundsPatient } from './types';
import { ICONS } from './icons';
import {
  hasOverdueLabs,
  isSurgical,
  getVisitType,
  VISIT_TYPE_COLORS,
  extractVisitDate,
  stripMriPrefix,
  isNoImaging,
  splitImagingByDate,
  labStatus,
  isSeizurePatient,
  shouldShowPhenoRow,
  shouldShowBromideRow,
  parseMeds,
  escapeHtml,
} from './clinical-logic';

export function renderTableRows(patients: RoundsPatient[], today: Date = new Date()): string {
  let html = '';

  patients.forEach((p, i) => {
    // Open slot
    if (p.isBlank) {
      const blankTime = escapeHtml(p.time.split(' ')[0]);
      const blankAmpm = escapeHtml(p.time.split(' ')[1] || '');
      html += `<tr><td class="time-cell" style="border-left:5px solid transparent"><div class="time-pill" style="opacity:0.4"><span class="time-num">${blankTime}</span><span class="time-ampm">${blankAmpm}</span></div></td><td colspan="5" style="text-align:center;font-style:italic;font-size:10px;text-transform:uppercase;opacity:0.4">— Open Slot —</td></tr>`;
      return;
    }

    const vt = getVisitType(p);
    const vc = VISIT_TYPE_COLORS[vt];
    const overdue = hasOverdueLabs(p, today);
    const timeParts = p.time.split(' ');
    const needsParts = (p.needsToday || '').split(' · ');
    const vd = extractVisitDate(p.lastVisit);
    const noImaging = isNoImaging(p.imaging || '');
    const stubOpacity = p.isStub ? 'opacity:0.55;' : '';

    const bg = p.isYellow
      ? 'var(--consult-row)'
      : i % 2 === 0
        ? 'var(--row-even)'
        : 'var(--row-odd)';

    html += `<tr style="background:${bg};${stubOpacity}" data-pidx="${i}">`;

    // Cell 1: Time
    html += `<td class="time-cell" style="border-left:5px solid ${vc.stripe}" data-field="time">`;
    html += `<input type="checkbox" class="time-cb no-print" onchange="this.closest('tr').classList.toggle('checked')">`;
    html += `<div class="time-pill"><span class="time-num">${escapeHtml(timeParts[0])}</span><span class="time-ampm">${escapeHtml(timeParts[1] || '')}</span></div>`;
    html += `</td>`;

    // Cell 2: Patient
    html += `<td class="patient-cell" data-field="name">`;
    html += `<div class="patient-name">${escapeHtml(p.name)}`;
    if (overdue) {
      html += `<span class="overdue-dot" title="Overdue labs"></span>`;
    }
    html += `</div>`;
    html += `<div class="patient-owner">${escapeHtml(p.owner)}</div>`;
    html += `<div class="patient-species">${escapeHtml(p.species)}</div>`;
    html += `</td>`;

    // Cell 3: Today's Plan
    html += `<td class="plan-cell" data-field="needsToday">`;
    html += `<div class="visit-badge" style="background:${vc.bg};border:1px solid ${vc.border}">`;
    html += `<div class="badge-line1" style="color:${vc.text}">${escapeHtml(needsParts[0] || '')}</div>`;
    if (needsParts[1]) {
      html += `<div class="badge-line2">${escapeHtml(needsParts[1])}</div>`;
    }
    html += `</div></td>`;

    // Cell 4: Case Profile
    html += `<td data-field="dx">`;
    if (p.isStub) {
      html += `<div class="dx-line">${ICONS.brain}<span class="dx-text">${escapeHtml(p.dx || 'Chart Pending')}</span></div>`;
      html += `<div class="visit-text" style="color:#8AAFAD;font-style:italic;margin-top:4px">Chart Pending</div>`;
    } else {
      html += `<div class="dx-line">${ICONS.brain}<span class="dx-text">${escapeHtml(p.dx)}</span></div>`;
      html += `<div class="visit-text" style="margin-top:4px">`;
      if (vd.dateHeader) {
        html += `<span style="font-weight:800;font-size:10px;color:var(--text-secondary)">${escapeHtml(vd.dateHeader)}:</span> ${escapeHtml(vd.summary)}`;
      } else {
        html += escapeHtml(p.lastVisit);
      }
      html += `</div>`;
    }
    html += `</td>`;

    // Cell 5: Imaging / Surgery (merged)
    html += `<td data-field="imaging">`;
    if (isSurgical(p.surgery)) {
      html += `<div style="display:flex;align-items:flex-start;gap:4px;margin-bottom:5px">${ICONS.scissors}<span class="surgery-text">${escapeHtml(p.surgery)}</span></div>`;
    }
    html += `<div class="imaging-content">`;
    if (p.imagingLink) {
      html += `<a href="${escapeHtml(p.imagingLink)}" target="_blank" rel="noopener" class="img-link">${ICONS.magnet}</a>`;
    } else {
      html += ICONS.magnet;
    }
    if (noImaging) {
      html += `<span class="no-mri">NO MRI ON FILE</span>`;
    } else {
      const blocks = splitImagingByDate(p.imaging || '');
      if (blocks.length > 1) {
        blocks.forEach((block) => {
          html += `<div class="imaging-block">`;
          if (block.dateLabel) {
            html += `<div class="imaging-date-label">${escapeHtml(block.dateLabel)}</div>`;
          }
          html += `<div class="imaging-text">${escapeHtml(block.findings)}</div>`;
          html += `</div>`;
        });
      } else if (blocks.length === 1) {
        html += `<div class="imaging-text">${escapeHtml(blocks[0].findings)}</div>`;
      }
    }
    html += `</div>`;
    // Results box
    if (p.resultsBox && p.resultsBox.length > 0) {
      html += `<div class="results-box">`;
      html += `<div class="results-header">RESULTS RETURNED</div>`;
      p.resultsBox.forEach(r => {
        const flagHtml = r.flag ? ` <span style="font-weight:900;color:#D4644A">${escapeHtml(r.flag)}</span>` : '';
        const pendingStyle = r.isPending ? 'font-style:italic;color:#D4AA28;' : '';
        html += `<div class="results-row" style="${pendingStyle}"><span class="results-label">${escapeHtml(r.label)}</span><span class="results-val">${escapeHtml(r.val)}${flagHtml}</span></div>`;
      });
      html += `</div>`;
    }
    html += `</td>`;

    // Cell 6: Meds & Labs
    html += `<td class="meds-cell" data-field="meds">`;
    html += `<div class="meds-label">${ICONS.pill} MEDICATIONS</div>`;
    if (p.isStub) {
      html += `<div class="med-item" style="color:#8AAFAD">---</div>`;
    } else {
      parseMeds(p.meds).forEach(med => {
        html += `<div class="med-item">${escapeHtml(med)}</div>`;
      });
    }
    // Lab box
    html += `<div class="lab-box">`;
    if (p.isStub) {
      html += `<div class="lab-row"><span class="lab-label">CBC/CHEM:</span><span class="lab-val" style="color:#8AAFAD">---</span></div>`;
    } else if (p.isCytosar && p.lastChem) {
      const cbcStatus = labStatus(p.lastCBC, 365, today);
      const chemStatus = labStatus(p.lastChem, 365, today);
      html += `<div class="lab-row"><span class="lab-label">CBC:</span><span class="lab-val" style="color:${cbcStatus.color}">${p.lastCBC ? escapeHtml(p.lastCBC) + ' \u2022 ' + cbcStatus.text : '—'}</span></div>`;
      html += `<div class="lab-row"><span class="lab-label">CHEM:</span><span class="lab-val" style="color:${chemStatus.color}">${p.lastChem ? escapeHtml(p.lastChem) + ' \u2022 ' + chemStatus.text : '—'}</span></div>`;
      html += `<div class="lab-row"><span class="lab-label" style="color:#D4644A">CYTOSAR:</span><span class="lab-val" style="color:#D4644A;font-weight:900">CBC REQUIRED TODAY</span></div>`;
    } else {
      const cbcStatus = labStatus(p.lastCBC, 365, today);
      html += `<div class="lab-row"><span class="lab-label">CBC/CHEM:</span><span class="lab-val" style="color:${cbcStatus.color}">${p.lastCBC ? escapeHtml(p.lastCBC) + ' \u2022 ' + cbcStatus.text : '—'}</span></div>`;
    }

    // Phenobarbital row
    if (shouldShowPhenoRow(p)) {
      if (p.lastPhenoDate) {
        const phenoStatus = labStatus(p.lastPhenoDate, 180, today);
        html += `<div class="lab-row"><span class="lab-label">PHENO:</span><span class="lab-val" style="color:${phenoStatus.color}">${escapeHtml(p.lastPhenoDate)} (${escapeHtml(p.lastPhenoVal || '?')}) \u2022 ${phenoStatus.text}</span></div>`;
      } else {
        html += `<div class="lab-row"><span class="lab-label">PHENO:</span><span class="lab-val" style="color:#8AAFAD">NOT ON FILE</span></div>`;
      }
    }

    // Bromide row
    if (shouldShowBromideRow(p)) {
      if (p.lastKBrDate) {
        const kbrStatus = labStatus(p.lastKBrDate, 180, today);
        html += `<div class="lab-row"><span class="lab-label">BROMIDE:</span><span class="lab-val" style="color:${kbrStatus.color}">${escapeHtml(p.lastKBrDate)} (${escapeHtml(p.lastKBrVal || '?')}) \u2022 ${kbrStatus.text}</span></div>`;
      } else if (p.onKBr) {
        html += `<div class="lab-row"><span class="lab-label">BROMIDE:</span><span class="lab-val" style="color:#8AAFAD">NOT ON FILE</span></div>`;
      }
    }

    html += `</div></td>`;

    html += `</tr>`;
  });

  return html;
}

export function renderHeader(dateString: string): string {
  return `
    <div class="rounds-header">
      <div>
        <h1 class="rounds-title">Neurology Rounds</h1>
        <div class="rounds-subtitle">Red Bank \u2022 ${escapeHtml(dateString)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div class="legend no-print">
          <div class="legend-item"><div class="legend-bar" style="background:#7B8FA1;"></div>Med Mgmt</div>
          <div class="legend-item"><div class="legend-bar" style="background:#8FAD82;"></div>Post-Op</div>
          <div class="legend-item"><div class="legend-bar" style="background:#D4AA28;"></div>New Consult</div>
          <div class="legend-item"><div class="legend-dot"></div>Overdue</div>
        </div>
      </div>
    </div>
  `;
}
