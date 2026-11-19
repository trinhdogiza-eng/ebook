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
    push(start, e);
    start = e;
  }
  if (start < text.length) push(start, text.length);
  return out;
}

export class Speaker {
  // opts: { getRate(), getVoiceURI(), onSegment(seg), onState(state, event) }
  constructor(opts) {
    Object.assign(this, opts);
    this.state = 'idle'; // idle | playing | paused
    this.gen = 0;
    this.current = null;
  }

  async start(provider) {
    this.stop(true);
    this.provider = provider;
    this.state = 'playing';
    this.lockScreen();
    this.emit();
    await this.advance(++this.gen);
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
    this.unlockScreen();
    this.emit();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    const gen = ++this.gen;
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
    this.unlockScreen();
    if (!silent && was !== 'idle') this.emit('stop');
  }

  finish() {
    this.state = 'idle';
    this.current = null;
    this.unlockScreen();
    this.emit('end');
  }

  emit(ev) { this.onState?.(this.state, ev); }

  async lockScreen() {
    try { if (!this.wake && navigator.wakeLock) this.wake = await navigator.wakeLock.request('screen'); } catch { /* không hỗ trợ */ }
  }
  unlockScreen() {
    const w = this.wake;
    this.wake = null;
    w?.release?.().catch(() => {});
  }
}
