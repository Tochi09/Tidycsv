// 🚀 Advanced CSV Cleaner — Stable, Smart, and Privacy-Safe
const fileInput = document.getElementById('fileInput');
const textInput = document.getElementById('textInput');
const cleanBtn = document.getElementById('cleanBtn');
const output = document.getElementById('output');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const stats = document.getElementById('stats');

/* ============================
   🧠 Robust CSV Parser
============================ */
function parseCSV(text) {
  const rows = [];
  let row = [], current = '', inQuotes = false;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(current);
      rows.push(row.map(v => v.trim()));
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row.map(v => v.trim()));
  }

  return rows.filter(r => r.join('').trim().length > 0);
}

/* ============================
   🧹 Convert Back to CSV
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
  return value;
}

function normalizeCountry(country) {
  if (!country) return '';
  country = country.trim().toUpperCase();
  // Handle common variants
  if (country === 'US' || country === 'USA' || country === 'UNITED STATES') return 'USA';
  if (country === 'UK' || country === 'UNITED KINGDOM' || country === 'ENGLAND') return 'UK';
  if (country === 'CA' || country === 'CAN' || country === 'CANADA') return 'CANADA';
  return country;
}

function normalizeOccupation(occ) {
  if (!occ) return '';
  occ = occ.trim();

  // Acronyms stay uppercase
  const upperAcronyms = ['CEO', 'CTO', 'CFO', 'UI/UX', 'HR', 'IT', 'PM'];
  if (upperAcronyms.includes(occ.toUpperCase())) return occ.toUpperCase();

  // Proper case for regular roles
  return occ
    .split(' ')
    .map(w => {
      const word = w.trim();
      if (!word) return '';
      if (upperAcronyms.includes(word.toUpperCase())) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
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

  if (opts.removeEmpty) {
    cleaned = cleaned.filter(row => row.join('').trim().length > 0);
  }

  // Detect likely column indexes by header
  const header = rows[0] || [];
  const emailIndex = header.findIndex(h => /email/i.test(h));
  const countryIndex = header.findIndex(h => /country/i.test(h));
  const occIndex = header.findIndex(h => /occupation|job|title/i.test(h));

  // Normalize countries & occupations if columns exist
  cleaned = cleaned.map((row, i) => {
    if (countryIndex !== -1 && row[countryIndex])
      row[countryIndex] = normalizeCountry(row[countryIndex]);
    if (occIndex !== -1 && row[occIndex])
      row[occIndex] = normalizeOccupation(row[occIndex]);
    return row;
  });

  // Deduplication with lowercase email preference
  if (opts.removeDuplicates) {
    const seen = new Map();
    for (let row of cleaned) {
      const email = emailIndex !== -1 ? (row[emailIndex] || '').toLowerCase().trim() : '';
      const simplifiedRow = row
        .join('|')
        .toLowerCase()
        .replace(/[\s.,'"-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const key = email || simplifiedRow;

      if (seen.has(key)) {
        const existing = seen.get(key);
        const existingEmail = emailIndex !== -1 ? existing[emailIndex] : '';
        if (email && /[A-Z]/.test(existingEmail) && existingEmail.toLowerCase() === email) {
          seen.set(key, row);
        }
      } else {
        seen.set(key, row);
      }
    }
    cleaned = Array.from(seen.values());
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
  if (hasHeader && rows.length > 0) header = rows.shift();

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
