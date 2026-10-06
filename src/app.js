import { fetchCommits, parseRepo } from "./github.js";
import { parseGitLog, roastRepo } from "./roast.js";
import { DEMO } from "./demo.js";
import { startEmbers } from "./embers.js";

const $ = (sel, root = document) => root.querySelector(sel);
const form = $("#roast-form");
const repoInput = $("#repo");
const logInput = $("#log");
const errorBox = $("#error");
const loading = $("#loading");
const results = $("#results");

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

startEmbers($("#embers"));

// ---------------------------------------------------------------------------
// Input modes and shortcuts
// ---------------------------------------------------------------------------

let mode = "repo";
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    $(".mode-repo").hidden = mode !== "repo";
    $(".mode-paste").hidden = mode !== "paste";
    (mode === "repo" ? repoInput : logInput).focus();
  });
});

document.querySelectorAll(".chip[data-repo]").forEach((chip) => {
  chip.addEventListener("click", () => {
    repoInput.value = chip.dataset.repo;
    form.requestSubmit();
  });
});
$("#demo-btn").addEventListener("click", () => roast({ source: "demo" }));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (mode === "paste") roast({ source: "paste" });
  else roast({ source: "repo" });
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

// ---------------------------------------------------------------------------
// Loading sequence
// ---------------------------------------------------------------------------

const LOADING_LINES = [
  "Reading your commits…",
  "Judging silently…",
  "Counting every \"fix\"…",
  "Checking what you did at 3 AM…",
  "Consulting a senior developer…",
  "Sharpening the jokes…",
];

async function playLoading(work) {
  $("#hero").hidden = true;
  results.hidden = true;
  loading.hidden = false;
  const bar = $(".loading-bar span", loading);
  bar.style.animation = "none";
  void bar.offsetWidth;
  bar.style.animation = "";
  window.scrollTo({ top: 0 });
  let i = 0;
  const line = $("#loading-line");
  line.textContent = LOADING_LINES[0];
  const timer = setInterval(() => (line.textContent = LOADING_LINES[++i % LOADING_LINES.length]), 420);
  try {
    // Keep the suspense for a moment even when the data arrives instantly.
    const [value] = await Promise.all([work, sleep(reducedMotion() ? 0 : 2300)]);
    return value;
  } finally {
    clearInterval(timer);
    loading.hidden = true;
  }
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

let current = null;

async function getData(source) {
  if (source === "demo") return DEMO;
  if (source === "paste") {
    const commits = parseGitLog(logInput.value);
    if (!commits.length) throw new Error("Paste the output of git log first.");
    return { info: { name: "your pasted log", url: null }, commits };
  }
  const target = parseRepo(repoInput.value);
  if (!target) throw new Error("Enter a repo like owner/repo or paste a GitHub link.");
  return fetchCommits(target, $("#token").value.trim() || undefined);
}

async function roast({ source }) {
  showError("");
  if (source === "repo" && !parseRepo(repoInput.value)) {
    showError("Enter a repo like owner/repo or paste a GitHub link.");
    repoInput.focus();
    return;
  }
  if (source === "paste" && !logInput.value.trim()) {
    showError("Paste the output of git log first.");
    logInput.focus();
    return;
  }
  try {
    const data = await playLoading(getData(source));
    const r = roastRepo(data.commits);
    if (!r) throw new Error("Couldn't find any commit messages to roast (merge commits don't count).");
    current = { ...r, info: data.info, source };
    render(current);
    if (source === "repo") history.replaceState(null, "", `?repo=${encodeURIComponent(data.info.name)}`);
    else history.replaceState(null, "", location.pathname);
  } catch (err) {
    $("#hero").hidden = false;
    showError(err.message || "Something went wrong.");
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const CRIMES = {
  lazy: "Lazy one-worders",
  short: "Too short to mean anything",
  smash: "Keyboard smashes",
  final: "\"Final\" (it wasn't)",
  desperate: "Cries for help",
  shouting: "SHOUTING",
  vague: "Vague \"stuff\" and \"things\"",
  long: "Novels in the subject line",
};

function statCards(s) {
  const cards = [
    [s.commits, "commits roasted"],
    [`${s.oneWordPct}%`, "one-word commits"],
    s.favWord ? [`"${s.favWord}"`, `favourite word · used ${s.favCount}×`, "word"] : null,
    s.lateNight !== null ? [s.lateNight, "commits between midnight and 5 AM"] : [s.avgLength, "characters per message on average"],
    s.weekendPct !== null ? [`${s.weekendPct}%`, "committed on weekends"] : [`${s.conventionalPct}%`, "use conventional commits"],
    [`${s.goodPct}%`, "actually good commits"],
  ].filter(Boolean);
  return cards
    .map(([value, label, cls], i) => {
      const num = typeof value === "number" ? value : Number(String(value).replace("%", ""));
      const counted = Number.isFinite(num) && !cls ? ` data-count="${num}" data-suffix="${String(value).endsWith("%") ? "%" : ""}"` : "";
      return `<div class="stat" style="--i:${i}"><b class="${cls || ""}"${counted}>${esc(value)}</b><span>${esc(label)}</span></div>`;
    })
    .join("");
}

function render(r) {
  const repoLabel = r.info.url ? `<a href="${esc(r.info.url)}" target="_blank" rel="noopener">${esc(r.info.name)}</a>` : esc(r.info.name);
  const maxCrime = Math.max(1, ...Object.values(r.issueCounts));
  const crimes = Object.entries(r.issueCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n], i) => `<div class="crime" style="--i:${i}"><span>${esc(CRIMES[k])}</span><div class="crime-bar"><span style="--w:${(n / maxCrime) * 100}%"></span></div><b>${n}</b></div>`)
    .join("");

  const offenses = r.shame
    .map(
      (o, i) => `
      <div class="offense" style="--i:${i}">
        <div class="cmd"><span class="ps">$</span> git commit -m <span class="msg">"${esc(o.message)}"</span><span class="pts">${o.score}/100</span></div>
        <p class="burn">${esc(o.roast)}</p>
      </div>`
    )
    .join("");

  const worst = r.shame[0];
  const shareLines = r.headlines.length ? r.headlines.slice(0, 2) : [r.tier.blurb];
  const shareStats = [
    [r.stats.commits, "commits"],
    [`${r.stats.oneWordPct}%`, "one-word"],
    r.stats.lateNight !== null ? [r.stats.lateNight, "after midnight"] : [`${r.stats.goodPct}%`, "good"],
  ];

  results.innerHTML = `
    <div class="card verdict reveal">
      <div class="gauge" data-score="${r.score}">
        <svg viewBox="0 0 220 125" aria-hidden="true">
          <defs><linearGradient id="gaugeGrad" x1="0" x2="1"><stop offset="0" stop-color="#ff3d1f"/><stop offset=".55" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ffc53d"/></linearGradient></defs>
          <path class="track" d="M 10 112 A 100 100 0 0 1 210 112" fill="none" stroke-width="16" stroke-linecap="round"/>
          <path class="value" d="M 10 112 A 100 100 0 0 1 210 112" fill="none" stroke-width="16" stroke-linecap="round"/>
        </svg>
        <div class="gauge-num"><span data-count="${r.score}">${reducedMotion() ? r.score : 0}</span><small>/100</small></div>
      </div>
      <div class="verdict-text">
        <p class="verdict-kicker">Roast of ${repoLabel} · ${r.stats.commits} commits</p>
        <h2 class="tier"><span class="tier-emoji">${r.tier.emoji}</span>${esc(r.tier.title)}</h2>
        <p class="tier-blurb">${esc(r.tier.blurb)}</p>
      </div>
    </div>

    <section class="card reveal" id="the-roast">
      <div class="section-head"><h2>The roast</h2><p>Brace yourself</p></div>
      <div class="headlines">${r.headlines.map((h) => `<div class="headline"><span class="bullet">🔥</span><span class="text" data-text="${esc(h)}"></span></div>`).join("")}</div>
    </section>

    <section class="card reveal">
      <div class="section-head"><h2>By the numbers</h2><p>The evidence</p></div>
      <div class="stats">${statCards(r.stats)}</div>
    </section>

    ${
      r.shame.length
        ? `<section class="card reveal">
      <div class="section-head"><h2>Hall of Shame</h2><p>Your 5 worst commit messages</p></div>
      <div class="terminal"><div class="term-bar"><i></i><i></i><i></i><span>~/${esc(r.info.name.split("/").pop() || "repo")} — git log --worst</span></div><div class="term-body">${offenses}</div></div>
    </section>

    <section class="card reveal">
      <div class="section-head"><h2>Crime breakdown</h2><p>What went wrong, by count</p></div>
      <div class="crimes">${crimes}</div>
    </section>`
        : ""
    }

    ${
      r.fame.length
        ? `<section class="card reveal">
      <div class="section-head"><h2>Hall of Fame 👏</h2><p>Okay, these were actually good</p></div>
      <div class="fame">${r.fame.map((f, i) => `<div class="fame-item" style="--i:${i}">${esc(f.message)}</div>`).join("")}</div>
    </section>`
        : ""
    }

    <section class="card reveal">
      <div class="section-head"><h2>How to fix it</h2><p>Write commits your future self will thank you for</p></div>
      <div class="tips">${r.tips
        .map(
          (t, i) => `<div class="tip" style="--i:${i}"><h3>${esc(t.title)}</h3><p>${esc(t.body)}</p><div class="diff"><div class="minus">- ${esc(t.bad)}</div><div class="plus">+ ${esc(t.good)}</div></div></div>`
        )
        .join("")}</div>
    </section>

    <section class="card share reveal">
      <div class="share-card" id="share-card">
        <div class="sc-glow"></div>
        <div class="sc-top"><span>🔥 COMMIT ROASTER</span><span>${esc(r.info.name)}</span></div>
        <div class="sc-score">${r.score}<small>/100</small></div>
        <div class="sc-tier">${r.tier.emoji} ${esc(r.tier.title)}</div>
        ${shareLines.map((l) => `<div class="sc-line">${esc(l)}</div>`).join("")}
        <div class="sc-stats">${shareStats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
        ${worst ? `<div class="sc-worst"><span>worst commit:</span> "${esc(worst.message)}"</div>` : `<div class="sc-worst">No bad commits found. Impressive.</div>`}
        <div class="sc-foot">${esc((location.host || "commit-roaster") + location.pathname.replace(/index\.html$/, ""))}</div>
      </div>
      <div class="share-actions">
        <div class="section-head"><h2>Share your roast</h2></div>
        <p>Download the card, post it, and challenge your friends to beat your score.</p>
        <button type="button" class="fire-btn" id="download">Download roast card</button>
        <button type="button" class="ghost-btn" id="copy">Copy roast text</button>
        <button type="button" class="ghost-btn" id="linkedin">Share on LinkedIn</button>
        <button type="button" class="ghost-btn" id="again">Roast another repo ↑</button>
      </div>
    </section>
  `;

  results.hidden = false;
  fitShareCard();
  wireResults(r);
  animateIn();
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

function countUp(el) {
  const to = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  if (reducedMotion() || !to) {
    el.textContent = to + suffix;
    return;
  }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / 1300);
    el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3))) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function typeHeadlines(section) {
  const items = [...section.querySelectorAll(".headline .text")];
  for (const el of items) {
    const text = el.dataset.text;
    if (reducedMotion()) {
      el.textContent = text;
      continue;
    }
    el.classList.add("caret");
    for (let i = 1; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await sleep(text[i - 1] === " " ? 8 : 18);
    }
    el.classList.remove("caret");
    await sleep(250);
  }
}

function reveal(el) {
  el.classList.add("in");
  el.querySelectorAll("[data-count]").forEach(countUp);
  const gauge = el.querySelector(".gauge");
  if (gauge) gauge.querySelector(".value").style.strokeDashoffset = 314 - (314 * Number(gauge.dataset.score)) / 100;
  if (el.id === "the-roast") typeHeadlines(el);
}

function animateIn() {
  const targets = results.querySelectorAll(".reveal");
  if (reducedMotion() || !("IntersectionObserver" in window)) {
    targets.forEach(reveal);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        reveal(e.target);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.15 }
  );
  targets.forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

// The card is a fixed 360px wide so every download is the same size;
// on narrow screens it's zoomed down to fit.
function fitShareCard() {
  const card = $("#share-card");
  if (!card) return;
  const available = card.parentElement.clientWidth;
  card.style.zoom = available && available < 360 ? available / 360 : 1;
}
window.addEventListener("resize", fitShareCard);

let html2canvasLoading = null;
function loadHtml2Canvas() {
  html2canvasLoading ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => {
      html2canvasLoading = null;
      reject(new Error("load failed"));
    };
    document.head.appendChild(s);
  });
  return html2canvasLoading;
}

function toast(message) {
  let el = $(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2000);
}

function siteUrl(r) {
  const base = location.origin + location.pathname;
  return r.source === "repo" ? `${base}?repo=${encodeURIComponent(r.info.name)}` : base;
}

function roastText(r) {
  const lines = [`🔥 My commits got roasted: ${r.score}/100, "${r.tier.title}" ${r.tier.emoji}`, ""];
  for (const h of r.headlines) lines.push(`• ${h}`);
  if (r.shame[0]) lines.push("", `Worst commit: "${r.shame[0].message}"`, r.shame[0].roast);
  lines.push("", `Roast yours: ${siteUrl(r)}`);
  return lines.join("\n");
}

function wireResults(r) {
  $("#download").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const card = $("#share-card");
    btn.disabled = true;
    const zoom = card.style.zoom;
    card.style.zoom = 1;
    try {
      const html2canvas = await loadHtml2Canvas();
      // 360x450 at 3x = 1080x1350, LinkedIn's recommended portrait size.
      const canvas = await html2canvas(card, { scale: 3, backgroundColor: null });
      const a = document.createElement("a");
      a.download = `commit-roast-${r.info.name.replace(/[^\w-]+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      toast("Roast card downloaded 🔥");
    } catch {
      toast("Couldn't create the image. Try a screenshot instead.");
    } finally {
      card.style.zoom = zoom;
      btn.disabled = false;
    }
  });
  $("#copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(roastText(r));
      toast("Roast copied ✓");
    } catch {
      toast("Couldn't copy. Select the text manually.");
    }
  });
  $("#linkedin").addEventListener("click", () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl(r))}`, "_blank", "noopener");
  });
  $("#again").addEventListener("click", () => {
    results.hidden = true;
    $("#hero").hidden = false;
    history.replaceState(null, "", location.pathname);
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    (mode === "repo" ? repoInput : logInput).focus({ preventScroll: true });
  });
}

// Shared links: ?repo=owner/repo roasts that repo straight away.
const shared = new URLSearchParams(location.search).get("repo");
if (shared && parseRepo(shared)) {
  repoInput.value = shared;
  roast({ source: "repo" });
}
