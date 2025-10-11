// Minimal CSV/text cleaner running fully in-browser
const fileInput = document.getElementById('fileInput');
const textInput = document.getElementById('textInput');
const cleanBtn = document.getElementById('cleanBtn');
const output = document.getElementById('output');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const stats = document.getElementById('stats');

function parseCSV(text){
  // naive CSV split by lines — keeps commas inside quotes as-is for MVP
  return text.replace(/\r/g,'').split('\n').map(l=>l);
}

function toCSV(lines){
  return lines.join('\n');
}

function cleanLines(lines, opts){
  let originalCount = lines.length;
  // trim
  if(opts.trimSpaces) lines = lines.map(l=>l.trim());
  // remove empty
  if(opts.removeEmpty) lines = lines.filter(l=>l.length>0);

  // dedupe
  if(opts.removeDuplicates){
    if(opts.dedupeColumn === null){
      lines = Array.from(new Set(lines));
    } else {
      const seen = new Set();
      const out = [];
      for(const line of lines){
        const cols = line.split(',');
        const key = (cols[opts.dedupeColumn] || '').trim();
        if(!seen.has(key)){
          seen.add(key);
          out.push(line);
        }
      }
      lines = out;
    }
  }

  return {lines,originalCount,cleanCount:lines.length};
}

cleanBtn.addEventListener('click', ()=>{
  const hasHeader = document.getElementById('hasHeader').checked;
  const trimSpaces = document.getElementById('trimSpaces').checked;
  const removeEmpty = document.getElementById('removeEmpty').checked;
  const removeDuplicates = document.getElementById('removeDuplicates').checked;
  const dedupeColumnInput = document.getElementById('dedupeColumn').value.trim();
  const dedupeColumn = dedupeColumnInput === '' ? null : Math.max(0, parseInt(dedupeColumnInput,10));

  let text = textInput.value;
  if(!text){
    alert('Please paste text or upload a CSV first.');
    return;
  }

  let lines = parseCSV(text);
  let header = null;
  if(hasHeader && lines.length>0){
    header = lines.shift();
  }

  const result = cleanLines(lines, {trimSpaces, removeEmpty, removeDuplicates, dedupeColumn});
  let outputLines = result.lines;
  if(header !== null) outputLines.unshift(header);

  output.value = outputLines.slice(0,100).join('\n');
  stats.textContent = `Rows: ${result.originalCount} → ${result.cleanCount}`;
});

fileInput.addEventListener('change', e=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ev => textInput.value = ev.target.result;
  reader.readAsText(f);
});

downloadBtn.addEventListener('click', ()=>{
  const text = output.value || textInput.value;
  if(!text) return alert('Nothing to download. Clean or paste data first.');
  const blob = new Blob([text], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tidy-data.csv'; a.click();
  URL.revokeObjectURL(url);
});

copyBtn.addEventListener('click', async ()=>{
  const text = output.value || textInput.value;
  if(!text) return alert('Nothing to copy.');
  try{ await navigator.clipboard.writeText(text); alert('Copied to clipboard'); }catch(e){ alert('Copy failed, please copy manually.'); }
});

// Optional: simple drag/drop UX
const dropArea = document.getElementById('dropArea');
['dragenter','dragover'].forEach(ev=>dropArea.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();dropArea.classList.add('dragging')}));
['dragleave','drop'].forEach(ev=>dropArea.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();dropArea.classList.remove('dragging')}));

dropArea.addEventListener('drop', e=>{
  const f = e.dataTransfer.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ev => textInput.value = ev.target.result;
  reader.readAsText(f);
});