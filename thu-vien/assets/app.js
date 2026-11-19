(function () {
  "use strict";

  const BOOKS = window.BOOKS || [];
  const CATS = window.CATEGORIES || [];
  const app = document.getElementById("app");
  const $ = (s, r = document) => r.querySelector(s);

  // ---------- Helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || id;
  const byId = (id) => BOOKS.find((b) => b.id === id);
  const fmtNum = (n) => Number(n || 0).toLocaleString("vi-VN");
  const stars = (r) => { const f = Math.round(r || 0); return "★★★★★".slice(0, f) + "☆☆☆☆☆".slice(0, 5 - f); };

  const store = {
    get(k, d) { try { const v = localStorage.getItem("tq:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("tq:" + k, JSON.stringify(v)); } catch {} }
  };

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // Generated cover colours from title hash
  const PALETTE = [["#7a2e1d", "#c2562e"], ["#1f3b4d", "#3f7290"], ["#2f4a2a", "#5f8a4e"], ["#4b2a52", "#8a5498"], ["#5a4416", "#b0872c"], ["#22303f", "#52687f"], ["#6b1f3a", "#b44a6f"], ["#1d4a47", "#3d8a83"]];
  function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function cover(b, badge) {
    const inner = b.cover
      ? `<img src="${esc(b.cover)}" alt="Bìa sách ${esc(b.title)}" loading="lazy">`
      : (() => { const [a, c] = PALETTE[hash(b.id) % PALETTE.length];
          return `<div class="cover-gen" style="background:linear-gradient(155deg,${a},${c})"><span class="ct">${esc(b.title)}</span><span class="ca">${esc(b.author)}</span></div>`; })();
    return `<div class="cover">${badge ? `<span class="badge">${esc(badge)}</span>` : ""}${inner}</div>`;
  }
  const card = (b) => `<a class="card" href="#/sach/${b.id}">${cover(b, b.status === "Đang ra" ? "Đang ra" : "")}<span class="card-title">${esc(b.title)}</span><span class="card-meta">${esc(b.author)}</span></a>`;
  const grid = (list) => list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<div class="empty"><b>Không có sách nào</b>Thử từ khoá hoặc thể loại khác.</div>`;
  const rankList = (list) => `<ol class="rank">${list.map((b, i) => `<li><span class="n">${i + 1}</span><a href="#/sach/${b.id}">${cover(b)}</a><div class="info"><a href="#/sach/${b.id}"><b>${esc(b.title)}</b></a><span>${esc(b.author)} · ${fmtNum(b.views)} lượt xem</span></div></li>`).join("")}</ol>`;

  // ---------- Theme ----------
  function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  applyTheme(store.get("theme", null));
  $("#themeToggle").onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    applyTheme(next); store.set("theme", next);
  };

  // ---------- Category menu ----------
  const catMenu = $("#catMenu");
  catMenu.innerHTML = `<div class="wrap">${CATS.map((c) => `<a class="chip" href="#/the-loai/${c.id}">${esc(c.name)} <small>${BOOKS.filter((b) => b.category === c.id).length}</small></a>`).join("")}</div>`;
  $("#catToggle").onclick = () => { catMenu.hidden = !catMenu.hidden; $("#catToggle").setAttribute("aria-expanded", String(!catMenu.hidden)); };
  catMenu.addEventListener("click", (e) => { if (e.target.closest("a")) catMenu.hidden = true; });

  // ---------- Search ----------
  $("#searchForm").onsubmit = (e) => {
    e.preventDefault();
    const q = $("#searchInput").value.trim();
    location.hash = q ? "#/tim/" + encodeURIComponent(q) : "#/sach-moi";
  };
  function search(q) {
    const n = norm(q);
    return BOOKS.filter((b) => norm([b.title, b.author, catName(b.category), (b.tags || []).join(" ")].join(" ")).includes(n));
  }

  // ---------- Pages ----------
  function pageHome() {
    const hot = [...BOOKS].sort((a, b) => b.views - a.views);
    const fresh = [...BOOKS].sort((a, b) => b.year - a.year);
    const recent = store.get("history", []).map((h) => ({ h, b: byId(h.id) })).filter((x) => x.b).slice(0, 6);
    const totalCh = BOOKS.reduce((s, b) => s + (b.chapters || []).length, 0);
    return `
      <section class="hero">
        <div>
          <h1>Đọc online và tải ebook miễn phí</h1>
          <p>Kho sách nhiều thể loại, đọc ngay trên trình duyệt hoặc tải về EPUB, TXT để đọc trên Kindle, điện thoại, máy đọc sách.</p>
          <div class="hero-stats">
            <div><b>${BOOKS.length}</b><span>đầu sách</span></div>
            <div><b>${totalCh}</b><span>chương</span></div>
            <div><b>${CATS.length}</b><span>thể loại</span></div>
          </div>
        </div>
        <div class="hero-covers">${hot.slice(0, 3).map((b) => `<a href="#/sach/${b.id}" style="display:contents">${cover(b)}</a>`).join("")}</div>
      </section>

      ${recent.length ? `<section class="section"><div class="section-head"><h2>Đọc tiếp</h2><a href="#/tu-sach">Tủ sách →</a></div>
        <div class="grid">${recent.map(({ h, b }) => `<a class="card" href="#/doc/${b.id}/${h.ch}">${cover(b)}<span class="card-title">${esc(b.title)}</span><span class="card-meta">Chương ${h.ch + 1}/${(b.chapters || []).length}</span></a>`).join("")}</div></section>` : ""}

      <section class="section">
        <div class="section-head"><h2>Thể loại</h2></div>
        <div class="tags">${CATS.map((c) => `<a class="chip" href="#/the-loai/${c.id}">${esc(c.name)}</a>`).join("")}</div>
      </section>

      <div class="two-col">
        <section class="section">
          <div class="section-head"><h2>Sách mới cập nhật</h2><a href="#/sach-moi">Xem tất cả →</a></div>
          ${grid(fresh.slice(0, 8))}
        </section>
        <section class="section">
          <div class="section-head"><h2>Xem nhiều nhất</h2></div>
          ${rankList(hot.slice(0, 8))}
        </section>
      </div>`;
  }

  function listPage(title, list, crumb) {
    const sort = store.get("sort", "new");
    const sorted = [...list].sort(sort === "views" ? (a, b) => b.views - a.views : sort === "rating" ? (a, b) => b.rating - a.rating : sort === "az" ? (a, b) => a.title.localeCompare(b.title, "vi") : (a, b) => b.year - a.year);
    return `
      <div class="crumbs"><a href="#/">Trang chủ</a> › ${esc(crumb || title)}</div>
      <h1 class="page-title">${esc(title)}</h1>
      <div class="toolbar">
        <span class="muted">${list.length} sách</span><span class="spacer"></span>
        <select id="sortSel" aria-label="Sắp xếp">
          <option value="new"${sort === "new" ? " selected" : ""}>Mới nhất</option>
          <option value="views"${sort === "views" ? " selected" : ""}>Xem nhiều</option>
          <option value="rating"${sort === "rating" ? " selected" : ""}>Đánh giá cao</option>
          <option value="az"${sort === "az" ? " selected" : ""}>Tên A → Z</option>
        </select>
      </div>
      ${grid(sorted)}`;
  }

  function pageCategory(id) {
    const chips = `<div class="tags" style="margin-bottom:16px">${CATS.map((c) => `<a class="chip${c.id === id ? " active" : ""}" href="#/the-loai/${c.id}">${esc(c.name)}</a>`).join("")}</div>`;
    return listPage(catName(id), BOOKS.filter((b) => b.category === id), "Thể loại › " + catName(id)).replace('<div class="toolbar">', chips + '<div class="toolbar">');
  }

  // Link mở sách trong app Tree Ebook (cần file EPUB/PDF thật trên cùng trang web)
  function treeLink(b) {
    const f = (b.files || {}).epub || (b.files || {}).pdf;
    if (!window.READER_URL || !f || location.protocol === "file:") return "";
    const file = new URL(f, location.href).pathname;
    return new URL(window.READER_URL, location.href).href.split("#")[0].split("?")[0] + "?mo=" + encodeURIComponent(file);
  }

  function pageBook(id) {
    const b = byId(id);
    if (!b) return notFound();
    const chs = b.chapters || [];
    const saved = store.get("shelf", []).includes(b.id);
    const prog = store.get("progress", {})[b.id];
    const readSet = new Set(store.get("read:" + b.id, []));
    const files = b.files || {};
    const FMT = { epub: ["EPUB", "#2f7d4f", "Đọc trên điện thoại, máy đọc sách"], azw3: ["AZW3", "#c26a12", "Dành cho Kindle"], mobi: ["MOBI", "#a3561b", "Kindle đời cũ"], pdf: ["PDF", "#b3261e", "In ấn, máy tính"] };
    let dls = Object.keys(FMT).filter((k) => files[k]).map((k) => `<a class="dl" href="${esc(files[k])}" download><span class="fmt" style="background:${FMT[k][1]}">${FMT[k][0]}</span><div><b>Tải ${FMT[k][0]}</b><span>${FMT[k][2]}</span></div></a>`).join("");
    if (chs.length) {
      if (!files.epub) dls += `<button class="dl" data-gen="epub"><span class="fmt" style="background:#2f7d4f">EPUB</span><div><b>Tải EPUB</b><span>Tạo từ nội dung online</span></div></button>`;
      dls += `<button class="dl" data-gen="txt"><span class="fmt" style="background:#55606b">TXT</span><div><b>Tải TXT</b><span>Văn bản thuần</span></div></button>`;
      dls += `<button class="dl" data-gen="html"><span class="fmt" style="background:#2b5c9e">HTML</span><div><b>Tải HTML</b><span>Mở bằng trình duyệt</span></div></button>`;
    }
    const related = BOOKS.filter((x) => x.category === b.category && x.id !== b.id).slice(0, 6);
    document.title = `${b.title} — ${b.author} | Thư Quán`;
    return `
      <div class="crumbs"><a href="#/">Trang chủ</a> › <a href="#/the-loai/${b.category}">${esc(catName(b.category))}</a> › ${esc(b.title)}</div>
      <article class="detail">
        ${cover(b)}
        <div>
          <h1>${esc(b.title)}</h1>
          <div class="by">Tác giả: <a href="#/tim/${encodeURIComponent(b.author)}">${esc(b.author)}</a></div>
          <dl class="facts">
            <div><dt>Thể loại</dt><dd><a href="#/the-loai/${b.category}">${esc(catName(b.category))}</a></dd></div>
            <div><dt>Trạng thái</dt><dd>${esc(b.status)}</dd></div>
            <div><dt>Số chương</dt><dd>${chs.length}</dd></div>
            <div><dt>Lượt xem</dt><dd>${fmtNum(b.views)}</dd></div>
            <div><dt>Đánh giá</dt><dd><span class="stars">${stars(b.rating)}</span> ${b.rating ?? ""}</dd></div>
          </dl>
          <div class="actions">
            ${treeLink(b) ? `<a class="btn primary" href="${esc(treeLink(b))}">📖 Đọc bằng Tree Ebook</a>` : ""}
            ${chs.length ? `<a class="btn${treeLink(b) ? "" : " primary"}" href="#/doc/${b.id}/${prog ?? 0}">${prog != null ? `Đọc tiếp chương ${prog + 1}` : "Đọc online"}</a>` : ""}
            <a class="btn" href="#tai-ve" id="jumpDl">⬇ Tải về</a>
            <button class="btn" id="shelfBtn">${saved ? "✓ Đã lưu tủ sách" : "+ Lưu tủ sách"}</button>
            <button class="btn" id="shareBtn">Chia sẻ</button>
          </div>
          <p class="desc">${esc(b.description)}</p>
          <div class="tags">${(b.tags || []).map((t) => `<a class="chip" href="#/tim/${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}</div>
        </div>
      </article>

      <section class="panel" id="tai-ve">
        <h2>Tải ebook</h2>
        ${dls ? `<div class="downloads">${dls}</div>` : `<p class="muted">Sách này chưa có file tải về.</p>`}
      </section>

      ${chs.length ? `<section class="panel"><h2>Danh sách chương</h2>
        <ol class="chapters">${chs.map((c, i) => `<li><a class="${readSet.has(i) ? "read" : ""}" href="#/doc/${b.id}/${i}">${esc(c.title)}</a></li>`).join("")}</ol></section>` : ""}

      ${related.length ? `<section class="section" style="margin-top:32px"><div class="section-head"><h2>Cùng thể loại</h2></div>${grid(related)}</section>` : ""}`;
  }

  function bindBook(id) {
    const b = byId(id);
    if (!b) return;
    const sb = $("#shelfBtn");
    sb && (sb.onclick = () => {
      let shelf = store.get("shelf", []);
      const has = shelf.includes(id);
      shelf = has ? shelf.filter((x) => x !== id) : [id, ...shelf];
      store.set("shelf", shelf);
      sb.textContent = has ? "+ Lưu tủ sách" : "✓ Đã lưu tủ sách";
      toast(has ? "Đã bỏ khỏi tủ sách" : "Đã lưu vào tủ sách");
    });
    $("#jumpDl").onclick = (e) => { e.preventDefault(); $("#tai-ve").scrollIntoView({ behavior: "smooth" }); };
    $("#shareBtn").onclick = async () => {
      const url = location.href;
      try { if (navigator.share) await navigator.share({ title: b.title, url }); else { await navigator.clipboard.writeText(url); toast("Đã sao chép liên kết"); } } catch {}
    };
    app.querySelectorAll("[data-gen]").forEach((btn) => btn.onclick = () => download(b, btn.dataset.gen));
  }

  // ---------- Reader ----------
  const RDEF = { theme: "default", size: 19, font: "serif", width: 720, lh: 1.85 };
  function readerSettings() { return Object.assign({}, RDEF, store.get("reader", {})); }

  function pageRead(id, n) {
    const b = byId(id);
    if (!b || !(b.chapters || []).length) return notFound();
    const chs = b.chapters;
    n = Math.max(0, Math.min(chs.length - 1, n | 0));
    const c = chs[n];
    const s = readerSettings();
    document.title = `${c.title} — ${b.title} | Thư Quán`;
    // progress & history
    const prog = store.get("progress", {}); prog[id] = n; store.set("progress", prog);
    const hist = store.get("history", []).filter((h) => h.id !== id); hist.unshift({ id, ch: n, t: Date.now() }); store.set("history", hist.slice(0, 30));
    const rs = new Set(store.get("read:" + id, [])); rs.add(n); store.set("read:" + id, [...rs]);

    const sel = `<select id="chSel" aria-label="Chọn chương">${chs.map((x, i) => `<option value="${i}"${i === n ? " selected" : ""}>${esc(x.title)}</option>`).join("")}</select>`;
    const nav = (pos) => `<div class="reader-nav">
      <a class="btn" href="#/doc/${id}/${n - 1}" ${n === 0 ? "disabled" : ""}>‹ Chương trước</a>
      ${pos === "bottom" ? sel.replace('id="chSel"', 'id="chSel2"') : sel}
      <a class="btn primary" href="#/doc/${id}/${n + 1}" ${n === chs.length - 1 ? "disabled" : ""}>Chương sau ›</a></div>`;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, label, style]) => `<button data-k="${key}" data-v="${v}" class="${String(s[key]) === String(v) ? "on" : ""}${style ? " swatch" : ""}" ${style ? `style="${style}" aria-label="${label}"` : ""}>${style ? "" : label}</button>`).join("")}</div>`;
    return `
      <div class="progress" id="progress"></div>
      <div class="reader ${s.theme !== "default" ? "t-" + s.theme : ""}" id="reader" style="--r-size:${s.size}px;--r-width:${s.width}px;--r-lh:${s.lh};--r-font:${s.font === "sans" ? "var(--ui)" : "var(--serif)"}">
        <div class="reader-top">
          <div class="reader-book"><a href="#/sach/${id}">${esc(b.title)}</a> · ${esc(b.author)}</div>
          <div class="settings">
            <button class="btn" id="setBtn" aria-expanded="false">Aa Tuỳ chỉnh</button>
            <div class="settings-pop" id="setPop" hidden>
              <label>Màu nền</label>
              ${seg("theme", [["default", "Mặc định", "background:#fbf8f1"], ["white", "Trắng", "background:#fff"], ["sepia", "Giấy cũ", "background:#f3e7cf"], ["green", "Xanh dịu", "background:#dfecdc"], ["dark", "Tối", "background:#141414"]])}
              <label>Cỡ chữ: <b id="sizeVal">${s.size}px</b></label>
              <div class="seg"><button data-act="size-">A−</button><button data-act="size+">A+</button></div>
              <label>Phông chữ</label>
              ${seg("font", [["serif", "Có chân"], ["sans", "Không chân"]])}
              <label>Giãn dòng</label>
              ${seg("lh", [["1.5", "Hẹp"], ["1.85", "Vừa"], ["2.2", "Rộng"]])}
              <label>Độ rộng khung</label>
              ${seg("width", [["600", "Hẹp"], ["720", "Vừa"], ["900", "Rộng"]])}
            </div>
          </div>
        </div>
        <div class="reader-shell">
          <div class="reader-inner">
            <h1>${esc(c.title)}</h1>
            ${nav("top")}
            <div class="reader-text" style="margin-top:28px">${(c.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
            ${nav("bottom")}
          </div>
        </div>
        <p class="muted" style="text-align:center;font-size:13px;margin-top:14px">Phím ← → để chuyển chương</p>
      </div>`;
  }

  function bindRead(id, n) {
    const b = byId(id); if (!b) return;
    const reader = $("#reader");
    const go = (i) => { if (i >= 0 && i < b.chapters.length) location.hash = `#/doc/${id}/${i}`; };
    ["#chSel", "#chSel2"].forEach((q) => { const el = $(q); el && (el.onchange = () => go(+el.value)); });
    const pop = $("#setPop");
    $("#setBtn").onclick = (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; $("#setBtn").setAttribute("aria-expanded", String(!pop.hidden)); };
    pop.onclick = (e) => {
      e.stopPropagation();
      const btn = e.target.closest("button"); if (!btn) return;
      const s = readerSettings();
      if (btn.dataset.act) s.size = Math.max(14, Math.min(30, s.size + (btn.dataset.act === "size+" ? 1 : -1)));
      else { const k = btn.dataset.k; s[k] = k === "theme" || k === "font" ? btn.dataset.v : Number(btn.dataset.v); pop.querySelectorAll(`[data-k="${k}"]`).forEach((x) => x.classList.toggle("on", x === btn)); }
      store.set("reader", s);
      reader.className = "reader" + (s.theme !== "default" ? " t-" + s.theme : "");
      reader.style.cssText = `--r-size:${s.size}px;--r-width:${s.width}px;--r-lh:${s.lh};--r-font:${s.font === "sans" ? "var(--ui)" : "var(--serif)"}`;
      $("#sizeVal").textContent = s.size + "px";
    };
    document.addEventListener("click", closePop);
    function closePop() { pop.hidden = true; }
    cleanup.push(() => document.removeEventListener("click", closePop));
    const onKey = (e) => { if (e.target.matches("input,select,textarea")) return; if (e.key === "ArrowLeft") go(n - 1); if (e.key === "ArrowRight") go(n + 1); };
    document.addEventListener("keydown", onKey);
    cleanup.push(() => document.removeEventListener("keydown", onKey));
    const bar = $("#progress");
    const onScroll = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 100) + "%"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    cleanup.push(() => removeEventListener("scroll", onScroll));
  }

  // ---------- Shelf ----------
  function pageShelf() {
    const shelf = store.get("shelf", []).map(byId).filter(Boolean);
    const hist = store.get("history", []).map((h) => ({ h, b: byId(h.id) })).filter((x) => x.b);
    return `
      <div class="crumbs"><a href="#/">Trang chủ</a> › Tủ sách</div>
      <h1 class="page-title">Tủ sách của bạn</h1>
      <p class="muted" style="margin-top:0">Lưu trên trình duyệt này.</p>
      <section class="section"><div class="section-head"><h2>Đã lưu (${shelf.length})</h2></div>
        ${shelf.length ? grid(shelf) : `<div class="empty"><b>Chưa lưu sách nào</b>Bấm “Lưu tủ sách” ở trang thông tin sách.</div>`}</section>
      <section class="section"><div class="section-head"><h2>Lịch sử đọc</h2>${hist.length ? `<a href="#" id="clearHist">Xoá lịch sử</a>` : ""}</div>
        ${hist.length ? `<ol class="rank">${hist.map(({ h, b }, i) => `<li><span class="n">${i + 1}</span><a href="#/doc/${b.id}/${h.ch}">${cover(b)}</a><div class="info"><a href="#/doc/${b.id}/${h.ch}"><b>${esc(b.title)}</b></a><span>Đang đọc: ${esc(b.chapters[h.ch]?.title || "")} · ${new Date(h.t).toLocaleDateString("vi-VN")}</span></div></li>`).join("")}</ol>` : `<div class="empty"><b>Chưa có lịch sử</b>Các sách bạn đọc sẽ hiện ở đây.</div>`}</section>`;
  }

  function notFound() {
    return `<div class="empty"><b>Không tìm thấy trang</b><a class="btn" href="#/" style="margin-top:12px">Về trang chủ</a></div>`;
  }

  // ---------- Downloads ----------
  const slugFile = (b) => norm(b.title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const xml = (s) => esc(s).replace(/&#39;/g, "&apos;");

  async function download(b, kind) {
    const name = slugFile(b);
    if (kind === "txt") {
      const txt = `${b.title}\nTác giả: ${b.author}\n\n${b.description}\n\n` + b.chapters.map((c) => `\n${c.title}\n\n${c.paragraphs.join("\n\n")}\n`).join("\n");
      saveBlob(new Blob(["﻿" + txt], { type: "text/plain;charset=utf-8" }), name + ".txt");
    } else if (kind === "html") {
      const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.title)}</title><style>body{max-width:720px;margin:auto;padding:24px 16px;font:19px/1.8 Georgia,serif;background:#fbf8f1;color:#2b2925}h1,h2{text-align:center}p{text-align:justify;text-indent:1.6em}</style></head><body><h1>${esc(b.title)}</h1><p style="text-align:center;text-indent:0">${esc(b.author)}</p>${b.chapters.map((c) => `<h2>${esc(c.title)}</h2>${c.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}`).join("")}</body></html>`;
      saveBlob(new Blob([html], { type: "text/html;charset=utf-8" }), name + ".html");
    } else if (kind === "epub") {
      if (!window.JSZip) return toast("Không tải được thư viện tạo EPUB (cần Internet)");
      saveBlob(await makeEpub(b), name + ".epub");
    }
    toast("Đang tải " + kind.toUpperCase() + "…");
  }

  async function makeEpub(b) {
    const zip = new JSZip();
    const uid = "urn:uuid:" + ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
    const page = (title, body) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="vi" lang="vi"><head><meta charset="UTF-8"/><title>${xml(title)}</title><link rel="stylesheet" href="style.css"/></head><body>${body}</body></html>`;
    zip.file("OEBPS/style.css", "body{font-family:serif;line-height:1.7;margin:0 5%}h1{text-align:center;margin:2em 0 1em}p{text-indent:1.5em;margin:0 0 .6em;text-align:justify}.title{text-align:center;margin-top:30%}.title p{text-indent:0;text-align:center}");
    zip.file("OEBPS/title.xhtml", page(b.title, `<div class="title"><h1>${xml(b.title)}</h1><p>${xml(b.author)}</p><p>${xml(b.description)}</p></div>`));
    b.chapters.forEach((c, i) => zip.file(`OEBPS/ch${i + 1}.xhtml`, page(c.title, `<h1>${xml(c.title)}</h1>${c.paragraphs.map((p) => `<p>${xml(p)}</p>`).join("")}`)));
    zip.file("OEBPS/nav.xhtml", page("Mục lục", `<nav epub:type="toc" id="toc"><h1>Mục lục</h1><ol>${b.chapters.map((c, i) => `<li><a href="ch${i + 1}.xhtml">${xml(c.title)}</a></li>`).join("")}</ol></nav>`));
    zip.file("OEBPS/toc.ncx", `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${uid}"/></head><docTitle><text>${xml(b.title)}</text></docTitle><navMap>${b.chapters.map((c, i) => `<navPoint id="n${i + 1}" playOrder="${i + 1}"><navLabel><text>${xml(c.title)}</text></navLabel><content src="ch${i + 1}.xhtml"/></navPoint>`).join("")}</navMap></ncx>`);
    const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="vi"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">${uid}</dc:identifier><dc:title>${xml(b.title)}</dc:title><dc:creator>${xml(b.author)}</dc:creator><dc:language>vi</dc:language><dc:description>${xml(b.description)}</dc:description><meta property="dcterms:modified">${now}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>${b.chapters.map((_, i) => `<item id="ch${i + 1}" href="ch${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("")}</manifest><spine toc="ncx"><itemref idref="title"/>${b.chapters.map((_, i) => `<itemref idref="ch${i + 1}"/>`).join("")}</spine></package>`);
    return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  }

  // ---------- Router ----------
  let cleanup = [];
  function route() {
    cleanup.forEach((f) => f()); cleanup = [];
    document.title = "Thư Quán — Đọc & tải ebook miễn phí";
    document.body.classList.remove("reading");
    const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    const [p, a, c] = parts;
    let html, after;
    if (!p) html = pageHome();
    else if (p === "the-loai") html = pageCategory(a);
    else if (p === "sach-moi") html = listPage("Tất cả sách", BOOKS);
    else if (p === "tim") { html = listPage(`Kết quả cho “${a}”`, search(a || ""), "Tìm kiếm"); $("#searchInput").value = a || ""; }
    else if (p === "sach") { html = pageBook(a); after = () => bindBook(a); }
    else if (p === "doc") { html = pageRead(a, +c || 0); document.body.classList.add("reading"); after = () => bindRead(a, Math.max(0, +c || 0)); }
    else if (p === "tu-sach") { html = pageShelf(); after = () => { const x = $("#clearHist"); x && (x.onclick = (e) => { e.preventDefault(); store.set("history", []); route(); }); }; }
    else html = notFound();
    app.innerHTML = html;
    const ss = $("#sortSel"); ss && (ss.onchange = () => { store.set("sort", ss.value); route(); });
    after && after();
    scrollTo(0, 0);
  }
  addEventListener("hashchange", route);
  route();
})();
