// Đọc to bằng giọng có sẵn của máy (Web Speech API: speechSynthesis).
// - Đọc từng câu ngắn (tránh lỗi trình duyệt cắt câu dài), câu sau nối tiếp câu trước.
// - "Tạm dừng" = huỷ câu đang đọc và nhớ lại; "Tiếp tục" = đọc lại câu đó (ổn định hơn pause()/resume()
//   vốn hay lỗi trên Android).
// - Giữ màn hình sáng trong lúc đọc (Wake Lock) để máy không tắt màn hình làm dừng giọng đọc.

export const ttsSupported = typeof window !== 'undefined'
  && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export const voices = () => (ttsSupported ? speechSynthesis.getVoices() : []);
export const isVietnamese = (v) => /^vi([-_]|$)/i.test(v.lang || '');

// Giọng đã chọn → giọng tiếng Việt "tự nhiên" (Natural/Online/Neural) → giọng tiếng Việt bất kỳ
export function pickVoice(uri) {
  const vs = voices();
  return vs.find((v) => v.voiceURI === uri)
    || vs.find((v) => isVietnamese(v) && /natural|online|neural|premium|enhanced/i.test(v.name))
    || vs.find(isVietnamese)
    || null;
}

// iPhone/iPad chỉ cho phát giọng nếu lần đầu được gọi ngay trong thao tác chạm của người dùng
export function unlockSpeech() {
  if (!ttsSupported) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* bỏ qua */ }
}

// Tách đoạn văn thành câu ngắn: trả về [[đầu, cuối], ...] theo vị trí ký tự
// Chỉ ngắt câu khi dấu câu đứng trước khoảng trắng hoặc cuối đoạn → "com.vn", "3.5" không bị tách.
export function splitSentences(text, max = 220) {
  const out = [];
  const re = /[.!?…。]+["”’»)\]]*(?=\s|$)/g;
  const push = (s, e) => {
    while (s < e && /\s/.test(text[s])) s++;
    while (e - s > max) { // câu quá dài → cắt ở dấu phẩy / chấm phẩy / khoảng trắng gần nhất
      const chunk = text.slice(s, s + max);
      let cut = Math.max(chunk.lastIndexOf(', '), chunk.lastIndexOf('; '), chunk.lastIndexOf(': '));
      if (cut < max * 0.4) cut = chunk.lastIndexOf(' ');
      if (cut < max * 0.4) cut = max - 1;
      out.push([s, s + cut + 1]);
      s += cut + 1;
    }
    if (/[\p{L}\p{N}]/u.test(text.slice(s, e))) out.push([s, e]);
  };
  let start = 0;
  let m;
  while ((m = re.exec(text))) {
    const e = m.index + m[0].length;
    // "16." / "IV." (số chương) không phải hết câu → gộp với phần sau
    if (/^\s*([\d]+|[IVXLC]+)[.)]\s*$/.test(text.slice(start, e))) continue;
    push(start, e);
    start = e;
  }
  if (start < text.length) push(start, text.length);
  return out;
}

// ===== Luồng âm thanh liền mạch (đã thử trên Android: phát tiếp được khi khoá màn hình) =====
// Web Audio → MediaStream → 1 thẻ <audio> phát liên tục từ lúc bấm 🔊 và không bao giờ đổi nguồn.
// Các câu (giọng AI / Google) được giải mã rồi "đổ" vào luồng này. Kiểu đổi tệp âm thanh liên tục thì
// Android chặn khi khoá màn hình, nên không dùng nữa.
export const stream = {
  ctx: null, dest: null, out: null, nodes: new Set(),
  // Phải gọi trong lúc người dùng bấm nút (lần đầu)
  ensure() {
    try {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        this.ctx = new C();
        if (this.ctx.createMediaStreamDestination) {
          this.dest = this.ctx.createMediaStreamDestination();
          this.out = new Audio();
          this.out.setAttribute('playsinline', '');
          this.out.srcObject = this.dest.stream;
        } else {
          this.dest = this.ctx.destination;
        }
      }
      this.ctx.resume?.().catch?.(() => {});
      this.out?.play().catch(() => {});
    } catch (e) { console.warn('Không tạo được luồng âm thanh', e); }
  },
  suspend() { try { this.ctx?.suspend(); this.out?.pause(); } catch { /* bỏ qua */ } },
  resume() { this.ensure(); },
  decode(arrayBuffer) { this.ensure(); return this.ctx.decodeAudioData(arrayBuffer); },
  // Phát buffer đúng thời điểm `at` (theo đồng hồ âm thanh) → các câu nối tiếp liền mạch, không phụ thuộc
  // vào việc trang (bị chậm khi khoá màn hình) xử lý sự kiện "hết câu" nhanh hay chậm.
  playAt(buffer, at, onEnded) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.dest);
    src.onended = () => { this.nodes.delete(src); onEnded?.(); };
    this.nodes.add(src);
    src.start(at);
    return src;
  },
  stopAll() {
    for (const n of this.nodes) { n.onended = null; try { n.stop(); } catch { /* đã dừng */ } }
    this.nodes.clear();
  },
};

export class Speaker {
  // opts: { getRate(), getVoiceURI(), onSegment(seg), onState(state, event), getMeta() → {title, artist, album, artwork} }
  constructor(opts) {
    Object.assign(this, opts);
    this.state = 'idle'; // idle | playing | paused
    this.gen = 0;
    this.current = null;
  }

  async start(provider) {
    this.keepStream = true; // không tạm dừng luồng khi khởi động lại
    this.stop(true);
    this.keepStream = false;
    this.provider = provider;
    this.state = 'playing';
    this.keepAlive(true); // phải gọi ngay trong lúc người dùng bấm nút (trình duyệt mới cho phát âm thanh)
    this.setupMediaSession();
    this.lockScreen();
    this.emit();
    await this.advance(++this.gen);
  }

  // Giữ luồng âm thanh chạy trong lúc đọc (để khi khoá màn hình, giọng AI nối tiếp vào luồng ngay)
  keepAlive(on) {
    if (on) stream.ensure();
    else if (!this.keepStream) stream.suspend();
  }

  // Điều khiển trên màn hình khoá / thanh thông báo (Android): Phát, Tạm dừng, Dừng
  setupMediaSession() {
    const ms = navigator.mediaSession;
    if (!ms) return;
    try {
      const m = this.getMeta?.() || {};
      if (window.MediaMetadata) {
        ms.metadata = new MediaMetadata({
          title: m.title || 'Đọc EPUB', artist: m.artist || '', album: m.album || '',
          artwork: m.artwork ? [{ src: m.artwork, sizes: '512x512' }] : [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
        });
      }
      // Gắn lại mỗi lần (có 2 bộ đọc: giọng máy và giọng Google — nút trên màn hình khoá điều khiển bộ đang dùng)
      const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch { /* không hỗ trợ */ } };
      set('play', () => this.resume());
      set('pause', () => this.pause());
      set('stop', () => this.stop());
      ms.playbackState = 'playing';
    } catch { /* bỏ qua */ }
  }
  updateMediaState() {
    try {
      if (navigator.mediaSession) navigator.mediaSession.playbackState = this.state === 'playing' ? 'playing' : this.state === 'paused' ? 'paused' : 'none';
    } catch { /* bỏ qua */ }
  }

  async advance(gen) {
    if (gen !== this.gen || this.state !== 'playing') return;
    let seg = null;
    try { seg = await this.provider.next(); } catch (e) { console.warn('Đọc to:', e); }
    if (gen !== this.gen || this.state !== 'playing') return;
    if (!seg) { this.finish(); return; }
    this.current = seg;
    this.speak(seg, gen);
  }

  speak(seg, gen) {
    const u = new SpeechSynthesisUtterance(seg.text);
    const v = pickVoice(this.getVoiceURI());
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'vi-VN';
    u.rate = this.getRate();
    let started = false;
    const markStart = () => { if (!started && gen === this.gen) { started = true; this.onSegment?.(seg); } };
    u.onstart = markStart;
    u.onend = () => { markStart(); if (gen === this.gen && this.state === 'playing') this.advance(gen); };
    u.onerror = (e) => {
      if (gen !== this.gen || e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('Đọc to lỗi:', e.error);
      if (this.state === 'playing') this.advance(gen); // bỏ qua câu lỗi, đọc tiếp
    };
    this.utter = u; // giữ tham chiếu (Chrome có lỗi tự huỷ câu đang đọc nếu bị dọn bộ nhớ)
    speechSynthesis.speak(u);
    setTimeout(markStart, 250); // vài máy không phát sự kiện onstart
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.gen++;
    speechSynthesis.cancel();
    this.keepAlive(false);
    this.unlockScreen();
    this.emit();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    const gen = ++this.gen;
    this.keepAlive(true);
    this.lockScreen();
    this.emit();
    if (this.current) this.speak(this.current, gen); else this.advance(gen);
  }

  // Đổi tốc độ / giọng: đọc lại câu hiện tại với cài đặt mới
  refresh() {
    if (this.state !== 'playing' || !this.current) return;
    const gen = ++this.gen;
    speechSynthesis.cancel();
    this.speak(this.current, gen);
  }

  stop(silent) {
    this.gen++;
    const was = this.state;
    this.state = 'idle';
    this.current = null;
    if (ttsSupported) speechSynthesis.cancel();
    this.keepAlive(false);
    this.unlockScreen();
    if (!silent && was !== 'idle') this.emit('stop');
    else this.updateMediaState();
  }

  finish() {
    this.state = 'idle';
    this.current = null;
    this.keepAlive(false);
    this.unlockScreen();
    this.emit('end');
  }

  emit(ev) { this.updateMediaState(); this.onState?.(this.state, ev); }

  async lockScreen() {
    try { if (!this.wake && navigator.wakeLock) this.wake = await navigator.wakeLock.request('screen'); } catch { /* không hỗ trợ */ }
  }
  unlockScreen() {
    const w = this.wake;
    this.wake = null;
    w?.release?.().catch(() => {});
  }
}

/* ================= Bộ đọc phát qua luồng âm thanh (giọng Google Cloud / giọng AI trong máy) ================= */
// Mỗi câu được tạo thành âm thanh (đúng tốc độ đọc ngay khi tạo → không bị méo giọng), giải mã rồi phát
// trong luồng liền mạch ở trên → vẫn đọc tiếp khi khoá màn hình / chuyển app.
const GTTS = 'https://texttospeech.googleapis.com/v1';
const AHEAD = 4;      // số câu chuẩn bị trước để không bị ngắt quãng
const SCHEDULED = 2;  // số câu xếp lịch sẵn trong luồng âm thanh
const GAP = 0.18;     // khoảng ngừng tự nhiên giữa 2 câu (giây)

// Cắt bớt khoảng lặng ở đầu/cuối câu (giọng AI thêm sẵn ~0.2–0.4s mỗi đầu → nghe rời rạc)
function trimSilence(buffer, keep = 0.03) {
  const d = buffer.getChannelData(0);
  const th = 0.012;
  let a = 0, b = d.length - 1;
  while (a < b && Math.abs(d[a]) < th) a++;
  while (b > a && Math.abs(d[b]) < th) b--;
  const pad = Math.round(buffer.sampleRate * keep);
  a = Math.max(0, a - pad);
  b = Math.min(d.length - 1, b + pad);
  if (a === 0 && b === d.length - 1) return buffer;
  const len = Math.max(1, b - a + 1);
  const res = stream.ctx.createBuffer(buffer.numberOfChannels, len, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) res.getChannelData(c).set(buffer.getChannelData(c).subarray(a, a + len));
  return res;
}

export const GOOGLE_DEFAULT_VOICE = 'vi-VN-Wavenet-A';

// Danh sách giọng tiếng Việt của Google (gọi API): [{ name, gender, tier }]
export async function googleVoices(key) {
  const r = await fetch(`${GTTS}/voices?languageCode=vi-VN&key=${encodeURIComponent(key)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(googleError(r.status, j));
  const tier = (n) => (/Chirp3|Chirp-HD/i.test(n) ? 'Chirp HD' : /Neural2/i.test(n) ? 'Neural2' : /Wavenet/i.test(n) ? 'WaveNet' : /Standard/i.test(n) ? 'Standard' : 'Khác');
  const rank = { 'WaveNet': 0, 'Neural2': 1, 'Chirp HD': 2, 'Standard': 3, 'Khác': 4 };
  return (j.voices || [])
    .filter((v) => (v.languageCodes || []).some((c) => /^vi/i.test(c)))
    .map((v) => ({ name: v.name, gender: v.ssmlGender === 'FEMALE' ? 'nữ' : v.ssmlGender === 'MALE' ? 'nam' : '', tier: tier(v.name) }))
    .sort((a, b) => rank[a.tier] - rank[b.tier] || a.name.localeCompare(b.name));
}

function googleError(status, j) {
  const msg = j?.error?.message || '';
  if (status === 400 && /API key not valid/i.test(msg)) return 'Khoá Google không hợp lệ';
  if (status === 403 && /billing/i.test(msg)) return 'Project Google Cloud chưa bật thanh toán';
  if (status === 403 && /(not been used|disabled)/i.test(msg)) return 'Chưa bật Cloud Text-to-Speech API';
  if (status === 403) return 'Khoá Google không được phép dùng ở trang này';
  if (status === 429) return 'Đã hết hạn mức giọng Google (thử lại sau)';
  return msg || `Lỗi Google ${status}`;
}

async function googleSynth(key, voice, rate, text) {
  const r = await fetch(`${GTTS}/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'vi-VN', name: voice },
      audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(googleError(r.status, j));
  const bin = atob(j.audioContent || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return stream.decode(bytes.buffer);
}

export class CloudSpeaker extends Speaker {
  // opts thêm: getKey(), getGoogleVoice(), onError(message)
  constructor(opts) {
    super(opts);
    this.ahead = [];  // câu đang được tạo âm thanh: { seg, buf (Promise), ready, buffer, err }
    this.sched = [];  // câu đã xếp lịch trong luồng: { seg, at, end, src }
    this.queueTime = 0;
  }

  // Tạo âm thanh cho 1 câu → Promise<AudioBuffer>. Lớp con (giọng AI) thay bằng cách tạo khác.
  synth(text) { return googleSynth(this.getKey(), this.getGoogleVoice(), this.getRate(), text); }

  async start(provider) {
    this.keepStream = true; // không tạm dừng luồng khi khởi động lại
    this.stop(true);
    this.keepStream = false;
    this.provider = provider;
    this.done = false;
    this.errors = 0;
    this.state = 'playing';
    stream.ensure();
    this.setupMediaSession();
    this.lockScreen();
    this.emit();
    this.gen++;
    await this.fill();
  }

  // Câu đang phát thật sự (theo đồng hồ âm thanh) và các câu còn lại chưa phát — dùng khi chuyển giọng
  nowSeg() {
    const t = stream.ctx?.currentTime || 0;
    return (this.sched.find((s) => t < s.end) || {}).seg || this.current;
  }
  pendingSegs() {
    const t = stream.ctx?.currentTime || 0;
    const cur = this.nowSeg();
    return [
      ...this.sched.filter((s) => s.seg !== cur && s.at > t).map((s) => s.seg),
      ...this.ahead.map((i) => i.seg),
    ];
  }

  // Xếp các câu đã tạo xong vào luồng, nối liền ngay sau câu trước
  pump() {
    const gen = this.gen;
    if (this.state !== 'playing') return;
    const ctx = stream.ctx;
    while (this.sched.length < SCHEDULED && this.ahead.length && this.ahead[0].ready) {
      const item = this.ahead.shift();
      if (!item.buffer) {
        this.onError?.(item.err?.message || 'Không tạo được giọng đọc');
        if (++this.errors >= 2) { this.stop(); return; }
        continue;
      }
      this.errors = 0;
      const buf = trimSilence(item.buffer);
      const at = Math.max(ctx.currentTime + 0.05, this.queueTime + (this.queueTime ? GAP : 0));
      const entry = { seg: item.seg, at, end: at + buf.duration };
      entry.src = stream.playAt(buf, at, () => {
        if (gen !== this.gen) return;
        this.sched = this.sched.filter((s) => s !== entry);
        this.pump();
        this.checkDone();
      });
      this.sched.push(entry);
      this.queueTime = entry.end;
      // Báo "đang đọc câu này" đúng lúc nó bắt đầu (để tô sáng, lật trang khi app đang mở)
      setTimeout(() => {
        if (gen !== this.gen) return;
        this.current = item.seg;
        this.onSegment?.(item.seg);
      }, Math.max(0, (at - ctx.currentTime) * 1000));
    }
    this.fill();
    this.checkDone();
  }
  checkDone() {
    if (this.state === 'playing' && this.done && !this.ahead.length && !this.sched.length && !this.filling) this.finish();
  }

  // Chuẩn bị trước vài câu: lấy câu từ sách và tạo âm thanh
  async fill() {
    if (this.filling) return this.filling;
    const gen = this.gen;
    this.filling = (async () => {
      while (gen === this.gen && !this.done && this.ahead.length < AHEAD) {
        let seg = null;
        try { seg = await this.provider.next(); } catch (e) { console.warn('Đọc to:', e); }
        if (gen !== this.gen) return;
        if (!seg) { this.done = true; break; }
        this.ahead.push(this.makeItem(seg));
      }
    })();
    try { await this.filling; } finally { this.filling = null; this.checkDone(); }
  }
  makeItem(seg) {
    const item = { seg };
    const gen = this.gen;
    item.buf = this.synth(seg.text).catch((e) => { item.err = e; return null; });
    item.buf.then((b) => { item.ready = true; item.buffer = b; if (gen === this.gen) this.pump(); });
    return item;
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    stream.suspend(); // tạm dừng cả luồng → câu đang đọc dừng đúng chỗ
    this.unlockScreen();
    this.emit();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    stream.resume();
    this.lockScreen();
    this.emit();
    this.pump();
  }

  // Đổi tốc độ / giọng: các câu chưa xếp lịch được tạo lại theo cài đặt mới
  refresh() {
    this.ahead = this.ahead.map(({ seg }) => this.makeItem(seg));
  }

  stop(silent) {
    this.gen++;
    const was = this.state;
    this.state = 'idle';
    this.current = null;
    stream.stopAll();
    this.ahead = [];
    this.sched = [];
    this.queueTime = 0;
    if (!this.keepStream) stream.suspend();
    this.unlockScreen();
    if (!silent && was !== 'idle') this.emit('stop');
    else this.updateMediaState();
  }

  finish() {
    this.state = 'idle';
    this.current = null;
    stream.suspend();
    this.unlockScreen();
    this.emit('end');
  }
}

// Tăng tốc âm thanh mà giữ nguyên cao độ (WSOLA): cắt thành các khung ~40ms, lấy khung cách nhau xa hơn
// (theo tốc độ) rồi ghép chồng lên nhau ở chỗ khớp sóng nhất → giọng nhanh hơn nhưng không bị "chíp chíp".
export function timeStretch(buffer, rate) {
  if (!buffer || Math.abs(rate - 1) < 0.02) return buffer;
  const sr = buffer.sampleRate;
  const input = buffer.getChannelData(0);
  const N = Math.round(sr * 0.04);
  const Hs = N >> 1;                   // bước ở đầu ra
  const Ha = Math.round(Hs * rate);    // bước ở đầu vào
  const tol = Math.round(N / 8);       // khoảng dò để khớp sóng
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const outLen = Math.ceil(input.length / rate) + N;
  const out = new Float32Array(outLen);
  const norm = new Float32Array(outLen);
  const addFrame = (inStart, outStart) => {
    for (let i = 0; i < N && outStart + i < outLen; i++) {
      out[outStart + i] += (input[inStart + i] || 0) * win[i];
      norm[outStart + i] += win[i];
    }
  };
  addFrame(0, 0);
  let prev = 0, inPos = 0, outPos = 0;
  while (inPos + Ha + N + tol < input.length) {
    const nominal = inPos + Ha;
    const ref = prev + Hs; // đoạn "tự nhiên" nối tiếp khung trước
    let best = 0, bestC = -Infinity;
    for (let k = -tol; k <= tol; k += 2) {
      const a = nominal + k;
      if (a < 0) continue;
      let c = 0;
      for (let j = 0; j < Hs; j += 4) c += input[a + j] * input[ref + j];
      if (c > bestC) { bestC = c; best = k; }
    }
    const start = nominal + best;
    outPos += Hs;
    addFrame(start, outPos);
    prev = start;
    inPos = nominal;
  }
  const len = Math.min(outLen, outPos + N);
  const res = stream.ctx.createBuffer(1, len, sr);
  const ch = res.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = norm[i] > 1e-3 ? out[i] / norm[i] : 0;
  return res;
}

/* ================= Giọng AI chạy trong máy (Piper) — dùng khi khoá màn hình / chuyển app ================= */
// Piper (mã nguồn mở) chạy ngay trong trình duyệt bằng WebAssembly; giọng tiếng Việt tải 1 lần từ Hugging Face
// rồi lưu trong máy (OPFS), sau đó dùng được cả khi không có mạng.
const PIPER = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm';
const PIPER_WASM = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/'; // khớp phiên bản onnxruntime mà gói +esm dùng

export const AI_VOICES = {
  'vi_VN-vais1000-medium': { label: 'Giọng AI rõ, tự nhiên', size: '63 MB' },
  'vi_VN-vivos-x_low': { label: 'Giọng AI nhẹ, nhanh (máy yếu)', size: '28 MB' },
};
export const AI_DEFAULT_VOICE = 'vi_VN-vais1000-medium';

let piper = null;
let piperSession = null;
let piperVoice = null;
let piperConfig = null; // cấu hình giọng (để chỉnh tốc độ nói)
let piperBaseLength = 1;
let piperChain = Promise.resolve();
const loadPiper = async () => (piper ||= await import(PIPER));

// Đã tải giọng về máy chưa
export async function aiVoiceStored(voiceId) {
  try { return (await (await loadPiper()).stored()).includes(voiceId); } catch { return false; }
}
// Tải trước giọng (chỉ tải tệp, chưa khởi động) — gọi khi đang mở app để lúc khoá màn hình dùng được ngay
export async function aiDownload(voiceId, onProgress) {
  const P = await loadPiper();
  if ((await P.stored()).includes(voiceId)) return;
  await P.download(voiceId, (p) => onProgress?.(p.loaded, p.total));
}
async function aiSession(voiceId) {
  if (piperSession && piperVoice === voiceId) return piperSession;
  const P = await loadPiper();
  P.TtsSession._instance = null; // gói chỉ giữ 1 phiên → tạo phiên mới khi đổi giọng
  // Bắt lấy đối tượng cấu hình giọng khi gói đọc nó (gói không cho chỉnh tốc độ nói qua tham số),
  // để về sau đặt length_scale = tốc độ mong muốn → giọng nói nhanh hơn mà không bị cao giọng.
  const parse = JSON.parse;
  let captured = null;
  JSON.parse = function patched(text, reviver) {
    const v = parse.call(this, text, reviver);
    if (!captured && v && v.inference && v.audio) captured = v;
    return v;
  };
  try {
    piperSession = await P.TtsSession.create({
      voiceId,
      wasmPaths: { onnxWasm: ORT_WASM, piperData: `${PIPER_WASM}.data`, piperWasm: `${PIPER_WASM}.wasm` },
    });
  } finally { JSON.parse = parse; }
  piperConfig = captured;
  piperBaseLength = captured?.inference?.length_scale || 1;
  piperVoice = voiceId;
  return piperSession;
}
// Khởi động sẵn giọng AI (đọc mô hình vào bộ nhớ) lúc app còn mở → khi khoá màn hình có tiếng ngay
export function aiWarmup(voiceId) {
  const run = piperChain.then(() => aiSession(voiceId));
  piperChain = run.catch(() => {});
  return run;
}
// Tạo từng câu một (mô hình không chạy song song được)
function aiSynth(voiceId, rate, text) {
  const run = piperChain.then(async () => {
    const s = await aiSession(voiceId);
    // Tạo giọng ở tốc độ gốc rồi tăng tốc giữ nguyên cao độ (chỉnh length_scale của Piper chỉ nhanh được
    // tối đa ~1.4× vì các khoảng ngừng không ngắn lại).
    if (piperConfig?.inference) piperConfig.inference.length_scale = piperBaseLength;
    const blob = await s.predict(text);
    return timeStretch(await stream.decode(await blob.arrayBuffer()), rate || 1);
  });
  piperChain = run.catch(() => {});
  return run;
}

export class AiSpeaker extends CloudSpeaker {
  // opts thêm: getAiVoice()
  synth(text) { return aiSynth(this.getAiVoice(), this.getRate(), text); }
}
