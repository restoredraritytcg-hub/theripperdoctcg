/* Scans viewer — shared by the intake page (owner) and the website's Track Your Submission (customer link).
 * Plain script: window.ScanView.
 *
 * A card's scans (Items column V in the Sheet):
 *   { before: { front: {url, w, h, dpi, ok, boxes, centering, at}, back: {...} }, progress: {...}, after: {...} }
 * url is one straightened picture on Cloudinary. Corner and edge close-ups are Cloudinary crops of it
 * (boxes = [x0, y0, x1, y1] as fractions of the picture), so nothing else is uploaded.
 *
 *   ScanView.html(scans, { owner, photos })   → HTML for a card's scans (+ photos on the customer link)
 *   ScanView.wire(rootEl, scans, { owner, photos, onCentering(stage, side), onDelete(stage, side) })
 *   ScanView.grades(frontCentering, backCentering) → { PSA: "9", CGC: "9", BGS: "8" } (best grade centering allows)
 *   ScanView.pair(centering, "lr" | "tb")          → "55/45"
 *   ScanView.fit(url, width) / ScanView.crop(scan, key, width)
 *
 * Grade rules are copied from Restored Rarity's portal/common.js (CENTERING_RULES) — keep them in sync.
 */
(function () {
  "use strict";
  var STAGES = [["before", "Before"], ["progress", "In progress"], ["after", "After"]];
  var SIDES = [["front", "Front"], ["back", "Back"]];
  var CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
  var EDGES = ["top", "right", "bottom", "left"];
  var NICE = { "top-left": "Top left", "top-right": "Top right", "bottom-left": "Bottom left", "bottom-right": "Bottom right",
               top: "Top edge", right: "Right edge", bottom: "Bottom edge", left: "Left edge" };

  // Best grade the centering alone allows: [grade, worst front share, worst back share (null = not published)]
  var RULES = {
    PSA: { floor: "1", rules: [["10", 55, 75], ["9", 60, 90], ["8", 65, 90], ["7", 70, 90], ["6", 80, 90], ["5", 85, 90], ["3", 90, 90]] },
    CGC: { floor: "3 or lower", rules: [["Pristine 10", 50, 50], ["10", 55, 75], ["9", 60, 90], ["8", 65, null], ["7", 70, null],
                                         ["6", 75, null], ["4.5", 85, null], ["3.5", 90, null]] },
    BGS: { floor: "5.5 or lower", rules: [["Pristine 10", 50, 55], ["9.5", 55, 60], ["9", 55, 70], ["8", 60, 80],
                                           ["7", 65, 90], ["6", 70, 95]] }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function isCloud(u) { return /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(String(u || "")); }
  function tf(url, t) { return isCloud(url) ? url.replace("/image/upload/", "/image/upload/" + t + "/") : url; }
  function fit(url, width) { return tf(url, "c_limit,w_" + Math.round(width || 800) + "/f_auto,q_auto"); }
  function crop(scan, key, width) {
    var b = scan && scan.boxes && scan.boxes[key];
    if (!b || !scan.w || !scan.h || !isCloud(scan.url)) return "";
    var x = Math.round(b[0] * scan.w), y = Math.round(b[1] * scan.h);
    var w = Math.max(1, Math.round((b[2] - b[0]) * scan.w)), h = Math.max(1, Math.round((b[3] - b[1]) * scan.h));
    return tf(scan.url, "c_crop,x_" + x + ",y_" + y + ",w_" + w + ",h_" + h + "/c_limit,w_" + Math.round(width || 600) + ",h_" + Math.round(width || 600) + "/f_auto,q_auto");
  }

  // Centering summary (lr/tb as [a, b]); recomputed from the markers when it's missing.
  function summary(c) {
    if (!c || !c.lines) return null;
    if (c.summary && c.summary.lr && c.summary.tb) return c.summary;
    if (window.RRCentering) return window.RRCentering.summary(c);
    return null;
  }
  function pair(c, k) {
    var s = summary(c), p = s && s[k];
    if (!p) return "—";
    var a = Math.round(p[0]); return a + "/" + (100 - a);
  }
  function worst(c) {
    var s = summary(c);
    return s && s.lr && s.tb ? Math.round(Math.max(s.lr[0], s.lr[1], s.tb[0], s.tb[1])) : null;
  }
  function grades(front, back) {
    var f = worst(front), b = worst(back);
    if (f == null) return null;
    var out = {};
    Object.keys(RULES).forEach(function (co) {
      var R = RULES[co], hit = null;
      for (var i = 0; i < R.rules.length; i++) {
        var r = R.rules[i];
        if (f <= r[1] && (b == null || r[2] == null || b <= r[2])) { hit = r[0]; break; }
      }
      out[co] = hit || R.floor;
    });
    return out;
  }
  function gradesText(g) {
    if (!g) return "";
    return Object.keys(g).map(function (co) { return co + " " + g[co]; }).join(" · ");
  }

  // ---------------------------------------------------------------- styles
  var CSS = [
    ".sv{display:grid;gap:14px}",
    ".sv-stage{border:1px solid var(--line,#ccd);border-radius:10px;padding:12px;background:var(--panel-2,var(--panel2,transparent))}",
    ".sv-stage h4{margin:0 0 8px;font-size:15px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline}",
    ".sv-caps{font-size:12.5px;font-weight:600;color:var(--muted,#667)}",
    ".sv-sides{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:12px}",
    ".sv-side figure{margin:0}",
    ".sv-side .sv-img{display:block;width:100%;aspect-ratio:5/7;object-fit:contain;background:#0b0f18;border-radius:8px;cursor:zoom-in;border:0;padding:0}",
    ".sv-side .sv-img img{width:100%;height:100%;object-fit:contain;border-radius:8px;display:block}",
    ".sv-side figcaption{font-size:13px;margin-top:6px;line-height:1.4}",
    ".sv-side figcaption b{font-weight:700}",
    ".sv-cu{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px}",
    ".sv-cu button{padding:0;border:0;background:#0b0f18;border-radius:4px;aspect-ratio:1;cursor:zoom-in;overflow:hidden}",
    ".sv-cu img{width:100%;height:100%;object-fit:cover;display:block}",
    ".sv-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}",
    ".sv-acts button{font:inherit;font-size:12.5px;padding:4px 8px;border-radius:6px;border:1px solid var(--line,#ccd);background:transparent;color:inherit;cursor:pointer}",
    ".sv-acts button.warn{color:#c62f26;border-color:#c62f2655}",
    ".sv-empty{font-size:13px;color:var(--muted,#667);border:1px dashed var(--line,#ccd);border-radius:8px;aspect-ratio:5/7;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px}",
    ".sv-photos{display:flex;gap:8px;flex-wrap:wrap}",
    ".sv-photos button{padding:0;border:0;background:#0b0f18;border-radius:6px;width:84px;height:112px;overflow:hidden;cursor:zoom-in}",
    ".sv-photos img{width:100%;height:100%;object-fit:cover;display:block}",
    ".sv-ph h5{margin:0 0 6px;font-size:13px;color:var(--muted,#667);font-weight:700}",
    ".sv-lb{position:fixed;inset:0;z-index:2900;background:rgba(5,8,14,.94);display:flex;flex-direction:column;color:#fff}",
    ".sv-lb-top{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;font-size:14px}",
    ".sv-lb-top button,.sv-lb-nav button{font:inherit;background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:8px;padding:8px 14px;cursor:pointer;min-height:40px}",
    ".sv-lb-img{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:0 10px}",
    ".sv-lb-img img{max-width:100%;max-height:100%;object-fit:contain}",
    ".sv-lb-nav{display:flex;justify-content:center;gap:12px;padding:10px 14px calc(env(safe-area-inset-bottom) + 12px)}"
  ].join("\n");
  function css() {
    if (document.getElementById("sv-css")) return;
    var st = document.createElement("style"); st.id = "sv-css"; st.textContent = CSS; document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- lightbox
  function lightbox(list, start) {
    css();
    var i = start || 0, root = document.createElement("div");
    root.className = "sv-lb"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    root.innerHTML = '<div class="sv-lb-top"><span class="t"></span><button data-a="x">Close</button></div>' +
      '<div class="sv-lb-img"><img alt=""></div>' +
      '<div class="sv-lb-nav"><button data-a="p">‹ Previous</button><a class="sv-lb-full" target="_blank" rel="noopener" style="color:#fff;align-self:center;font-size:13px">Full size</a><button data-a="n">Next ›</button></div>';
    var img = root.querySelector("img"), t = root.querySelector(".t"), full = root.querySelector(".sv-lb-full");
    function show() {
      var x = list[i]; img.src = x.src; img.alt = x.label || ""; t.textContent = (x.label || "") + (list.length > 1 ? "  (" + (i + 1) + " of " + list.length + ")" : "");
      full.href = x.full || x.src;
      root.querySelector('[data-a="p"]').style.visibility = list.length > 1 ? "visible" : "hidden";
      root.querySelector('[data-a="n"]').style.visibility = list.length > 1 ? "visible" : "hidden";
    }
    function close() { document.removeEventListener("keydown", key); root.remove(); document.documentElement.style.overflow = ""; }
    function key(e) { if (e.key === "Escape") close(); if (e.key === "ArrowRight") { i = (i + 1) % list.length; show(); } if (e.key === "ArrowLeft") { i = (i - 1 + list.length) % list.length; show(); } }
    root.addEventListener("click", function (e) {
      var a = e.target.getAttribute && e.target.getAttribute("data-a");
      if (a === "x" || e.target === root || e.target.classList.contains("sv-lb-img")) close();
      if (a === "n") { i = (i + 1) % list.length; show(); }
      if (a === "p") { i = (i - 1 + list.length) % list.length; show(); }
    });
    document.addEventListener("keydown", key);
    document.body.appendChild(root); document.documentElement.style.overflow = "hidden";
    show();
  }

  // ---------------------------------------------------------------- render
  function has(scans) {
    return !!scans && STAGES.some(function (s) { var x = scans[s[0]]; return x && (x.front || x.back); });
  }
  function html(scans, opts) {
    opts = opts || {}; css(); scans = scans || {};
    var out = '<div class="sv">';
    STAGES.forEach(function (st) {
      var S = scans[st[0]] || {};
      if (!S.front && !S.back && !opts.owner) return;
      if (!S.front && !S.back && opts.owner && !opts.showEmpty) return;
      var g = opts.owner ? grades(S.front && S.front.centering, S.back && S.back.centering) : null;
      out += '<div class="sv-stage"><h4><span>' + esc(st[1]) + '</span>' +
        (g ? '<span class="sv-caps" title="Best grade the centering alone allows">Centering allows: ' + esc(gradesText(g)) + "</span>" : "") + "</h4>" +
        '<div class="sv-sides">';
      SIDES.forEach(function (sd) {
        var x = S[sd[0]], key = st[0] + "/" + sd[0];
        if (!x) { if (opts.owner) out += '<div class="sv-side"><div class="sv-empty">No ' + esc(sd[1].toLowerCase()) + " scan yet</div></div>"; return; }
        out += '<div class="sv-side"><figure><button class="sv-img" data-sv="' + key + '" aria-label="' + esc(st[1] + " " + sd[1]) + ' — open">' +
          '<img src="' + esc(fit(x.url, 520)) + '" alt="' + esc(st[1] + " " + sd[1].toLowerCase()) + '" loading="lazy"></button>' +
          "<figcaption><b>" + esc(sd[1]) + "</b>" + (x.centering ? " · L/R " + pair(x.centering, "lr") + " · T/B " + pair(x.centering, "tb") +
            (opts.owner && x.centering.edited_at ? ' <span title="You checked the markers">✓</span>' : "") : "") + "</figcaption>";
        if (x.ok && x.boxes && Object.keys(x.boxes).length) {
          out += '<div class="sv-cu">' + CORNERS.concat(EDGES).map(function (k) {
            var u = crop(x, k, 200);
            return u ? '<button data-sv="' + key + '" data-k="' + k + '" aria-label="' + esc(NICE[k]) + '"><img src="' + esc(u) + '" alt="' + esc(NICE[k]) + '" loading="lazy"></button>' : "";
          }).join("") + "</div>";
        }
        if (opts.owner) {
          out += '<div class="sv-acts">' + (x.centering ? '<button data-sv-c="' + key + '">Centering</button>' : "") +
            '<button class="warn" data-sv-d="' + key + '">Remove</button></div>';
        }
        out += "</figure></div>";
      });
      out += "</div></div>";
    });
    var P = opts.photos;
    if (P) {
      var groups = [["Your photos", [P.front, P.back].concat(P.details || []).filter(Boolean)], ["Before photos", P.before || []], ["After photos", P.after || []]];
      groups.forEach(function (g, gi) {
        if (!g[1].length) return;
        out += '<div class="sv-ph"><h5>' + esc(g[0]) + '</h5><div class="sv-photos">' + g[1].map(function (u, i) {
          return '<button data-sv-p="' + gi + "/" + i + '" aria-label="' + esc(g[0]) + " " + (i + 1) + '"><img src="' + esc(fit(u, 240)) + '" alt="" loading="lazy"></button>';
        }).join("") + "</div></div>";
      });
    }
    return out + "</div>";
  }

  function viewList(scans, stage, side) {
    var x = scans[stage][side], nm = { before: "Before", progress: "In progress", after: "After" }[stage] + " · " + (side === "front" ? "Front" : "Back");
    var list = [{ src: fit(x.url, 2000), full: x.url, label: nm }];
    if (x.ok && x.boxes) CORNERS.concat(EDGES).forEach(function (k) { var u = crop(x, k, 1400); if (u) list.push({ src: u, label: nm + " · " + NICE[k], k: k }); });
    return list;
  }
  function wire(root, scans, opts) {
    opts = opts || {}; scans = scans || {};
    root.querySelectorAll("[data-sv]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.getAttribute("data-sv").split("/"), list = viewList(scans, p[0], p[1]), k = b.getAttribute("data-k");
        var i = k ? Math.max(0, list.findIndex(function (x) { return x.k === k; })) : 0;
        lightbox(list, i);
      });
    });
    root.querySelectorAll("[data-sv-c]").forEach(function (b) {
      b.addEventListener("click", function () { var p = b.getAttribute("data-sv-c").split("/"); if (opts.onCentering) opts.onCentering(p[0], p[1]); });
    });
    root.querySelectorAll("[data-sv-d]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to remove"; setTimeout(function () { b.dataset.armed = ""; b.textContent = "Remove"; }, 3000); return; }
        var p = b.getAttribute("data-sv-d").split("/"); if (opts.onDelete) opts.onDelete(p[0], p[1]);
      });
    });
    var P = opts.photos;
    if (P) {
      var groups = [[P.front, P.back].concat(P.details || []).filter(Boolean), P.before || [], P.after || []];
      var names = ["Your photo", "Before photo", "After photo"];
      root.querySelectorAll("[data-sv-p]").forEach(function (b) {
        b.addEventListener("click", function () {
          var p = b.getAttribute("data-sv-p").split("/").map(Number), g = groups[p[0]];
          lightbox(g.map(function (u, i) { return { src: fit(u, 2000), full: u, label: names[p[0]] + " " + (i + 1) }; }), p[1]);
        });
      });
    }
  }

  // Opens the centering markers for one scan (loads centering.js from the same folder on first use).
  var here = (document.currentScript && document.currentScript.src) || "";
  function loadCentering() {
    if (window.RRCentering) return Promise.resolve(window.RRCentering);
    return new Promise(function (ok, bad) {
      var s = document.createElement("script"); s.src = here.replace(/scanview\.js(\?.*)?$/, "centering.js");
      s.onload = function () { ok(window.RRCentering); }; s.onerror = function () { bad(new Error("Couldn’t load the centering tool.")); };
      document.head.appendChild(s);
    });
  }
  function openCentering(scan, title, onSave) {
    return loadCentering().then(function (RC) {
      RC.open({ imageUrl: fit(scan.url, 2400), centering: scan.centering, autoCentering: scan.centeringAuto || scan.centering,
                title: title, editable: !!onSave, onSave: onSave });
    });
  }

  window.ScanView = { html: html, wire: wire, has: has, grades: grades, gradesText: gradesText, pair: pair, fit: fit, crop: crop,
                      lightbox: lightbox, openCentering: openCentering, STAGES: STAGES, SIDES: SIDES, RULES: RULES };
})();
