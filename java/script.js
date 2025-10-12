// 🚀 Advanced CSV Cleaner — Handles quotes, commas, case normalization, deduping
const fileInput = document.getElementById('fileInput');
const textInput = document.getElementById('textInput');
const cleanBtn = document.getElementById('cleanBtn');
const output = document.getElementById('output');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const stats = document.getElementById('stats');

/* ============================
   🧠 CSV Parsing (Proper)
============================ */
function parseCSV(text) {
  const rows = [];
  let row = [], current = '', inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && next === '"') { 
      current += '"'; 
      i++; 
    } 
    else if (char === '"') {
      inQuotes = !inQuotes;
    } 
    else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } 
    else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
      }
    } 
    else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  // Remove blank lines
  return rows.filter(r => r.join('').trim().length > 0);
}

/* ============================
   🧹 CSV to Text
============================ */
function toCSV(rows) {
  return rows.map(row =>
    row.map(cell => {
      if (cell == null) return '';
      cell = cell.toString().trim();
      return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
    }).join(',')
  ).join('\n');
}

/* ============================
   ✨ Normalization Helpers
============================ */
function normalizeCell(value) {
  if (!value) return '';
  value = value.trim().replace(/\s+/g, ' ');
  // Title Case only if it’s mostly alphabetic
  if (/^[a-z\s]+$/i.test(value)) {
    return value
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return value;
}

/* ============================
   🧼 Cleaning Logic
============================ */
function cleanRows(rows, opts) {
  const originalCount = rows.length;
  let cleaned = rows.map(r => r.map(c => c.trim()));

  if (opts.trimSpaces) {
    cleaned = cleaned.map(row => row.map(cell => normalizeCell(cell)));
  }

  // Remove empty rows
  if (opts.removeEmpty) {
    cleaned = cleaned.filter(row => row.join('').trim().length > 0);
  }

  // Dedupe (case-insensitive)
  if (opts.removeDuplicates) {
    const seen = new Set();
    const deduped = [];
    for (let i = 0; i < cleaned.length; i++) {
      const row = cleaned[i];
      const key =
        opts.dedupeColumn === null
          ? row.join('|').toLowerCase()
          : (row[opts.dedupeColumn] || '').toLowerCase().trim();

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
   ⚙️ Button Logic
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
  const finalRows = header ? [header, ...result.rows] : result.rows;

  output.value = toCSV(finalRows.slice(0, 100));
  stats.textContent = `Rows: ${result.originalCount} → ${result.cleanCount}`;
});

/* ============================
   📂 File Handling
============================ */
fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => textInput.value = ev.target.result;
  reader.readAsText(f);
});

/* ============================
   💾 Download & Copy
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
   📥 Drag & Drop
============================ */
const dropArea = document.getElementById('dropArea');
['dragenter', 'dragover'].forEach(ev =>
  dropArea.addEventListener(ev, e => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('dragging');
  })
);
['dragleave', 'drop'].forEach(ev =>
  dropArea.addEventListener(ev, e => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragging');
  })
);
dropArea.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => (textInput.value = ev.target.result);
  reader.readAsText(f);
});
