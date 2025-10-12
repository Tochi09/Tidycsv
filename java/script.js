// Advanced CSV Cleaner — In-Browser, Privacy Safe
const fileInput = document.getElementById('fileInput');
const textInput = document.getElementById('textInput');
const cleanBtn = document.getElementById('cleanBtn');
const output = document.getElementById('output');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const stats = document.getElementById('stats');

/* ============================
   CSV Parsing & Cleaning Utils
============================ */

function parseCSV(text) {
  // Handles commas inside quotes — more robust than naive split
  const rows = [];
  let row = [], current = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current.length > 0 || row.length > 0) row.push(current.trim());
  if (row.length > 0) rows.push(row);
  return rows;
}

function toCSV(rows) {
  return rows.map(r => 
    r.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

function normalizeCell(value) {
  // Remove extra spaces, normalize casing (Title Case for words)
  value = value.trim().replace(/\s+/g, ' ');
  if (/^[a-z\s]+$/i.test(value)) {
    return value
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return value;
}

function cleanRows(rows, opts) {
  const originalCount = rows.length;
  let cleaned = rows;

  // Trim, normalize
  if (opts.trimSpaces) {
    cleaned = cleaned.map(row => row.map(cell => normalizeCell(cell)));
  }

  // Remove empty rows
  if (opts.removeEmpty) {
    cleaned = cleaned.filter(row => row.join('').trim().length > 0);
  }

  // Case-insensitive dedupe
  if (opts.removeDuplicates) {
    const seen = new Set();
    const deduped = [];
    for (const row of cleaned) {
      let key;
      if (opts.dedupeColumn === null) {
        key = row.join(',').toLowerCase();
      } else {
        key = (row[opts.dedupeColumn] || '').toLowerCase().trim();
      }
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(row);
      }
    }
    cleaned = deduped;
  }

  return { rows: cleaned, originalCount, cleanCount: cleaned.length };
}

/* ============================
   UI Logic
============================ */

cleanBtn.addEventListener('click', () => {
  const hasHeader = document.getElementById('hasHeader').checked;
  const trimSpaces = document.getElementById('trimSpaces').checked;
  const removeEmpty = document.getElementById('removeEmpty').checked;
  const removeDuplicates = document.getElementById('removeDuplicates').checked;
  const dedupeColumnInput = document.getElementById('dedupeColumn').value.trim();
  const dedupeColumn = dedupeColumnInput === '' ? null : Math.max(0, parseInt(dedupeColumnInput, 10));

  const text = textInput.value;
  if (!text.trim()) return alert('Please paste text or upload a CSV first.');

  let rows = parseCSV(text);
  let header = null;

  if (hasHeader && rows.length > 0) {
    header = rows.shift();
  }

  const result = cleanRows(rows, { trimSpaces, removeEmpty, removeDuplicates, dedupeColumn });
  const outputRows = header ? [header, ...result.rows] : result.rows;

  output.value = toCSV(outputRows.slice(0, 100));
  stats.textContent = `Rows: ${result.originalCount} → ${result.cleanCount}`;
});

/* ============================
   File Handling
============================ */
fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => textInput.value = ev.target.result;
  reader.readAsText(f);
});

/* ============================
   Download / Copy
============================ */
downloadBtn.addEventListener('click', () => {
  const text = output.value || textInput.value;
  if (!text) return alert('Nothing to download.');
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tidy-data.csv';
  a.click();
  URL.revokeObjectURL(url);
});

copyBtn.addEventListener('click', async () => {
  const text = output.value || textInput.value;
  if (!text) return alert('Nothing to copy.');
  try {
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  } catch {
    alert('Copy failed. Please copy manually.');
  }
});

/* ============================
   Drag & Drop
============================ */
const dropArea = document.getElementById('dropArea');
['dragenter', 'dragover'].forEach(ev => dropArea.addEventListener(ev, e => {
  e.preventDefault();
  e.stopPropagation();
  dropArea.classList.add('dragging');
}));
['dragleave', 'drop'].forEach(ev => dropArea.addEventListener(ev, e => {
  e.preventDefault();
  e.stopPropagation();
  dropArea.classList.remove('dragging');
}));

dropArea.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => textInput.value = ev.target.result;
  reader.readAsText(f);
});