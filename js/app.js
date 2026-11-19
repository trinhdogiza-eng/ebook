import * as db from './db.js';
import * as sync from './sync.js';

/* global ePub */
const $ = (id) => document.getElementById(id);
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
  { fontSize: 100, lineHeight: 1.5, fontFamily: '', theme: 'light', flow: 'paginated' },
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
      <div class="cover">${coverHtml}</div>
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
    const fileName = /\.epub$/i.test(name) ? name : `${name}.epub`;
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
    $('cloudStatus').textContent = items.length ? '' : 'Không có thư mục con hay tệp EPUB nào ở đây.';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `cloud-item${have.has(it.id) ? ' have' : ''}`;
      const size = it.isFolder ? '' : have.has(it.id) ? 'Đã có' : `${(it.size / 1048576).toFixed(1)} MB`;
      b.innerHTML = `<span class="ic">${it.icon || (it.isFolder ? '📁' : '📖')}</span><span class="nm">${esc(it.name)}</span><span class="sz">${size}</span>`;
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

// Thêm một tệp EPUB (từ máy hoặc từ đám mây) vào thư viện. Trả về { id, isNew }.
async function importBuffer(buf, fileName, source) {
  const id = hashBuffer(buf);
  const existing = await db.get('books', id);
  if (existing) {
    if (source && !existing.source) await db.put('books', { ...existing, source });
    return { id, isNew: false };
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
    if (!/\.epub$/i.test(file.name) && file.type !== 'application/epub+zip') {
      toast(`Bỏ qua “${file.name}” — không phải tệp EPUB`); continue;
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

function showView(name) {
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('active', v.id === name);
}

async function openBook(id) {
  const [file, meta, local] = await Promise.all([db.get('files', id), db.get('books', id), db.get('progress', id)]);
  if (!file) { toast('Không tìm thấy tệp sách trên máy này'); return; }
  Object.assign(R, { id, meta, cfi: null, percent: local?.percent || 0, toc: [], flatToc: [] });
  showView('reader');
  $('reader').classList.remove('immersive');
  $('rTitle').textContent = meta.title;
  $('rChapter').textContent = meta.author || '';
  $('progressText').textContent = 'Đang mở…';
  $('syncText').textContent = '';
  $('progressSlider').disabled = true;

  R.book = ePub(file.data);
  // Chạy sau hook thay thế tài nguyên của epub.js (hook đó ghi đè section.output từ bản gốc), nên đợi 1 microtask.
  R.book.spine.hooks.serialize.register((output, section) =>
    Promise.resolve().then(() => { section.output = sanitizeSection(section.output); }));
  R.book.loaded.navigation.then((nav) => { R.toc = nav.toc; R.flatToc = flatten(nav.toc); renderToc(); }).catch(() => {});

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

  await createRendition(start);
  if (fromOther) toast(`Đã chuyển đến vị trí bạn đọc trên ${fromOther}`, null, null, 3500);
  updateSyncText();

  R.unwatch = sync.watchOne(id, onRemoteChange);
  loadLocations(id);
}

async function createRendition(cfi) {
  if (R.rendition) { R.rendition.destroy(); R.rendition = null; }
  $('viewer').innerHTML = '';
  const scrolled = settings.flow === 'scrolled-doc';
  const rendition = R.book.renderTo('viewer', {
    width: '100%', height: '100%',
    flow: settings.flow,
    manager: scrolled ? 'continuous' : 'default',
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
    html { font-size: ${settings.fontSize}% !important; background: ${t.bg} !important; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
    body { font-size: ${bodyFs}px !important; background: ${t.bg} !important; color: ${t.fg} !important; -webkit-text-size-adjust: none; }
    p, li, blockquote, dd, dt, td, div { line-height: ${settings.lineHeight} !important; }
    ${recolor ? `body *:not(img):not(svg):not(image) { color: inherit !important; background-color: transparent !important; border-color: ${t.fg}33 !important; }` : ''}
    a, a * { color: ${t.link} !important; }
    ${settings.fontFamily ? `body, body p, body div, body span, body li, body blockquote, body td, body h1, body h2, body h3, body h4 { font-family: ${settings.fontFamily} !important; }` : ''}
    img, svg, image { max-width: 100%; }
  `;
}

function applyChrome() {
  document.body.dataset.theme = settings.theme;
  const t = THEMES[settings.theme];
  document.querySelector('meta[name="theme-color"]').content = t.bar;
  $('viewerWrap').style.background = t.bg;
  $('fontSizeVal').textContent = `${settings.fontSize}%`;
  $('lhVal').textContent = settings.lineHeight.toFixed(1);
  $('fontFamily').value = settings.fontFamily;
  $('flowMode').value = settings.flow;
  document.querySelectorAll('.sw').forEach((b) => b.classList.toggle('active', b.dataset.theme === settings.theme));
}

// Đổi cài đặt hiển thị: dựng lại trang ở đúng vị trí đang đọc
let rerenderTimer = null;
function changeSetting(patch) {
  Object.assign(settings, patch);
  saveSettings();
  applyChrome();
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
    a.onclick = (e) => { e.preventDefault(); $('tocPanel').hidden = true; R.rendition.display(t.href); };
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
  $('progressText').textContent = pctText(R.percent);
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
    R.rendition.display(data.cfi);
  }, 15000);
}

async function closeBook() {
  flushPush();
  R.unwatch(); R.unwatch = () => {};
  clearTimeout(rerenderTimer);
  if (R.rendition) R.rendition.destroy();
  if (R.book) R.book.destroy();
  Object.assign(R, { id: null, book: null, rendition: null });
  $('tocPanel').hidden = true; $('settingsPanel').hidden = true;
  showView('library');
  renderLibrary();
}

/* ----- Điều hướng ----- */
const next = () => R.rendition?.next();
const prev = () => R.rendition?.prev();
$('btnNext').onclick = next;
$('btnPrev').onclick = prev;
$('btnBack').onclick = closeBook;

function onKey(e) {
  if (!R.rendition || e.target?.tagName === 'INPUT' || e.target?.tagName === 'SELECT') return false;
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
let touch = null;
let lastTouchEnd = 0;
function onTouchStart(e) {
  const t = e.changedTouches?.[0];
  touch = t ? { x: t.screenX, y: t.screenY, time: Date.now(), multi: e.touches?.length > 1 } : null;
}
function onTouchEnd(e) {
  lastTouchEnd = Date.now();
  const t = e.changedTouches?.[0];
  const start = touch;
  touch = null;
  if (!t || !start || start.multi) return;
  const dx = t.screenX - start.x, dy = t.screenY - start.y;
  const dt = Date.now() - start.time;
  if (settings.flow === 'paginated' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && dt < 1000) {
    dx < 0 ? next() : prev();
    return;
  }
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 500) handleTap(e.view, t.clientX, e.target);
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
  if (!$('tocPanel').hidden || !$('settingsPanel').hidden) { $('tocPanel').hidden = true; $('settingsPanel').hidden = true; return; }
  const frame = view?.frameElement;
  const wrap = $('viewerWrap').getBoundingClientRect();
  const x = (frame ? frame.getBoundingClientRect().left : 0) + clientX;
  const f = (x - wrap.left) / wrap.width;
  if (settings.flow === 'paginated' && f < 0.3) prev();
  else if (settings.flow === 'paginated' && f > 0.7) next();
  else $('reader').classList.toggle('immersive');
}

const slider = $('progressSlider');
slider.oninput = () => { $('progressText').textContent = `${Math.round(slider.value / 10)}%`; };
slider.onchange = () => {
  if (!R.book?.locations.length()) return;
  const cfi = R.book.locations.cfiFromPercentage(slider.value / 1000);
  R.rendition.display(cfi);
  slider.blur();
};

/* ----- Bảng mục lục & cài đặt ----- */
$('btnToc').onclick = () => { $('settingsPanel').hidden = true; $('tocPanel').hidden = !$('tocPanel').hidden; document.querySelector('#tocList a.current')?.scrollIntoView({ block: 'center' }); };
$('btnSettings').onclick = () => { $('tocPanel').hidden = true; $('settingsPanel').hidden = !$('settingsPanel').hidden; };
document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => { $(b.dataset.close).hidden = true; }; });
$('fontUp').onclick = () => changeSetting({ fontSize: Math.min(200, settings.fontSize + 10) });
$('fontDown').onclick = () => changeSetting({ fontSize: Math.max(60, settings.fontSize - 10) });
$('lhUp').onclick = () => changeSetting({ lineHeight: Math.min(2.4, +(settings.lineHeight + 0.1).toFixed(1)) });
$('lhDown').onclick = () => changeSetting({ lineHeight: Math.max(1.0, +(settings.lineHeight - 0.1).toFixed(1)) });
$('fontFamily').onchange = (e) => changeSetting({ fontFamily: e.target.value });
$('flowMode').onchange = (e) => changeSetting({ flow: e.target.value });
document.querySelectorAll('.sw').forEach((b) => { b.onclick = () => changeSetting({ theme: b.dataset.theme }); });

// Lưu ngay khi rời app / chuyển tab / khoá màn hình
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPush();
  else sync.resume(!R.id).then(updateAccountUI).catch(() => {}); // quay lại app: lấy tiến độ mới
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
