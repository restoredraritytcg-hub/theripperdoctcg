// Scan station inside the intake page (#scan). Owner only — it runs behind the intake PIN.
//
// Adds scans to a card of an order: front → back → next card. Three ways in:
//   • Watch a scan folder (computer, Chrome or Edge): every new scan the scanner saves there is picked up.
//   • Choose files / drag and drop (any device).
//   • Camera (phones): continuous, with a bubble level and auto-capture.
// Each picture is straightened and cropped in the browser (scanproc.js for scanner files, photo.js for
// phone photos), centering is measured, the picture goes to Cloudinary and the scan is saved to the
// card's "Scans" column in the Sheet. Corner/edge close-ups are Cloudinary crops — nothing else uploads.
//
// mount(rootEl, ctx) → { apply(params), el }
// ctx = { C, api(body), toast(msg, ms), esc, upload(blob, folder) → {url, w, h} }
import * as P from "./scanproc.js";
import { processImage } from "./photo.js";
import { openCamera } from "./camera.js";

const SV = () => window.ScanView;
const STAGES = [["before", "Before"], ["progress", "In progress"], ["after", "After"]];
const STAGE_NAME = Object.fromEntries(STAGES);
const IMG_RE = /\.(jpe?g|png|webp|bmp|gif|heic|heif)$/i;
const UPLOAD_LONG = 3200;           // long side of the saved picture (close-ups are cut from it)
const SCAN_DPI_MIN = 150;           // files with at least this dpi in their metadata are treated as scanner files

const canDir = () => typeof window.showDirectoryPicker === "function";

// ---------------------------------------------------------------- IndexedDB (remember the watched folder)
function idb() {
  return new Promise((ok, bad) => {
    const r = indexedDB.open("scan-station", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error);
  });
}
async function kv(key, val) {
  try {
    const db = await idb();
    return await new Promise((ok, bad) => {
      const tx = db.transaction("kv", val === undefined ? "readonly" : "readwrite"), st = tx.objectStore("kv");
      const r = val === undefined ? st.get(key) : val === null ? st.delete(key) : st.put(val, key);
      r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error);
    });
  } catch { return undefined; }
}

// ---------------------------------------------------------------- image helpers
function resized(src, maxSide) {
  const s = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * s)); c.height = Math.max(1, Math.round(src.height * s));
  const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const toBlob = (c, type = "image/jpeg", q = 0.9) =>
  c.convertToBlob ? c.convertToBlob({ type, quality: q }) : new Promise((r) => c.toBlob(r, type, q));
function toCanvas(c) {   // OffscreenCanvas → canvas (for drawing previews)
  if (c instanceof HTMLCanvasElement) return c;
  const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; o.getContext("2d").drawImage(c, 0, 0); return o;
}

// Scanner file (dpi in its metadata) → up to maxCards cards; phone photo → one card (perspective corrected).
async function analyzeFile(file, maxCards) {
  const meta = await P.fileDpi(file).catch(() => null);
  const bmp = await createImageBitmap(file);
  try {
    if (meta && meta >= SCAN_DPI_MIN) {
      const { cards, dpi } = P.detectCards(bmp, bmp.width, bmp.height, meta, maxCards);
      const out = [];
      for (const c of cards) {
        const m = 0.25 * dpi, [x, y, w, h] = c.box;
        const x0 = Math.max(0, Math.floor(x - m)), y0 = Math.max(0, Math.floor(y - m));
        const x1 = Math.min(bmp.width, Math.ceil(x + w + m)), y1 = Math.min(bmp.height, Math.ceil(y + h + m));
        const reg = P.canvas(x1 - x0, y1 - y0);
        reg.getContext("2d").drawImage(bmp, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
        const cr = P.cropCard(reg, x1 - x0, y1 - y0, dpi);
        const cv = cr.canvas, W = cv.width, H = cv.height;
        let centering = null, boxes = {};
        if (cr.ok) {
          ({ boxes } = P.detailRegions(W, H, dpi));
          try { centering = P.measureCentering(cv.getContext("2d").getImageData(0, 0, W, H), dpi); } catch { centering = null; }
        }
        out.push({ canvas: cv, ok: cr.ok, dpi, centering, boxes, kind: "scan" });
      }
      if (out.length) return out;
    }
    const r = await processImage(bmp);
    return [{ canvas: r.canvas, ok: r.ok, dpi: r.dpi || meta || null, centering: r.centering, boxes: r.boxes || {}, kind: "photo" }];
  } finally { bmp.close && bmp.close(); }
}

// ---------------------------------------------------------------- the station
export function mount(root, ctx) {
  const { api, toast, esc, upload } = ctx;
  const S = {
    orders: [], order: null, items: [], num: null, stage: "before", side: "front", perScan: 1,
    queue: [], busy: false, log: [], dir: null, watching: false, seen: new Set(), pending: new Map(), timer: null,
  };
  const el = document.createElement("div");
  el.className = "st";
  el.innerHTML = `
    <h1 class="st-h">Scan station</h1>
    <section class="panel st-pick">
      <div class="st-grid">
        <label class="f">Order<select id="st-order"><option value="">Loading orders…</option></select></label>
        <label class="f">Card<select id="st-card" disabled><option value="">Pick an order first</option></select></label>
      </div>
      <div class="st-row"><span class="st-lbl">Stage</span><div class="seg" id="st-stage" role="group" aria-label="Stage">${STAGES.map(([k, l]) =>
        `<button type="button" data-v="${k}">${l}</button>`).join("")}</div></div>
      <div class="st-row"><span class="st-lbl">Side</span><div class="seg" id="st-side" role="group" aria-label="Side">
        <button type="button" data-v="front">Front</button><button type="button" data-v="back">Back</button></div>
        <span class="st-lbl" style="margin-left:8px">Cards per scan</span><div class="seg" id="st-per" role="group" aria-label="Cards per scan">
        <button type="button" data-v="1">1</button><button type="button" data-v="2">2</button><button type="button" data-v="3">3</button></div></div>
      <p class="st-next" id="st-next" aria-live="polite"></p>
    </section>
    <section class="panel st-add">
      <h2>Add scans</h2>
      <div class="st-btns">
        ${canDir() ? `<button class="btn" id="st-watch">Watch scan folder</button>` : ""}
        <label class="btn ${canDir() ? "ghost" : ""}" id="st-pickf">Choose files<input type="file" accept="image/*,.heic,.heif" multiple hidden></label>
        <button class="btn ghost" id="st-cam">Use camera</button>
      </div>
      <p class="st-folder muted" id="st-folder"></p>
      <div class="st-drop" id="st-drop">Drop scans or photos here</div>
      <p class="muted st-tip">Front first, then flip the card for the back — the station moves to the next card on its own.
        <a href="help.html#scan-station" target="_blank" rel="noopener">How to set up scanning</a></p>
    </section>
    <section class="st-log" id="st-log" aria-live="polite"></section>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);

  // ---------------- pickers
  const seg = (id, val, on) => {
    el.querySelectorAll(`#${id} button`).forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.v === String(val)));
      b.onclick = () => on(b.dataset.v);
    });
  };
  function cardName(it) { return `Card ${it.num}${it.name ? ": " + it.name : ""}`; }
  function scanOf(num, stage, side) { const it = S.items.find((x) => String(x.num) === String(num)); return it && it.scans && it.scans[stage] && it.scans[stage][side]; }
  function drawPickers() {
    seg("st-stage", S.stage, (v) => { S.stage = v; S.side = "front"; drawPickers(); });
    seg("st-side", S.side, (v) => { S.side = v; drawPickers(); });
    seg("st-per", S.perScan, (v) => { S.perScan = Number(v); drawPickers(); });
    const cs = $("#st-card");
    if (S.order) {
      cs.disabled = false;
      cs.innerHTML = S.items.map((it) => {
        const done = ["front", "back"].filter((sd) => scanOf(it.num, S.stage, sd)).length;
        return `<option value="${esc(it.num)}"${String(it.num) === String(S.num) ? " selected" : ""}>${esc(cardName(it))}${done ? ` (${done === 2 ? "✓ front + back" : "1 side"})` : ""}</option>`;
      }).join("");
    }
    const it = S.items.find((x) => String(x.num) === String(S.num));
    const nums = it ? S.items.slice(S.items.indexOf(it), S.items.indexOf(it) + S.perScan).map((x) => x.num) : [];
    $("#st-next").innerHTML = !S.order ? "Pick an order to start." : !it ? "This order has no cards." :
      `Next scan: <b>${nums.length > 1 ? "Cards " + nums.join(", ") : esc(cardName(it))}</b> · ${esc(STAGE_NAME[S.stage])} · <b>${S.side === "front" ? "Front" : "Back"}</b>` +
      (S.perScan > 1 && nums.length < S.perScan ? ` <span class="warn-t">Only ${nums.length} card${nums.length > 1 ? "s" : ""} left in this order</span>` : "") +
      (scanOf(S.num, S.stage, S.side) ? ` <span class="muted">(replaces the scan already saved)</span>` : "");
  }
  async function loadOrders() {
    try {
      const d = await api({ action: "list" });
      S.orders = (d.orders || []).slice().sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      const open = S.orders.filter((o) => !(d.doneStages || []).includes(o.status));
      const rest = S.orders.filter((o) => (d.doneStages || []).includes(o.status));
      const opt = (o) => `<option value="${esc(o.id)}">${esc(o.ref)} · ${esc(o.name || "No name")} (${o.count || 0})</option>`;
      $("#st-order").innerHTML = `<option value="">Choose an order</option>` + (open.length ? `<optgroup label="Open">${open.map(opt).join("")}</optgroup>` : "") +
        (rest.length ? `<optgroup label="Finished">${rest.map(opt).join("")}</optgroup>` : "");
      if (S.order) $("#st-order").value = S.order.id;
    } catch (e) { $("#st-order").innerHTML = `<option value="">Couldn’t load orders</option>`; toast(e.message); }
  }
  async function loadOrder(id, num) {
    if (!id) { S.order = null; S.items = []; S.num = null; drawPickers(); return; }
    $("#st-card").disabled = true; $("#st-card").innerHTML = "<option>Loading…</option>";
    const d = await api({ action: "order", id });
    S.order = d.order; S.items = d.order.items || [];
    const want = num != null && S.items.some((x) => String(x.num) === String(num)) ? num : (S.items[0] && S.items[0].num);
    S.num = want == null ? null : want;
    $("#st-order").value = id;
    drawPickers();
  }
  $("#st-order").onchange = (e) => { loadOrder(e.target.value).catch((err) => toast(err.message)); };
  $("#st-card").onchange = (e) => { S.num = e.target.value; S.side = "front"; drawPickers(); };

  // ---------------- processing queue
  function enqueue(files, source) {
    for (const f of files) if (f && (IMG_RE.test(f.name || "") || /^image\//.test(f.type || ""))) S.queue.push({ file: f, source });
    pump();
  }
  async function pump() {
    if (S.busy) return;
    S.busy = true;
    try { while (S.queue.length) await handle(S.queue.shift()); }
    finally { S.busy = false; }
  }

  function advance(nums) {
    if (S.side === "front") { S.side = "back"; S.num = nums[0]; }
    else {
      const last = S.items.findIndex((x) => String(x.num) === String(nums[nums.length - 1]));
      const next = S.items[last + 1];
      S.side = "front";
      if (next) S.num = next.num;
      else toast("That was the last card in this order.", 5000);
    }
    drawPickers();
  }

  async function handle({ file, source }) {
    if (!S.order) { toast("Pick an order first — then add the scan again."); return; }
    const at = S.items.findIndex((x) => String(x.num) === String(S.num));
    if (at < 0) { toast("Pick a card first."); return; }
    const stage = S.stage, side = S.side, order = S.order;
    const entry = logEntry(file.name || "camera photo");
    let cards;
    try { cards = await analyzeFile(file, S.perScan); }
    catch (e) { entry.fail("Couldn’t read this picture: " + e.message); return; }
    const targets = S.items.slice(at, at + cards.length);
    if (targets.length < cards.length) entry.note(`Found ${cards.length} cards but only ${targets.length} left in this order — the extra one${cards.length - targets.length > 1 ? "s were" : " was"} skipped.`);
    if (S.perScan > 1 && cards.length < S.perScan) entry.note(`Found ${cards.length} of ${S.perScan} cards in this scan.`);
    entry.clear();
    const nums = [];
    for (let i = 0; i < targets.length; i++) {
      const c = cards[i], it = targets[i];
      nums.push(it.num);
      const row = entry.card(c, `${cardName(it)} · ${STAGE_NAME[stage]} · ${side === "front" ? "Front" : "Back"}`, stage);
      await saveOne(order, it, stage, side, c, row);
    }
    if (order === S.order) advance(nums);
  }

  async function saveOne(order, it, stage, side, c, row) {
    row.status("Saving…");
    try {
      const pic = resized(c.canvas, UPLOAD_LONG);
      const blob = await toBlob(pic, "image/jpeg", 0.9);
      const up = await upload(blob, `scans/${order.ref}`);
      const scan = { url: up.url, w: up.w || pic.width, h: up.h || pic.height, dpi: c.dpi, ok: !!c.ok, boxes: c.ok ? c.boxes : {}, centering: c.ok ? c.centering : null };
      const d = await api({ action: "scan", id: order.id, num: it.num, stage, side, scan });
      if (d.scans) it.scans = d.scans;
      const saved = (it.scans && it.scans[stage] && it.scans[stage][side]) || scan;
      row.done(saved, () => it.scans || {}, async (what) => {
        if (what === "undo") {
          const r = await api({ action: "removeScan", id: order.id, num: it.num, stage, side });
          it.scans = (r.order && (r.order.items || []).find((x) => String(x.num) === String(it.num)) || {}).scans || {};
          if (order === S.order) { S.num = it.num; S.side = side; S.stage = stage; }   // scan it again next
          drawPickers(); return true;
        }
        if (what === "centering") {
          const cur = it.scans[stage][side];
          await SV().openCentering(cur, `${cardName(it)} · ${STAGE_NAME[stage]} · ${side}`, async (out) => {
            const r = await api({ action: "scanCentering", id: order.id, num: it.num, stage, side, centering: out });
            const fresh = (r.order && (r.order.items || []).find((x) => String(x.num) === String(it.num)) || {}).scans;
            if (fresh) it.scans = fresh;
            row.refresh(it.scans[stage][side], it.scans);
          });
        }
      });
      drawPickers();
    } catch (e) {
      row.fail(e.message, () => saveOne(order, it, stage, side, c, row));
    }
  }

  // ---------------- results log
  function logEntry(name) {
    const box = document.createElement("div");
    box.className = "panel st-item";
    box.innerHTML = `<div class="st-item-h"><b>${esc(name)}</b><span class="muted st-s">Finding the card…</span></div><div class="st-cards"></div><div class="st-notes"></div>`;
    $("#st-log").prepend(box);
    const notes = box.querySelector(".st-notes");
    return {
      clear() { box.querySelector(".st-s").textContent = ""; },
      note(t) { const p = document.createElement("p"); p.className = "warn-t"; p.textContent = t; notes.appendChild(p); },
      fail(t) { box.querySelector(".st-s").innerHTML = `<span class="err">${esc(t)}</span>`; },
      card(c, label, stage) {
        const r = document.createElement("div"); r.className = "st-card";
        const prev = resized(toCanvas(c.canvas), 360);
        prev.className = "st-prev";
        r.innerHTML = `<div class="st-info"><b>${esc(label)}</b><div class="st-meta"></div><div class="st-acts"></div></div>`;
        r.prepend(prev);
        box.querySelector(".st-cards").appendChild(r);
        const meta = r.querySelector(".st-meta"), acts = r.querySelector(".st-acts");
        const info = (scan, all) => {
          const bits = [];
          if (!scan.ok) bits.push(`<span class="warn-t">No card edge found — saved as the whole picture (no close-ups or centering). Try a darker background.</span>`);
          if (scan.centering) {
            bits.push(`Centering L/R <b>${SV().pair(scan.centering, "lr")}</b> · T/B <b>${SV().pair(scan.centering, "tb")}</b>`);
            const st = all[stage] || {}, g = SV().grades(st.front && st.front.centering, st.back && st.back.centering);
            if (g) bits.push(`<span class="muted">Centering allows: ${esc(SV().gradesText(g))}${st.back ? "" : " (front only so far)"}</span>`);
            const s = scan.centering.summary;
            if (s && ((s.check && s.check.length) || s.all_found === false)) bits.push(`<span class="warn-t">⚠ Check the centering markers${s.check && s.check.length ? " (" + s.check.join(", ") + ")" : ""}</span>`);
          }
          meta.innerHTML = bits.map((b) => `<div>${b}</div>`).join("");
        };
        let stageRef = null;
        return {
          status(t) { meta.innerHTML = `<span class="muted">${esc(t)}</span>`; acts.innerHTML = ""; },
          fail(t, retry) {
            meta.innerHTML = `<span class="err">Not saved: ${esc(t)}</span>`;
            acts.innerHTML = `<button class="btn small">Try again</button>`;
            acts.querySelector("button").onclick = () => retry();
          },
          done(scan, allFn, act) {
            stageRef = allFn; info(scan, allFn());
            acts.innerHTML = (scan.centering ? `<button class="btn ghost small" data-a="centering">Fix centering</button>` : "") +
              `<button class="btn ghost small" data-a="undo">Undo</button>`;
            acts.querySelectorAll("button").forEach((b) => b.onclick = async () => {
              b.disabled = true;
              try {
                const r = await act(b.dataset.a);
                if (b.dataset.a === "undo" && r) { r && (meta.innerHTML = `<span class="muted">Removed.</span>`); acts.innerHTML = ""; prev.style.opacity = ".35"; }
              } catch (e) { toast(e.message); }
              b.disabled = false;
            });
          },
          refresh(scan, all) { info(scan, all); },
        };
      },
    };
  }

  // ---------------- sources
  const pickf = $("#st-pickf input");
  pickf.onchange = () => { const f = Array.from(pickf.files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); pickf.value = ""; enqueue(f, "file"); };
  const drop = $("#st-drop");
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("on"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("on")));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = Array.from(e.dataTransfer.files || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    enqueue(f, "drop");
  });

  $("#st-cam").onclick = async () => {
    if (!S.order) return toast("Pick an order first.");
    const label = () => { const it = S.items.find((x) => String(x.num) === String(S.num)); return `${it ? cardName(it) : "Card"} · ${S.side === "front" ? "front" : "back"}`; };
    try {
      await openCamera(label(), { onShot: async (file) => { S.queue.push({ file, source: "camera" }); await pump(); return label(); } });
    } catch (e) { toast(e.message); }
  };

  // Watched folder: every new picture the scanner saves there is picked up (files already in it are ignored).
  const fkey = (f) => `${f.name}|${f.size}|${f.lastModified}`;
  async function listDir(dir) {
    const out = [];
    for await (const [name, h] of dir.entries()) if (h.kind === "file" && IMG_RE.test(name)) out.push(h);
    return out;
  }
  async function startWatching(dir, fresh) {
    S.dir = dir; S.watching = true; S.pending.clear();
    if (fresh) S.seen = new Set();
    for (const h of await listDir(dir)) { try { S.seen.add(fkey(await h.getFile())); } catch { /* still being written */ } }
    clearInterval(S.timer);
    S.timer = setInterval(poll, 2000);
    folderUi();
  }
  async function poll() {
    if (!S.watching || !S.dir) return;
    try {
      for (const h of await listDir(S.dir)) {
        let f; try { f = await h.getFile(); } catch { continue; }
        const k = fkey(f);
        if (S.seen.has(k)) continue;
        // wait until the file stops growing (the scanner may still be writing it)
        const prev = S.pending.get(f.name);
        if (!prev || prev !== f.size + "|" + f.lastModified) { S.pending.set(f.name, f.size + "|" + f.lastModified); continue; }
        S.pending.delete(f.name); S.seen.add(k);
        enqueue([f], "folder");
      }
    } catch (e) {
      S.watching = false; clearInterval(S.timer);
      folderUi(`Lost access to the folder (${e.message}). Click Watch scan folder again.`);
    }
  }
  function folderUi(msg) {
    const p = $("#st-folder"), b = $("#st-watch");
    if (!p) return;
    if (msg) { p.innerHTML = `<span class="err">${esc(msg)}</span>`; if (b) b.textContent = "Watch scan folder"; return; }
    if (S.watching) {
      p.innerHTML = `👀 Watching <b>${esc(S.dir.name)}</b> — new scans saved there are added to the card above. Keep this page open.`;
      if (b) b.textContent = "Stop watching";
    } else { p.textContent = ""; if (b) b.textContent = "Watch scan folder"; }
  }
  if (canDir()) {
    $("#st-watch").onclick = async () => {
      if (S.watching) { S.watching = false; clearInterval(S.timer); folderUi(); return; }
      try {
        const saved = await kv("dir");
        if (saved && saved.queryPermission && (await saved.requestPermission({ mode: "read" })) === "granted" &&
            confirm(`Watch “${saved.name}” again?\n\nOK = yes · Cancel = choose a different folder`)) return startWatching(saved, false);
        const dir = await window.showDirectoryPicker({ id: "scan-station", mode: "read" });
        await kv("dir", dir);
        await startWatching(dir, true);
      } catch (e) { if (e.name !== "AbortError") toast("Couldn’t open that folder: " + e.message, 6000); }
    };
  }

  // ---------------- start
  drawPickers();
  const ready = loadOrders();
  async function apply(p) {
    p = p || {};
    await ready;
    if (p.stage && STAGE_NAME[p.stage]) S.stage = p.stage;
    if (p.side === "front" || p.side === "back") S.side = p.side;
    if (p.id && (!S.order || S.order.id !== p.id)) { S.side = p.side || "front"; await loadOrder(p.id, p.num).catch((e) => toast(e.message)); }
    else if (p.num != null && S.order) { S.num = p.num; S.side = p.side || "front"; }
    drawPickers();
  }
  return { el, apply, reload: () => (S.order ? loadOrder(S.order.id, S.num) : loadOrders()) };
}
