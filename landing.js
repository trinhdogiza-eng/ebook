(function () {
  "use strict";
  var APP_URL = "https://app.dvt-treebook.com/";

  // ----- Tabs: chọn thiết bị -----
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(os, focus) {
    tabs.forEach(function (t) {
      var on = t.dataset.os === os;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      if (on && focus) t.focus();
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t.dataset.os); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select(tabs[(i + d + tabs.length) % tabs.length].dataset.os, true);
    });
  });

  // ----- Tự nhận biết thiết bị đang xem -----
  var ua = navigator.userAgent || "";
  var isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var os = /Android/i.test(ua) ? "android"
    : (/iPhone|iPod/.test(ua) || isIPad) ? "ios"
    : /Macintosh|Mac OS X/.test(ua) ? "mac"
    : "windows";
  var names = { windows: "máy tính Windows", android: "Android", ios: isIPad ? "iPad" : "iPhone", mac: "Mac" };
  select(os);
  var det = document.getElementById("detected");
  if (det) { det.textContent = "Bạn đang dùng " + names[os] + " — hướng dẫn phù hợp đã được chọn sẵn."; det.hidden = false; }

  // ----- Mã QR cho điện thoại (chỉ hiện khi đang xem trên máy tính) -----
  if (os === "android" || os === "ios") {
    document.querySelectorAll(".qr-box").forEach(function (el) { el.hidden = true; });
  }
  try {
    if (window.qrcode) {
      var qr = window.qrcode(0, "M");
      qr.addData(APP_URL);
      qr.make();
      var svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      document.querySelectorAll("[data-qr]").forEach(function (el) {
        el.innerHTML = svg;
        el.setAttribute("role", "img");
        el.setAttribute("aria-label", "Mã QR mở " + APP_URL);
      });
    }
  } catch (e) { /* không có mã QR cũng không sao */ }
})();
