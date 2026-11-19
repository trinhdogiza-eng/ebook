import * as db from './db.js';
import * as sync from './sync.js';
import { PdfReader, openPdf, pdfInfo, isPdfBuffer } from './pdf-reader.js';
import { Speaker, ttsSupported, voices, isVietnamese, pickVoice, unlockSpeech, splitSentences } from './read-aloud.js';

/* global ePub */
const APP_VERSION = '1.7';
const $ = (id) => document.getElementById(id);
$('appVersion').textContent = `Phiên bản ${APP_VERSION}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pctText = (p) => `${Math.round((p || 0) * 100)}%`;

/* ================= Thiết bị & cài đặt ================= */
function lsGet(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } }

function guessDeviceName() {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Điện thoại Android' : 'Máy tính bảng Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Thiết bị';
}
let deviceId = lsGet('deviceId', null);
if (!deviceId) { deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36); lsSet('deviceId', deviceId); }
let deviceName = lsGet('deviceName', guessDeviceName());

const settings = Object.assign(
  { fontSize: 100, lineHeight: 1.5, fontFamily: '', theme: 'light', flow: 'paginated', pageAnim: 'slide', ttsRate: 1.5, ttsVoice: '' },
  lsGet('settings', {}),
);
const saveSettings = () => lsSet('settings', settings);
document.body.dataset.theme = settings.theme;

const THEMES = {
  light: { bg: '#ffffff', fg: '#1f1d1a', link: '#b5532c', bar: '#f7f4ee' },
  sepia: { bg: '#f4ecd8', fg: '#3b2f22', link: '#9c4a1f', bar: '#f4ecd8' },
  dark: { bg: '#161514', fg: '#d9d3c7', link: '#e08a5e', bar: '#161514' },
};

/* ================= Băm tệp (định danh sách giống nhau trên mọi thiết bị) ================= */
function hashBuffer(buf) {
  const bytes = new Uint8Array(buf);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    h1 = Math.imul(h1 ^ b, 2654435761);
    h2 = Math.imul(h2 ^ b, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0') + '-' + bytes.length.toString(36);
}

/* ================= Thông báo ================= */
let toastTimer = null;
function toast(msg, actionLabel, onAction, ms = 5000) {
  $('toastMsg').textContent = msg;
  const btn = $('toastAction');
  if (actionLabel) {
    btn.textContent = actionLabel; btn.hidden = false;
    btn.onclick = () => { hideToast(); onAction(); };
  } else btn.hidden = true;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(hideToast, ms);
}
function hideToast() { $('toast').hidden = true; }
$('toastClose').onclick = hideToast;

/* ================= Thư viện ================= */
let remoteMap = {};      // bookId -> dữ liệu đồng bộ
let unwatchAll = () => {};
const coverUrls = [];

function newer(a, b) { return (a?.updatedAt || 0) >= (b?.updatedAt || 0) ? a : b; }

async function renderLibrary() {
  const [books, progress] = await Promise.all([db.all('books'), db.all('progress')]);
  const prog = Object.fromEntries(progress.map((p) => [p.id, p]));
  books.sort((a, b) => {
    const ta = newer(prog[a.id], remoteMap[a.id])?.updatedAt || a.addedAt;
    const tb = newer(prog[b.id], remoteMap[b.id])?.updatedAt || b.addedAt;
    return tb - ta;
  });
  coverUrls.splice(0).forEach((u) => URL.revokeObjectURL(u));

  const grid = $('bookGrid');
  grid.innerHTML = '';
  $('emptyState').hidden = books.length > 0;
  for (const b of books) {
    const p = newer(prog[b.id], remoteMap[b.id]);
    const el = document.createElement('div');
    el.className = 'book';
    let coverHtml = `<div class="ph">${esc(b.title)}</div>`;
    if (b.cover) { const u = URL.createObjectURL(b.cover); coverUrls.push(u); coverHtml = `<img src="${u}" alt="">`; }
    el.innerHTML = `
      <div class="cover">${coverHtml}${b.format === 'pdf' ? '<span class="badge">PDF</span>' : ''}</div>
      <button class="del" title="Xoá khỏi máy này" aria-label="Xoá">✕</button>
      <div class="meta">
        <div class="t">${esc(b.title)}</div>
        <div class="a">${esc(b.author) || '&nbsp;'}</div>
        <div class="bar"><i style="width:${Math.round((p?.percent || 0) * 100)}%"></i></div>
      </div>`;
    el.onclick = () => openBook(b.id);
    el.querySelector('.del').onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`Xoá “${b.title}” khỏi máy này? (Tiến độ đã đồng bộ vẫn được giữ.)`)) return;
      await db.removeBook(b.id);
      renderLibrary();
    };
    grid.appendChild(el);
  }

  // Sách đang đọc ở thiết bị khác nhưng máy này chưa có tệp
  const localIds = new Set(books.map((b) => b.id));
  const remoteOnly = Object.entries(remoteMap)
    .filter(([id, r]) => !localIds.has(id) && r.title)
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  $('remoteSection').hidden = remoteOnly.length === 0;
  const list = $('remoteList');
  list.innerHTML = '';
  const u = sync.currentUser();
  for (const [id, r] of remoteOnly) {
    const el = document.createElement('div');
    el.className = 'remote-item';
    const where = r.deviceName ? ` · ${esc(r.deviceName)}` : '';
    const canDownload = u && !u.needsReconnect && r.source?.provider === u.provider;
    el.innerHTML = `<div class="info"><div class="t">${esc(r.title)}</div>
      <div class="s">${esc(r.author || '')}${r.author ? ' · ' : ''}${pctText(r.percent)}${where}</div></div>
      <button class="btn small ${canDownload ? 'primary' : ''}">${canDownload ? `Tải từ ${esc(u.providerName)}` : 'Chọn tệp…'}</button>`;
    el.querySelector('button').onclick = canDownload
      ? () => downloadAndOpen(r.source.id, r.title, id)
      : () => $('fileInput').click();
    list.appendChild(el);
  }
}

// Tải sách từ OneDrive / Google Drive rồi mở
async function downloadAndOpen(fileId, name, expectedId) {
  try {
    toast(`Đang tải “${name}”…`, null, null, 0);
    const buf = await sync.download(fileId);
    const fileName = /\.(epub|pdf)$/i.test(name) ? name : `${name}${isPdfBuffer(buf) ? '.pdf' : '.epub'}`;
    const { id } = await importBuffer(buf, fileName, { provider: sync.currentUser().provider, id: fileId });
    hideToast();
    if (expectedId && id !== expectedId) toast('Tệp trên đám mây đã thay đổi so với lúc đọc — sẽ mở như sách mới');
    $('cloudDialog').close();
    openBook(id);
  } catch (e) {
    console.error(e);
    toast(`Không tải được: ${sync.errorText(e)}`);
  }
}

/* ----- Trình duyệt tệp trên đám mây ----- */
const cloudNav = { stack: [] }; // [{ id, name }]
async function showCloudFolder() {
  const cur = cloudNav.stack[cloudNav.stack.length - 1];
  $('cloudTitle').textContent = cur ? cur.name : sync.currentUser().providerName;
  $('cloudPath').textContent = cloudNav.stack.length ? ['…', ...cloudNav.stack.map((s) => s.name)].slice(-3).join(' / ') : 'Thư mục gốc';
  $('cloudUp').style.visibility = cloudNav.stack.length ? 'visible' : 'hidden';
  await loadCloudItems(() => sync.listFolder(cur?.id || null));
}
async function loadCloudItems(loader) {
  const list = $('cloudList');
  list.innerHTML = '';
  $('cloudStatus').textContent = 'Đang tải danh sách…';
  try {
    const [items, books] = await Promise.all([loader(), db.all('books')]);
    const have = new Set(books.map((b) => b.source?.id).filter(Boolean));
    $('cloudStatus').textContent = items.length ? '' : 'Không có thư mục con hay tệp EPUB/PDF nào ở đây.';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `cloud-item${have.has(it.id) ? ' have' : ''}`;
      const size = it.isFolder ? '' : have.has(it.id) ? 'Đã có' : `${(it.size / 1048576).toFixed(1)} MB`;
      b.innerHTML = `<span class="ic">${it.icon || (it.isFolder ? '📁' : /\.pdf$/i.test(it.name) ? '📄' : '📖')}</span><span class="nm">${esc(it.name)}</span><span class="sz">${size}</span>`;
      b.onclick = it.isFolder
        ? () => { cloudNav.stack.push({ id: it.id, name: it.name }); $('cloudSearch').value = ''; showCloudFolder(); }
        : () => downloadAndOpen(it.id, it.name);
      list.appendChild(b);
    }
  } catch (e) {
    $('cloudStatus').textContent = `Lỗi: ${sync.errorText(e)}`;
  }
}
$('btnCloud').onclick = () => {
  const u = sync.currentUser();
  if (u?.needsReconnect) { $('btnAccount').click(); return; }
  $('cloudDialog').showModal();
  if (!$('cloudList').children.length) showCloudFolder();
};
$('cloudClose').onclick = () => $('cloudDialog').close();
$('cloudUp').onclick = () => { cloudNav.stack.pop(); showCloudFolder(); };
$('cloudSearchForm').onsubmit = (e) => {
  e.preventDefault();
  const q = $('cloudSearch').value.trim();
  if (!q) { showCloudFolder(); return; }
  $('cloudTitle').textContent = `Tìm “${q}”`;
  $('cloudPath').textContent = sync.currentUser().providerName;
  $('cloudUp').style.visibility = 'hidden';
  loadCloudItems(() => sync.search(q));
};

// Thêm một tệp EPUB/PDF (từ máy hoặc từ đám mây) vào thư viện. Trả về { id, isNew }.
async function importBuffer(buf, fileName, source) {
  const id = hashBuffer(buf);
  const existing = await db.get('books', id);
  if (existing) {
    if (source && !existing.source) await db.put('books', { ...existing, source });
    return { id, isNew: false };
  }
  if (isPdfBuffer(buf)) {
    const info = await pdfInfo(buf);
    const title = info.title || fileName.replace(/\.pdf$/i, '').trim();
    const author = info.author;
    await db.put('files', { id, data: buf });
    await db.put('books', {
      id, title, author, cover: info.cover, format: 'pdf', pages: info.pages,
      addedAt: Date.now(), fileName, size: buf.byteLength, ...(source ? { source } : {}),
    });
    sync.push(id, { title, author, ...(source ? { source } : {}) }).catch(() => {});
    return { id, isNew: true };
  }
  const book = ePub(buf.slice(0));
  await book.ready;
  const meta = await book.loaded.metadata;
  let cover = null;
  try {
    const url = await book.coverUrl();
    if (url) cover = await (await fetch(url)).blob();
  } catch { /* sách không có bìa */ }
  book.destroy();
  const title = (meta.title || fileName.replace(/\.epub$/i, '')).trim();
  const author = (meta.creator || '').trim();
  await db.put('files', { id, data: buf });
  await db.put('books', { id, title, author, cover, addedAt: Date.now(), fileName, size: buf.byteLength, ...(source ? { source } : {}) });
  sync.push(id, { title, author, ...(source ? { source } : {}) }).catch(() => {});
  return { id, isNew: true };
}

async function importFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!/\.(epub|pdf)$/i.test(file.name) && !['application/epub+zip', 'application/pdf'].includes(file.type)) {
      toast(`Bỏ qua “${file.name}” — không phải tệp EPUB hoặc PDF`); continue;
    }
    try {
      toast(`Đang thêm “${file.name}”…`, null, null, 0);
      const { isNew } = await importBuffer(await file.arrayBuffer(), file.name, null);
      if (isNew) added++; else toast(`“${file.name}” đã có trong thư viện`);
    } catch (e) {
      console.error(e);
      toast(`Không đọc được “${file.name}”: ${e.message || e}`);
    }
  }
  if (added) toast(added === 1 ? 'Đã thêm sách' : `Đã thêm ${added} cuốn sách`, null, null, 2500);
  renderLibrary();
}

$('fileInput').onchange = (e) => { importFiles([...e.target.files]); e.target.value = ''; };

// Kéo thả tệp (Mac / máy tính)
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth++; $('dropOverlay').hidden = false; } });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('dropOverlay').hidden = true; } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0; $('dropOverlay').hidden = true;
  if (e.dataTransfer?.files?.length) importFiles([...e.dataTransfer.files]);
});

/* ================= Trình đọc ================= */
const R = {
  id: null, book: null, rendition: null, meta: null,
  cfi: null, percent: 0, toc: [], flatToc: [],
  lastSavedAt: 0, skipNextSave: false,
  unwatch: () => {}, pushTimer: null, pendingPush: null,
};

if (location.hostname === 'localhost') window.__R = R; // chỉ để kiểm thử trên máy (không có trên trang web thật)

function showView(name) {
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('active', v.id === name);
}

async function openBook(id) {
  const [file, meta, local] = await Promise.all([db.get('files', id), db.get('books', id), db.get('progress', id)]);
  if (!file) { toast('Không tìm thấy tệp sách trên máy này'); return; }
  Object.assign(R, { id, meta, cfi: null, percent: local?.percent || 0, toc: [], flatToc: [] });
  R.kind = meta.format === 'pdf' ? 'pdf' : 'epub';
  showView('reader');
  $('reader').classList.remove('immersive');
  $('reader').classList.toggle('is-pdf', R.kind === 'pdf');
  $('fontLabel').textContent = R.kind === 'pdf' ? 'Phóng to' : 'Cỡ chữ';
  $('rTitle').textContent = meta.title;
  $('rChapter').textContent = meta.author || '';
  $('progressText').textContent = 'Đang mở…';
  $('syncText').textContent = '';
  $('progressSlider').disabled = true;
  renderToc();

  if (R.kind === 'epub') {
    R.book = ePub(file.data);
    // Chạy sau hook thay thế tài nguyên của epub.js (hook đó ghi đè section.output từ bản gốc), nên đợi 1 microtask.
    R.book.spine.hooks.serialize.register((output, section) =>
      Promise.resolve().then(() => { section.output = sanitizeSection(section.output); }));
    R.book.loaded.navigation.then((nav) => { R.toc = nav.toc; R.flatToc = flatten(nav.toc); renderToc(); }).catch(() => {});
  }

  // Chọn vị trí bắt đầu: bản mới nhất giữa máy này và đám mây
  let remote = null;
  if (sync.currentUser()) {
    remote = await Promise.race([sync.fetchOne(id).catch(() => null), new Promise((r) => setTimeout(() => r(null), 3000))]);
  }
  let start = local?.cfi || null;
  let fromOther = null;
  if (remote?.cfi && (remote.updatedAt || 0) > (local?.updatedAt || 0)) {
    start = remote.cfi;
    R.percent = remote.percent || R.percent;
    if (remote.deviceId !== deviceId) fromOther = remote.deviceName || 'thiết bị khác';
  }
  R.lastSavedAt = Math.max(local?.updatedAt || 0, remote?.updatedAt || 0);

  if (R.kind === 'pdf') { if (!(await openPdfReader(file.data, start))) return; }
  else await createRendition(start);
  if (fromOther) toast(`Đã chuyển đến vị trí bạn đọc trên ${fromOther}`, null, null, 3500);
  updateSyncText();

  R.unwatch = sync.watchOne(id, onRemoteChange);
  if (R.kind === 'epub') loadLocations(id);
}

/* ----- PDF ----- */
// Vị trí trong PDF được lưu/đồng bộ dạng "page:<số trang>" (cùng trường với CFI của EPUB)
const pageOf = (cfi) => { const m = /^page:(\d+)/.exec(cfi || ''); return m ? Number(m[1]) : 1; };

async function openPdfReader(data, startCfi) {
  $('viewer').innerHTML = '';
  let doc;
  try {
    doc = await openPdf(data);
  } catch (e) {
    console.error(e);
    toast(`Không mở được PDF: ${e.message || e}`);
    closeBook();
    return false;
  }
  R.skipNextSave = true; // lần hiển thị đầu không tính là "đọc tiếp"
  R.pdf = new PdfReader({
    container: $('viewer'),
    doc,
    getSettings: () => settings,
    onLocation: onPdfLocation,
    onTap: (x) => tapAt(x),
    onZoom: (z) => {
      $('fontSizeVal').textContent = `${Math.round(z * 100)}%`;
      toast(`Phóng to ${Math.round(z * 100)}%`, null, null, 1000);
    },
  });
  applyChrome();
  R.pdf.outline().then((items) => {
    R.flatToc = items;
    renderToc();
    if (R.pdf) onPdfLocation(R.pdf.page, R.pdf.pages, true);
  }).catch(() => {});
  await R.pdf.start(pageOf(startCfi));
  $('progressSlider').disabled = false;
  return true;
}

function onPdfLocation(page, pages, labelOnly) {
  R.cfi = `page:${page}`;
  R.percent = pages > 1 ? (page - 1) / (pages - 1) : 1;
  // Mục lục: mục có số trang lớn nhất mà không vượt quá trang hiện tại
  let ch = null;
  for (const t of R.flatToc) if (t.page <= page && (!ch || t.page >= ch.page)) ch = t;
  $('rChapter').textContent = ch?.label || `Trang ${page}/${pages}`;
  document.querySelectorAll('#tocList a').forEach((a, i) => a.classList.toggle('current', R.flatToc[i] === ch));
  updateProgressUI();
  if (labelOnly) return;
  if (R.skipNextSave) { R.skipNextSave = false; return; }
  saveProgress(ch?.label || `Trang ${page}`);
}

function goToLocation(cfi) {
  if (R.kind === 'pdf') R.pdf?.goTo(pageOf(cfi));
  else R.rendition?.display(cfi);
}

async function createRendition(cfi) {
  // Đang đọc to mà dựng lại trang (đổi cỡ chữ, nền…) → dừng rồi đọc tiếp sau khi dựng xong
  if (speaker && speaker.state !== 'idle') { ttsRestartAfterRender = speaker.state === 'playing'; speaker.stop(true); ttsUI('idle'); }
  if (R.rendition) { R.rendition.destroy(); R.rendition = null; }
  $('viewer').innerHTML = '';
  const scrolled = settings.flow === 'scrolled-doc';
  const rendition = R.book.renderTo('viewer', {
    width: '100%', height: '100%',
    flow: settings.flow,
    // "continuous": epub.js nạp sẵn chương kế bên cạnh chương đang đọc → sang chương mới cũng trượt mượt
    // như lật trang thường (không phải xoá màn hình rồi dựng lại chương).
    manager: 'continuous',
    spread: 'auto', minSpreadWidth: 900,
    // Safari (iPhone/iPad/Mac) không chuyển sự kiện chạm/vuốt vào iframe bị sandbox thiếu "allow-scripts",
    // nên phải bật. Script trong sách vẫn bị chặn: xem sanitizeSection() (xoá <script> + CSP script-src 'none').
    allowScriptedContent: true,
  });
  R.rendition = rendition;
  rendition.hooks.content.register((contents) => { normalizeText(contents.document); injectStyle(contents); });
  rendition.on('relocated', onRelocated);
  rendition.on('click', onFrameClick);
  rendition.on('touchstart', onTouchStart);
  rendition.on('touchmove', onTouchMove);
  rendition.on('touchend', onTouchEnd);
  rendition.on('keydown', onKey);
  applyChrome();
  R.skipNextSave = true; // lần hiển thị đầu không tính là "đọc tiếp"
  try {
    await rendition.display(cfi || undefined);
  } catch (e) {
    console.warn('Vị trí không hợp lệ, mở từ đầu', e);
    await rendition.display();
  }
  if (ttsRestartAfterRender) { ttsRestartAfterRender = false; setTimeout(ttsStart, 300); }
}

// Không cho mã trong sách chạy (sách có thể chứa <script> hoặc onclick=...):
// xoá script / thuộc tính on* / liên kết javascript:, và thêm CSP chặn mọi script trong trang sách.
const CSP_META = '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'; frame-src \'none\'"/>';
function sanitizeSection(html) {
  if (!html) return html;
  let out = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
  if (/<head\b[^>]*>/i.test(out)) out = out.replace(/<head\b[^>]*>/i, (m) => m + CSP_META);
  else out = out.replace(/<html\b[^>]*>/i, (m) => `${m}<head>${CSP_META}</head>`);
  return out;
}

// Nhiều EPUB tiếng Việt lưu dấu dạng tổ hợp (vd "ê" + dấu sắc rời) → hiển thị dấu bị tách ("Yế u").
// Chuẩn hoá về dạng dựng sẵn (NFC) để chữ hiển thị đúng với mọi phông.
function normalizeText(doc) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const v = n.nodeValue;
    if (/[̀-ͯ]/.test(v)) {
      const nfc = v.normalize('NFC');
      if (nfc !== v) n.nodeValue = nfc;
    }
  }
}

function injectStyle(contents) {
  const t = THEMES[settings.theme] || THEMES.light;
  const doc = contents.document;
  let style = doc.getElementById('__reader_style');
  if (!style) {
    // Cỡ chữ gốc của sách (nhiều sách đặt body cố định theo px, vd 14.6px) — đo trước khi chèn style
    // để A+/A− phóng to/thu nhỏ theo đúng cỡ gốc đó.
    doc.documentElement.dataset.baseFs = parseFloat(contents.window.getComputedStyle(doc.body).fontSize) || 16;
    style = doc.createElement('style'); style.id = '__reader_style'; doc.head.appendChild(style);
  }
  const baseFs = Number(doc.documentElement.dataset.baseFs) || 16;
  const bodyFs = Math.round(baseFs * settings.fontSize) / 100;
  const recolor = settings.theme !== 'light';
  style.textContent = `
    html { font-size: ${settings.fontSize}% !important; background: ${t.bg} !important; touch-action: ${settings.flow === 'paginated' ? 'none' : 'pan-y'}; -webkit-tap-highlight-color: transparent; }
    body { font-size: ${bodyFs}px !important; background: ${t.bg} !important; color: ${t.fg} !important; -webkit-text-size-adjust: none; }
    p, li, blockquote, dd, dt, td, div { line-height: ${settings.lineHeight} !important; }
    ${recolor ? `body *:not(img):not(svg):not(image) { color: inherit !important; background-color: transparent !important; border-color: ${t.fg}33 !important; }` : ''}
    a, a * { color: ${t.link} !important; }
    ::highlight(tts) { background-color: ${settings.theme === 'dark' ? 'rgba(224,138,94,.38)' : 'rgba(255,196,0,.38)'}; }
    ${settings.fontFamily ? `body, body p, body div, body span, body li, body blockquote, body td, body h1, body h2, body h3, body h4 { font-family: ${settings.fontFamily} !important; }` : ''}
    img, svg, image { max-width: 100%; }
  `;
}

function applyChrome() {
  document.body.dataset.theme = settings.theme;
  $('reader').classList.toggle('paginated', settings.flow === 'paginated');
  const t = THEMES[settings.theme];
  document.querySelector('meta[name="theme-color"]').content = t.bar;
  $('viewerWrap').style.background = t.bg;
  $('fontSizeVal').textContent = R.kind === 'pdf' && R.pdf ? `${Math.round(R.pdf.zoom * 100)}%` : `${settings.fontSize}%`;
  $('lhVal').textContent = settings.lineHeight.toFixed(1);
  $('fontFamily').value = settings.fontFamily;
  $('flowMode').value = settings.flow;
  $('pageAnim').value = settings.pageAnim;
  $('pageAnimRow').hidden = settings.flow !== 'paginated';
  document.querySelectorAll('.sw').forEach((b) => b.classList.toggle('active', b.dataset.theme === settings.theme));
}

// Đổi cài đặt hiển thị: dựng lại trang ở đúng vị trí đang đọc
let rerenderTimer = null;
function changeSetting(patch) {
  Object.assign(settings, patch);
  saveSettings();
  applyChrome();
  if (R.kind === 'pdf') { if (R.pdf && ('flow' in patch || 'theme' in patch)) R.pdf.rebuild(); return; }
  if (!R.rendition) return;
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(() => createRendition(R.cfi), 250);
}

function flatten(items, level = 1, out = []) {
  for (const it of items || []) {
    out.push({ label: (it.label || '').trim(), href: it.href, level });
    if (it.subitems?.length) flatten(it.subitems, level + 1, out);
  }
  return out;
}
const baseName = (href) => (href || '').split('#')[0].split('/').pop();

function currentChapter(href) {
  const name = baseName(href);
  return R.flatToc.find((t) => baseName(t.href) === name) || null;
}

function renderToc() {
  const nav = $('tocList');
  nav.innerHTML = '';
  if (!R.flatToc.length) { nav.innerHTML = '<p class="hint" style="padding:16px">Sách không có mục lục.</p>'; return; }
  for (const t of R.flatToc) {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = t.label || '(không tên)';
    if (t.level > 1) a.className = `sub-item${t.level > 2 ? ' l3' : ''}`;
    a.onclick = (e) => {
      e.preventDefault();
      $('tocPanel').hidden = true;
      if (R.kind === 'pdf') R.pdf?.goTo(t.page); else R.rendition.display(t.href);
    };
    nav.appendChild(a);
  }
}

async function loadLocations(id) {
  const book = R.book;
  const cached = await db.get('locations', id);
  if (cached?.json) {
    book.locations.load(cached.json);
  } else {
    $('syncText').textContent = 'Đang tính vị trí…';
    await book.ready;
    await book.locations.generate(1600);
    if (R.book !== book) return;
    db.put('locations', { id, json: book.locations.save() }).catch(() => {});
    updateSyncText();
  }
  if (R.book !== book) return;
  $('progressSlider').disabled = false;
  if (R.cfi) {
    R.percent = book.locations.percentageFromCfi(R.cfi) || R.percent;
    updateProgressUI();
  }
}

function onRelocated(loc) {
  const cfi = loc.start.cfi;
  R.cfi = cfi;
  const book = R.book;
  if (book.locations.length()) R.percent = book.locations.percentageFromCfi(cfi);
  else if (!R.percent || !R.skipNextSave) R.percent = (loc.start.index || 0) / Math.max(1, book.spine.length);
  const ch = currentChapter(loc.start.href);
  $('rChapter').textContent = ch?.label || R.meta.author || '';
  document.querySelectorAll('#tocList a').forEach((a, i) => a.classList.toggle('current', R.flatToc[i] === ch));
  updateProgressUI();

  if (R.skipNextSave) { R.skipNextSave = false; return; }
  saveProgress(ch?.label || '');
}

function updateProgressUI() {
  $('progressText').textContent = R.kind === 'pdf' && R.pdf
    ? `Trang ${R.pdf.page}/${R.pdf.pages} · ${pctText(R.percent)}`
    : pctText(R.percent);
  if (document.activeElement !== $('progressSlider')) $('progressSlider').value = Math.round(R.percent * 1000);
}

function updateSyncText() {
  const el = $('syncText');
  const u = sync.currentUser();
  if (!sync.isConfigured()) el.textContent = 'Chỉ lưu trên máy này';
  else if (!u) el.textContent = 'Chưa đăng nhập — chưa đồng bộ';
  else if (u.needsReconnect) el.textContent = 'Cần kết nối lại — sẽ đồng bộ sau';
  else el.textContent = navigator.onLine ? `Đã đồng bộ (${u.providerName})` : 'Ngoại tuyến — sẽ đồng bộ sau';
}

async function saveProgress(chapter) {
  const now = Date.now();
  R.lastSavedAt = now;
  const rec = { id: R.id, cfi: R.cfi, percent: R.percent, chapter, updatedAt: now };
  db.put('progress', rec).catch(() => {});
  R.pendingPush = {
    id: R.id,
    data: {
      title: R.meta.title, author: R.meta.author || '',
      cfi: R.cfi, percent: R.percent, chapter, updatedAt: now, deviceId, deviceName,
      ...(R.meta.source ? { source: R.meta.source } : {}),
    },
  };
  clearTimeout(R.pushTimer);
  R.pushTimer = setTimeout(flushPush, 1500);
}

function flushPush() {
  clearTimeout(R.pushTimer);
  const p = R.pendingPush;
  R.pendingPush = null;
  if (!p) return;
  sync.push(p.id, p.data).then(updateSyncText).catch((e) => {
    if (e.code === 'need-auth') { updateSyncText(); return; }
    console.warn('Đồng bộ lỗi', e);
    $('syncText').textContent = navigator.onLine ? 'Lỗi đồng bộ — sẽ thử lại' : 'Ngoại tuyến — sẽ đồng bộ sau';
  });
}

// Thiết bị khác vừa đọc tiếp cuốn này
function onRemoteChange(data) {
  if (!R.id || data.deviceId === deviceId || !data.cfi) return;
  if ((data.updatedAt || 0) <= R.lastSavedAt || data.cfi === R.cfi) return;
  R.lastSavedAt = data.updatedAt;
  toast(`${data.deviceName || 'Thiết bị khác'} đã đọc đến ${pctText(data.percent)}`, 'Chuyển đến', () => {
    R.skipNextSave = false;
    goToLocation(data.cfi);
  }, 15000);
}

async function closeBook() {
  speaker?.stop();
  ttsRestartAfterRender = false;
  flushPush();
  R.unwatch(); R.unwatch = () => {};
  clearTimeout(rerenderTimer);
  if (R.rendition) R.rendition.destroy();
  if (R.book) R.book.destroy();
  if (R.pdf) R.pdf.destroy();
  Object.assign(R, { id: null, book: null, rendition: null, pdf: null, kind: null });
  $('reader').classList.remove('is-pdf');
  $('tocPanel').hidden = true; $('settingsPanel').hidden = true;
  showView('library');
  renderLibrary();
}

/* ----- Điều hướng + hiệu ứng lật trang kiểu Play Sách ----- */
// Ở chế độ lật trang, epub.js xếp cả chương thành các cột trong 1 khung rộng và lật trang bằng
// cách đổi scrollLeft của khung chứa. Ta cuộn mượt tới trang kế (trượt), cho trang chạy theo ngón tay
// khi kéo, và khi sang chương mới thì cho chương mới trượt vào.
const reduceMotion = () => settings.pageAnim === 'none'
  || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function pager() {
  const m = R.rendition?.manager;
  const c = m?.container;
  if (!c || !m.layout || settings.flow !== 'paginated') return null;
  return { c, delta: m.layout.delta };
}

// Cách làm mượt (v1.5): KHÔNG cuộn khung sách từng khung hình (mỗi lần cuộn epub.js lại tính vị trí
// và app lưu tiến độ → giật). Thay vào đó lật thật đúng 1 lần (đổi scrollLeft), còn phần "trượt" mắt thấy
// là dịch chuyển (transform) phần tử trang bằng GPU.
// Có thể có nhiều chương đang nạp cạnh nhau (chế độ continuous) → dịch chuyển tất cả cùng lúc
const pageEls = () => [...(R.rendition?.manager?.container?.querySelectorAll('.epub-view') || [])];
const EASE = 'cubic-bezier(.25,.8,.25,1)';
let slideAnims = [];
const finishSlide = () => { slideAnims.forEach((a) => a.finish()); slideAnims = []; };
function setShift(px) {
  for (const v of pageEls()) v.style.transform = px ? `translate3d(${px}px,0,0)` : '';
}
function animShift(from, to, ms) {
  finishSlide();
  const els = pageEls();
  if (!els.length || !els[0].animate) { setShift(to); return Promise.resolve(); }
  const anims = els.map((v) => {
    v.style.transform = to ? `translate3d(${to}px,0,0)` : '';
    return v.animate(
      [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }],
      { duration: ms, easing: EASE },
    );
  });
  slideAnims = anims;
  return Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => {
    if (slideAnims === anims) slideAnims = [];
  });
}

function slideIn(dir) {
  const v = $('viewer');
  if (reduceMotion() || !v.animate) return;
  v.animate(
    [{ transform: `translate3d(${dir * 48}px,0,0)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 260, easing: EASE },
  );
}

// dir = 1: trang sau, -1: trang trước. fromScroll: vị trí trang lúc bắt đầu kéo; shift: độ lệch hiện tại do kéo.
async function turn(dir, fromScroll, shift = 0) {
  if (R.kind === 'pdf') return R.pdf?.turn(dir);
  if (!R.rendition) return;
  finishSlide();
  const go = () => (dir > 0 ? R.rendition.next() : R.rendition.prev());
  const p = pager();
  if (!p || reduceMotion()) { setShift(0); return go(); }
  const { c, delta } = p;
  const start = fromScroll ?? c.scrollLeft;
  const within = dir > 0 ? start + c.offsetWidth + delta <= c.scrollWidth + 1 : start > 1;
  if (within) {
    // Lật thật 1 lần; cùng lúc đặt độ lệch để mắt vẫn thấy trang cũ, rồi trượt độ lệch về 0.
    // epub.js đôi khi để cờ "bỏ qua lần cuộn kế" sau lần tự cuộn của nó → xoá cờ để nó xử lý lần cuộn này
    // (nạp sẵn chương kế, cập nhật vị trí). Sau khi trượt xong vẫn yêu cầu báo vị trí cho chắc.
    R.rendition.manager.ignore = false;
    c.scrollLeft = start + dir * delta;
    await animShift(shift + dir * delta, 0, 320);
    R.rendition?.reportLocation();
  } else {
    if (shift) await animShift(shift, 0, 140);
    await go();
    slideIn(dir);
  }
}
const next = () => turn(1);
const prev = () => turn(-1);

// Kéo trang theo ngón tay (dùng chung cho khung sách và 2 vùng chạm mép)
let drag = null;
function dragStart(x, y) {
  finishSlide();
  const p = pager();
  drag = { x, y, time: Date.now(), scroll: p ? p.c.scrollLeft : 0, active: false, shift: 0, lastX: x, lastT: Date.now(), v: 0 };
}
function dragMove(x, y) {
  const s = drag;
  if (!s) return;
  const p = pager();
  if (!p || reduceMotion()) return;
  const dx = x - s.x, dy = y - s.y;
  if (!s.active) {
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) s.active = true;
    else return;
  }
  const max = p.c.scrollWidth - p.c.offsetWidth;
  // Ở đầu/cuối chương không còn trang bên cạnh → kéo có lực cản
  const atEdge = (dx > 0 && s.scroll <= 1) || (dx < 0 && s.scroll >= max - 1);
  s.shift = atEdge ? dx / 3 : dx;
  setShift(s.shift);
  const now = Date.now();
  s.v = (x - s.lastX) / Math.max(1, now - s.lastT);
  s.lastX = x; s.lastT = now;
}
function cancelDrag() {
  const s = drag;
  drag = null;
  if (s?.active) animShift(s.shift, 0, 200);
}
// Trả về 'tap' nếu là một cú chạm, 'done' nếu đã xử lý (lật/kéo), '' nếu bỏ qua.
function dragEnd(x, y) {
  const s = drag;
  drag = null;
  if (!s) return '';
  const dx = x - s.x, dy = y - s.y, dt = Date.now() - s.time;
  const p = pager();
  if (s.active && p) {
    const fling = Math.abs(s.v) > 0.35;
    if (fling || Math.abs(dx) > p.c.offsetWidth * 0.18) turn((fling ? s.v : dx) < 0 ? 1 : -1, s.scroll, s.shift);
    else animShift(s.shift, 0, 200); // chưa đủ xa → trượt về chỗ cũ
    return 'done';
  }
  if (settings.flow === 'paginated' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && dt < 1000) {
    turn(dx < 0 ? 1 : -1, s.scroll);
    return 'done';
  }
  return Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 500 ? 'tap' : '';
}

// Vùng chạm 2 mép nằm trên trang app (ngoài khung sách) → luôn nhận chạm/vuốt trên iPhone/iPad,
// kể cả khi Safari không chuyển sự kiện vào trong khung sách.
function bindTapZone(el, action) {
  el.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    dragStart(t.screenX, t.screenY);
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) dragMove(t.screenX, t.screenY);
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    e.preventDefault(); // không phát thêm "click"
    if (dragEnd(t.screenX, t.screenY) === 'tap') action();
  }, { passive: false });
  el.addEventListener('touchcancel', cancelDrag);
  el.addEventListener('click', action); // chuột / bút cảm ứng
}
bindTapZone($('tapPrev'), prev);
bindTapZone($('tapNext'), next);
$('btnNext').onclick = next;
$('btnPrev').onclick = prev;
$('btnBack').onclick = closeBook;

function onKey(e) {
  if (!(R.rendition || R.pdf) || e.target?.tagName === 'INPUT' || e.target?.tagName === 'SELECT') return false;
  if (['ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && settings.flow === 'paginated')) { next(); return true; }
  if (['ArrowLeft', 'PageUp'].includes(e.key)) { prev(); return true; }
  if (e.key === 'Escape') { $('tocPanel').hidden = true; $('settingsPanel').hidden = true; }
  return false;
}
document.addEventListener('keydown', (e) => {
  if ($('reader').classList.contains('active') && !$('accountDialog').open && onKey(e)) e.preventDefault();
});

// Chạm trái/phải để lật trang, chạm giữa để ẩn/hiện thanh công cụ, vuốt ngang để lật
// iPhone/iPad (Safari) không phát sự kiện "click" khi chạm vào chữ thường trong iframe,
// nên chạm và vuốt được nhận trực tiếp từ touchstart/touchend. Chuột (máy tính) vẫn dùng click.
let lastTouchEnd = 0;
let pinch = null; // chụm/mở 2 ngón để đổi cỡ chữ
const touchDist = (ts) => Math.hypot(ts[0].screenX - ts[1].screenX, ts[0].screenY - ts[1].screenY);
function onTouchStart(e) {
  if (e.touches?.length === 2) {
    const d = touchDist(e.touches);
    pinch = { d0: d, d };
    cancelDrag();
    return;
  }
  const t = e.changedTouches?.[0];
  if (t && !pinch) dragStart(t.screenX, t.screenY);
}
function onTouchMove(e) {
  if (pinch) { if (e.touches?.length === 2) pinch.d = touchDist(e.touches); return; }
  const t = e.touches?.[0];
  if (t) dragMove(t.screenX, t.screenY);
}
function onTouchEnd(e) {
  lastTouchEnd = Date.now();
  if (pinch) {
    if (e.touches?.length) return; // còn ngón trên màn hình
    const ratio = pinch.d / pinch.d0;
    pinch = null;
    drag = null;
    if (ratio > 1.12 || ratio < 0.89) {
      const target = Math.round((settings.fontSize * Math.sqrt(ratio)) / 10) * 10; // dịu hơn tỉ lệ ngón tay
      const step = ratio > 1 ? Math.max(target, settings.fontSize + 10) : Math.min(target, settings.fontSize - 10);
      const size = Math.min(200, Math.max(60, step));
      if (size !== settings.fontSize) { changeSetting({ fontSize: size }); toast(`Cỡ chữ ${size}%`, null, null, 1200); }
    }
    return;
  }
  const t = e.changedTouches?.[0];
  if (!t) { drag = null; return; }
  if (dragEnd(t.screenX, t.screenY) === 'tap') handleTap(e.view, t.clientX, e.target);
}
function onFrameClick(e) {
  if (Date.now() - lastTouchEnd < 800) return; // đã xử lý bằng cảm ứng
  handleTap(e.view, e.clientX, e.target);
}
function handleTap(evView, clientX, target) {
  const view = evView || target?.ownerDocument?.defaultView;
  if (target?.closest?.('a')) return;
  const sel = view?.getSelection?.();
  if (sel && sel.toString().length) return;
  const frame = view?.frameElement;
  tapAt((frame ? frame.getBoundingClientRect().left : 0) + clientX);
}
// Chạm ở vị trí x (toạ độ cửa sổ app): mép trái/phải lật trang, giữa ẩn/hiện thanh công cụ
function tapAt(x) {
  if (!$('tocPanel').hidden || !$('settingsPanel').hidden) { $('tocPanel').hidden = true; $('settingsPanel').hidden = true; return; }
  const wrap = $('viewerWrap').getBoundingClientRect();
  const f = (x - wrap.left) / wrap.width;
  if (settings.flow === 'paginated' && f < 0.3) prev();
  else if (settings.flow === 'paginated' && f > 0.7) next();
  else $('reader').classList.toggle('immersive');
}

const slider = $('progressSlider');
const sliderPage = () => 1 + Math.round((slider.value / 1000) * (R.pdf.pages - 1));
slider.oninput = () => {
  $('progressText').textContent = R.kind === 'pdf' && R.pdf
    ? `Trang ${sliderPage()}/${R.pdf.pages}`
    : `${Math.round(slider.value / 10)}%`;
};
slider.onchange = () => {
  if (R.kind === 'pdf') { R.pdf?.goTo(sliderPage()); slider.blur(); return; }
  if (!R.book?.locations.length()) return;
  const cfi = R.book.locations.cfiFromPercentage(slider.value / 1000);
  R.rendition.display(cfi);
  slider.blur();
};

/* ================= Đọc to ================= */
const RATES = [1, 1.25, 1.5, 1.75, 2];
const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,dd,dt,pre,figcaption,td,th,div';
let ttsRestartAfterRender = false;

const speaker = ttsSupported ? new Speaker({
  getRate: () => settings.ttsRate,
  getVoiceURI: () => settings.ttsVoice,
  onSegment: (seg) => ttsFollow(seg),
  onState: (state, ev) => ttsUI(state, ev),
}) : null;

if (location.hostname === 'localhost') window.__speaker = speaker; // chỉ để kiểm thử trên máy

const findContents = (idx) => R.rendition?.getContents().find((c) => c.sectionIndex === idx);

// Các câu của 1 chương EPUB (đã hiển thị) kể từ nút startNode; mỗi câu kèm Range để tô sáng & lật trang theo
function epubSegments(contents, startNode) {
  const doc = contents.document;
  let blocks = [...doc.body.querySelectorAll(BLOCKS)].filter((el) => !el.querySelector(BLOCKS) && el.textContent.trim());
  if (!blocks.length && doc.body.textContent.trim()) blocks = [doc.body];
  let i0 = 0;
  if (startNode) {
    i0 = blocks.findIndex((b) => b.contains(startNode)
      || (startNode.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
    if (i0 < 0) return [];
  }
  const segs = [];
  for (const block of blocks.slice(i0)) {
    const nodes = [];
    let full = '';
    const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { nodes.push([n, full.length]); full += n.nodeValue; }
    const at = (i) => { // vị trí ký tự → (nút chữ, offset)
      let k = nodes.length - 1;
      while (k > 0 && nodes[k][1] > i) k--;
      return [nodes[k][0], Math.min(i - nodes[k][1], nodes[k][0].nodeValue.length)];
    };
    for (const [s, e] of splitSentences(full)) {
      const range = doc.createRange();
      try { range.setStart(...at(s)); range.setEnd(...at(e)); } catch { continue; }
      segs.push({ text: full.slice(s, e).trim(), range, contents });
    }
  }
  return segs;
}

function epubProvider() {
  let queue = null;
  let secIndex = null;
  return {
    async next() {
      if (!queue) {
        const loc = R.rendition.currentLocation();
        secIndex = loc?.start?.index;
        const c = findContents(secIndex);
        let node = null;
        try { node = c?.range(loc.start.cfi)?.startContainer; } catch { /* bắt đầu từ đầu chương */ }
        queue = c ? epubSegments(c, node) : [];
      }
      while (!queue.length) { // hết chương → sang chương sau
        const sec = R.book?.spine.get(secIndex + 1);
        if (!sec) return null;
        let c = findContents(sec.index);
        // Chương kế thường đã được nạp sẵn (chế độ continuous); nếu đang nạp dở thì đợi một chút
        for (let i = 0; !c && i < 20; i++) {
          try { R.rendition.manager?.check?.(); } catch { /* bỏ qua */ }
          await new Promise((r) => setTimeout(r, 100));
          c = findContents(sec.index);
        }
        if (!c) { await R.rendition.display(sec.href); c = findContents(sec.index); }
        if (!c) return null;
        secIndex = sec.index;
        queue = epubSegments(c, null);
      }
      return queue.shift();
    },
  };
}

function pdfProvider() {
  let page = R.pdf.page - 1;
  let queue = [];
  let empty = 0;
  return {
    async next() {
      while (!queue.length) {
        page++;
        if (!R.pdf || page > R.pdf.pages) return null;
        const pg = await R.pdf.doc.getPage(page);
        const tc = await pg.getTextContent();
        const text = tc.items.map((it) => it.str + (it.hasEOL ? '\n' : '')).join('').replace(/-\n(?=\p{Ll})/gu, '').replace(/\s*\n\s*/g, ' ');
        queue = splitSentences(text).map(([s, e]) => ({ text: text.slice(s, e).trim(), page }));
        if (!queue.length && ++empty >= 3) {
          toast('Các trang này không có chữ (có thể là PDF scan) nên không đọc to được', null, null, 6000);
          return null;
        }
        if (queue.length) empty = 0;
      }
      return queue.shift();
    },
  };
}

// Tô sáng câu đang đọc và lật trang theo giọng đọc
function clearTtsHighlight() {
  for (const c of R.rendition?.getContents() || []) {
    try { c.window.CSS?.highlights?.delete('tts'); } catch { /* bỏ qua */ }
  }
}
function ttsFollow(seg) {
  if (R.kind === 'pdf') {
    if (!R.pdf || seg.page === R.pdf.page) return;
    if (settings.flow === 'paginated' && seg.page === R.pdf.page + 1) R.pdf.turn(1); else R.pdf.goTo(seg.page);
    return;
  }
  if (!R.rendition) return;
  clearTtsHighlight();
  const win = seg.contents.window;
  try { if (win.CSS?.highlights && win.Highlight) win.CSS.highlights.set('tts', new win.Highlight(seg.range)); } catch { /* bỏ qua */ }
  const rect = seg.range.getClientRects()[0] || seg.range.getBoundingClientRect();
  const frame = win.frameElement;
  if (!rect || !frame) return;
  const fr = frame.getBoundingClientRect();
  const wrap = $('viewerWrap').getBoundingClientRect();
  const x = fr.left + rect.left + 2, y = fr.top + rect.top + 2;
  const visible = settings.flow === 'paginated'
    ? x >= wrap.left && x < wrap.right
    : y >= wrap.top && y < wrap.bottom - 20;
  if (visible) return;
  const p = pager();
  if (p && x >= wrap.right && x < wrap.right + p.delta) turn(1);
  else R.rendition.display(seg.contents.cfiFromRange(seg.range));
}

function ttsStart() {
  if (!speaker || !(R.rendition || R.pdf)) return;
  if (!pickVoice(settings.ttsVoice)) {
    toast('Máy này chưa có giọng tiếng Việt — giọng mặc định có thể đọc sai. Chọn giọng ở Aa → Giọng đọc.', null, null, 7000);
  }
  speaker.start(R.kind === 'pdf' ? pdfProvider() : epubProvider());
}
function ttsUI(state, ev) {
  $('ttsBar').hidden = state === 'idle';
  $('btnTts').classList.toggle('on', state !== 'idle');
  $('ttsPlay').textContent = state === 'playing' ? '⏸' : '▶';
  $('ttsPlay').setAttribute('aria-label', state === 'playing' ? 'Tạm dừng' : 'Đọc tiếp');
  $('ttsRate').textContent = `${settings.ttsRate}×`;
  if (state === 'idle') clearTtsHighlight();
  if (ev === 'end') toast('Đã đọc đến hết sách', null, null, 3000);
}
$('btnTts').onclick = () => {
  if (!speaker) { toast('Trình duyệt này không hỗ trợ đọc to'); return; }
  unlockSpeech();
  if (speaker.state === 'idle') ttsStart();
  else if (speaker.state === 'playing') speaker.pause();
  else speaker.resume();
};
$('ttsPlay').onclick = () => { unlockSpeech(); if (speaker.state === 'playing') speaker.pause(); else speaker.resume(); };
$('ttsStop').onclick = () => speaker?.stop();
$('ttsRate').onclick = () => {
  settings.ttsRate = RATES[(RATES.indexOf(settings.ttsRate) + 1) % RATES.length] || 1.5;
  saveSettings();
  $('ttsRate').textContent = `${settings.ttsRate}×`;
  $('ttsRateSel').value = String(settings.ttsRate);
  speaker?.refresh();
};

// Danh sách giọng (giọng tiếng Việt lên đầu)
function fillVoices() {
  const sel = $('ttsVoiceSel');
  if (!ttsSupported) { $('ttsRow').hidden = true; $('ttsRateRow').hidden = true; return; }
  const vs = voices().slice().sort((a, b) => (isVietnamese(b) - isVietnamese(a)) || a.name.localeCompare(b.name));
  const auto = pickVoice('');
  sel.innerHTML = `<option value="">Tự chọn${auto ? ` (${esc(auto.name)})` : ' — chưa có giọng tiếng Việt'}</option>`
    + vs.map((v) => `<option value="${esc(v.voiceURI)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('');
  sel.value = vs.some((v) => v.voiceURI === settings.ttsVoice) ? settings.ttsVoice : '';
  $('ttsRateSel').value = String(settings.ttsRate);
}
if (ttsSupported) speechSynthesis.addEventListener?.('voiceschanged', fillVoices);
$('ttsVoiceSel').onchange = (e) => { settings.ttsVoice = e.target.value; saveSettings(); speaker?.refresh(); };
$('ttsRateSel').onchange = (e) => {
  settings.ttsRate = Number(e.target.value) || 1.5;
  saveSettings();
  $('ttsRate').textContent = `${settings.ttsRate}×`;
  speaker?.refresh();
};

/* ----- Bảng mục lục & cài đặt ----- */
$('btnToc').onclick = () => { $('settingsPanel').hidden = true; $('tocPanel').hidden = !$('tocPanel').hidden; document.querySelector('#tocList a.current')?.scrollIntoView({ block: 'center' }); };
$('btnSettings').onclick = () => { $('tocPanel').hidden = true; $('settingsPanel').hidden = !$('settingsPanel').hidden; fillVoices(); };
document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => { $(b.dataset.close).hidden = true; }; });
$('fontUp').onclick = () => (R.kind === 'pdf' ? R.pdf?.zoomStep(1) : changeSetting({ fontSize: Math.min(200, settings.fontSize + 10) }));
$('fontDown').onclick = () => (R.kind === 'pdf' ? R.pdf?.zoomStep(-1) : changeSetting({ fontSize: Math.max(60, settings.fontSize - 10) }));
$('lhUp').onclick = () => changeSetting({ lineHeight: Math.min(2.4, +(settings.lineHeight + 0.1).toFixed(1)) });
$('lhDown').onclick = () => changeSetting({ lineHeight: Math.max(1.0, +(settings.lineHeight - 0.1).toFixed(1)) });
$('fontFamily').onchange = (e) => changeSetting({ fontFamily: e.target.value });
$('flowMode').onchange = (e) => changeSetting({ flow: e.target.value });
$('pageAnim').onchange = (e) => { settings.pageAnim = e.target.value; saveSettings(); }; // không cần dựng lại trang
document.querySelectorAll('.sw').forEach((b) => { b.onclick = () => changeSetting({ theme: b.dataset.theme }); });

// Lưu ngay khi rời app / chuyển tab / khoá màn hình
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPush();
  else {
    sync.resume(!R.id).then(updateAccountUI).catch(() => {}); // quay lại app: lấy tiến độ mới
    if (speaker?.state === 'playing') speaker.lockScreen(); // khoá màn hình bị nhả khi ẩn app
  }
});
window.addEventListener('pagehide', flushPush);
window.addEventListener('online', updateSyncText);
window.addEventListener('offline', updateSyncText);

/* ================= Tài khoản & đồng bộ ================= */
function updateAccountUI() {
  const u = sync.currentUser();
  const dot = $('syncDot');
  if (!sync.isConfigured()) { $('accountLabel').textContent = 'Chỉ máy này'; dot.className = 'dot off'; }
  else if (!u) { $('accountLabel').textContent = 'Đăng nhập để đồng bộ'; dot.className = 'dot off'; }
  else if (u.needsReconnect) { $('accountLabel').textContent = 'Kết nối lại'; dot.className = 'dot off'; }
  else { $('accountLabel').textContent = u.email || u.providerName; dot.className = 'dot on'; }
  const avail = new Set(sync.providers().map((p) => p.id));
  $('btnOneDrive').hidden = !avail.has('onedrive');
  $('btnGDrive').hidden = !avail.has('gdrive');
  $('syncDisabledNote').hidden = sync.isConfigured();
  $('signedOutBox').hidden = !sync.isConfigured() || !!u;
  $('signedInBox').hidden = !u;
  $('userProvider').textContent = u ? u.providerName : '';
  $('userEmail').textContent = u ? u.email || '' : '';
  $('reconnectNote').hidden = !u?.needsReconnect;
  $('btnReconnect').hidden = !u?.needsReconnect;
  $('btnCloud').hidden = !u;
  $('cloudBtnLabel').textContent = u ? `Mở từ ${u.providerName}` : 'Mở từ đám mây';
  if (R.id) updateSyncText();
}

$('btnAccount').onclick = () => {
  $('deviceName').value = deviceName;
  updateAccountUI();
  $('accountDialog').showModal();
};
$('deviceName').onchange = (e) => { deviceName = e.target.value.trim() || guessDeviceName(); lsSet('deviceName', deviceName); };

// Đăng nhập sẽ chuyển sang trang của Microsoft/Google rồi quay về app
function authAction(fn) {
  $('authError').textContent = '';
  flushPush();
  Promise.resolve().then(fn).catch((e) => { $('authError').textContent = sync.errorText(e); });
}
$('btnOneDrive').onclick = () => authAction(() => sync.signIn('onedrive'));
$('btnGDrive').onclick = () => authAction(() => sync.signIn('gdrive'));
$('btnReconnect').onclick = () => authAction(() => sync.reconnect());
$('btnSignOut').onclick = () => {
  if (!confirm('Đăng xuất? Sách và tiến độ trên máy này vẫn được giữ.')) return;
  sync.signOut();
  $('cloudList').innerHTML = ''; cloudNav.stack = [];
  $('accountDialog').close();
};

// Khi đăng nhập lần đầu trên máy này: đẩy tiến độ cục bộ lên nếu mới hơn bản trên đám mây
async function uploadLocalProgress() {
  const [books, progress] = await Promise.all([db.all('books'), db.all('progress')]);
  const prog = Object.fromEntries(progress.map((p) => [p.id, p]));
  const batch = {};
  for (const b of books) {
    const p = prog[b.id];
    const r = remoteMap[b.id];
    const base = { title: b.title, author: b.author || '', ...(b.source ? { source: b.source } : {}) };
    if (p && (!r || (p.updatedAt || 0) > (r.updatedAt || 0))) {
      batch[b.id] = { ...base, cfi: p.cfi, percent: p.percent, chapter: p.chapter || '', updatedAt: p.updatedAt, deviceId, deviceName };
    } else if (!r) batch[b.id] = base;
  }
  if (Object.keys(batch).length) sync.pushMany(batch).catch(() => {});
}

function onUser(u) {
  updateAccountUI();
  unwatchAll();
  remoteMap = {};
  if (!u) { renderLibrary(); return; }
  let first = true;
  unwatchAll = sync.watchAll((map) => {
    remoteMap = map;
    if (first) { first = false; uploadLocalProgress(); }
    if (!R.id) renderLibrary();
  });
}

/* ================= Khởi động ================= */
db.requestPersistence();
applyChrome();
renderLibrary();
updateAccountUI();
sync.init(onUser).then(() => {
  const err = sync.takeLastError();
  if (err) toast(`Đăng nhập không thành công: ${err}`, null, null, 8000);
}).catch((e) => {
  console.error('Không khởi tạo được đồng bộ', e);
  toast('Không kết nối được dịch vụ đồng bộ — đang dùng chế độ ngoại tuyến');
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
