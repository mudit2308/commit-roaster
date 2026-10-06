// The roast engine: scores commit messages, finds the worst offenders and
// writes the roast. Pure functions only, so it's all unit-tested in Node.

import { HEADLINES, ROASTS, TIERS, TIPS } from "./lines.js";

// ---------------------------------------------------------------------------
// Per-commit checks
// ---------------------------------------------------------------------------

const LAZY = new Set([
  "fix", "fixes", "fixed", "fixing", "bugfix", "bug fix", "fix bug", "fix bugs", "fixed bug", "fixed bugs", "small fix", "minor fix", "quick fix",
  "update", "updates", "updated", "update code", "update files", "updated files", "updated code", "minor update", "small update",
  "change", "changes", "changed", "minor changes", "small changes", "some changes", "more changes", "few changes",
  "wip", "work in progress", "test", "tests", "testing", "minor", "tweak", "tweaks", "misc", "commit", "ok", "done", "more", "edit", "edits",
  "save", "saved", "temp", "tmp", "cleanup", "clean up", "refactor", "refactoring", "code", "push", "upload", "add", "added", "new",
  "improvements", "fixes and improvements", "add files via upload", "stuff", "things", "progress", "working", "works", "updated readme",
]);

const SMASH_TOKEN = /^(asdf\w*|qwer\w*|zxcv\w*|hjkl|jkl|aa+|xx+|zz+|abc|xyz|foo|bar|baz|lol|lmao|hmm+|meh|yolo|blah|bleh)$/;
const FINAL = /\bfinal\b|\blast (one|time|commit|fix)\b|\bfor real\b|\bthis time\b/i;
const DESPERATE = /(\b(please|pls|plz|why|hopefully|ugh+|wtf|omg|damn|idk|help|i give up|kill me|whatever|no idea|maybe this|try again|trying again|attempt \d+)\b|\bwork(s|ing)? now\b|\?{2,}|!{2,})/i;
const VAGUE = /\b(stuff|things|various|misc|several|etc)\b/i;
const CONVENTIONAL = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]*\))?!?:\s*(.+)$/i;
const IMPERATIVE = /^(add|fix|update|remove|delete|refactor|improve|implement|create|support|use|make|rename|move|bump|handle|prevent|allow|replace|extract|simplify|split|merge|show|hide|enable|disable|introduce|document|clean|set|reduce|increase|optimize|validate|upgrade|downgrade|revert|drop|convert|change|ensure|avoid|return|load|render|cache|log|test)\b/i;
const MERGE = /^merge (pull request|branch|remote-tracking|tag)\b/i;
const INITIAL = /^(initial commit|first commit|init|initial import|initial setup)\.?$/i;

/** Order in which a commit's issues are roasted (most roastable first). */
export const ISSUE_ORDER = ["smash", "lazy", "final", "desperate", "shouting", "vague", "short", "long"];
const PENALTY = { smash: 85, lazy: 75, final: 50, desperate: 40, shouting: 35, vague: 35, short: 45, long: 15 };

export const subjectOf = (message) => String(message || "").split("\n")[0].trim();

function isSmash(lower) {
  if (/^[\W_\d]+$/.test(lower)) return true; // only punctuation or numbers: ".", "...", "123"
  const tokens = lower.split(/\s+/).filter(Boolean);
  if (tokens.length > 3) return false;
  return tokens.every((t) => SMASH_TOKEN.test(t) || (t.length >= 4 && !/[aeiouy]/.test(t)) || /(.)\1{3,}/.test(t));
}

/** Analyze one commit message: its issues, whether it's good, and a 0–100 score. */
export function checkCommit(message) {
  const subject = subjectOf(message);
  const conv = subject.match(CONVENTIONAL);
  const desc = (conv ? conv[3] : subject).trim();
  const lower = desc.toLowerCase().replace(/[.!]+$/, "").trim();
  const words = desc.split(/\s+/).filter(Boolean);
  const issues = [];

  if (INITIAL.test(subject)) return { subject, issues, good: false, conventional: false, score: 85 };

  if (!lower || isSmash(lower)) issues.push("smash");
  else if (LAZY.has(lower)) issues.push("lazy");
  if (FINAL.test(desc)) issues.push("final");
  if (DESPERATE.test(desc)) issues.push("desperate");
  const letters = desc.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 6 && letters.replace(/[^A-Z]/g, "").length / letters.length >= 0.8) issues.push("shouting");
  if (VAGUE.test(desc) && !issues.includes("lazy")) issues.push("vague");
  if (words.length <= 2 && !issues.includes("lazy") && !issues.includes("smash")) issues.push("short");
  if (subject.length > 72) issues.push("long");

  const good = issues.length === 0 && ((conv && words.length >= 3) || (IMPERATIVE.test(desc) && words.length >= 4));
  let score;
  if (issues.length) score = Math.max(0, 100 - issues.reduce((sum, i) => sum + PENALTY[i], 0));
  else score = good ? 100 : words.length >= 4 ? 90 : 80;

  issues.sort((a, b) => ISSUE_ORDER.indexOf(a) - ISSUE_ORDER.indexOf(b));
  return { subject, issues, good, conventional: Boolean(conv), score };
}

// ---------------------------------------------------------------------------
// Picking roast lines (deterministic, so the same repo gets the same roast)
// ---------------------------------------------------------------------------

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const clip = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/**
 * Pick a roast line for a commit. Pass the same `used` map for one repo so no
 * line is repeated within a single roast.
 */
export function roastFor(check, used = new Map()) {
  const issue = check.issues[0];
  const lines = ROASTS[issue];
  const taken = used.get(issue) || new Set();
  let i = hash(check.subject) % lines.length;
  for (let k = 0; k < lines.length && taken.has(i); k++) i = (i + 1) % lines.length;
  taken.add(i);
  used.set(issue, taken);
  return fill(lines[i], { msg: clip(check.subject) });
}

// ---------------------------------------------------------------------------
// Whole-repo analysis
// ---------------------------------------------------------------------------

const STOPWORDS = new Set("a an the to and or of in on for with from is it at by as be this that into when not no my i we you our your are was were".split(" "));

export function roastRepo(commits) {
  const all = commits.filter((c) => c && subjectOf(c.message));
  const merges = all.filter((c) => MERGE.test(subjectOf(c.message))).length;
  const list = all.filter((c) => !MERGE.test(subjectOf(c.message))).map((c) => ({ ...c, check: checkCommit(c.message) }));
  const n = list.length;
  if (!n) return null;

  // Issue counts
  const issueCounts = Object.fromEntries(ISSUE_ORDER.map((i) => [i, 0]));
  for (const c of list) for (const i of c.check.issues) issueCounts[i]++;

  // Words and repeats
  const wordCounts = new Map();
  const messageCounts = new Map();
  for (const c of list) {
    const subj = c.check.subject.toLowerCase();
    messageCounts.set(subj, (messageCounts.get(subj) || 0) + 1);
    for (const w of subj.replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/)) {
      if (w.length < 2 || STOPWORDS.has(w)) continue;
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    }
  }
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || [null, 0];
  const [favWord, favCount] = top(wordCounts);
  const [repeatMsg, repeatCount] = top(messageCounts);

  // Time of day (only for commits that have dates)
  const dated = list.map((c) => (c.date ? new Date(c.date) : null)).filter((d) => d && !Number.isNaN(d.getTime()));
  const lateNight = dated.filter((d) => d.getHours() < 5).length;
  const weekend = dated.filter((d) => d.getDay() === 0 || d.getDay() === 6).length;
  const friday = dated.filter((d) => d.getDay() === 5 && d.getHours() >= 17).length;

  const oneWord = list.filter((c) => c.check.subject.split(/\s+/).filter(Boolean).length === 1).length;
  const conventional = list.filter((c) => c.check.conventional).length;
  const score = Math.round(list.reduce((s, c) => s + c.check.score, 0) / n);
  const tier = TIERS.find((t) => score >= t.min);

  const stats = {
    commits: n,
    merges,
    oneWordPct: Math.round((oneWord / n) * 100),
    favWord,
    favCount,
    avgLength: Math.round(list.reduce((s, c) => s + c.check.subject.length, 0) / n),
    lateNight: dated.length ? lateNight : null,
    weekendPct: dated.length ? Math.round((weekend / dated.length) * 100) : null,
    friday: dated.length ? friday : null,
    conventionalPct: Math.round((conventional / n) * 100),
    goodPct: Math.round((list.filter((c) => c.check.good).length / n) * 100),
  };

  // Headline roasts, most damning first
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const headlines = [];
  const add = (key, vars) => headlines.push(fill(HEADLINES[key], vars));
  if (favWord && LAZY.has(favWord) && favCount >= 3) add("topWord", { word: favWord, word_cap: cap(favWord), n: favCount });
  if (repeatCount >= 3 && repeatMsg !== favWord) add("duplicate", { word: clip(repeatMsg, 40), n: repeatCount });
  if (stats.oneWordPct >= 20) add("oneWord", { n: stats.oneWordPct });
  if (lateNight >= 3) add("lateNight", { n: lateNight });
  if (issueCounts.smash >= 2) add("smash", { n: issueCounts.smash });
  if (issueCounts.final >= 2) add("final", { n: issueCounts.final });
  if (issueCounts.shouting >= 2) add("shouting", { n: issueCounts.shouting });
  if (issueCounts.desperate >= 2) add("desperate", { n: issueCounts.desperate });
  if (stats.weekendPct !== null && stats.weekendPct >= 30 && dated.length >= 10) add("weekend", { n: stats.weekendPct });
  if (friday >= 3) add("friday", { n: friday });
  if (!headlines.length && score >= 75) add("great", {});

  // Hall of shame / fame (unique messages)
  const unique = (arr) => {
    const seen = new Set();
    return arr.filter((c) => !seen.has(c.check.subject.toLowerCase()) && seen.add(c.check.subject.toLowerCase()));
  };
  // Worst first, but show one of each kind of mistake before repeating a kind.
  const worst = unique(list.filter((c) => c.check.issues.length).sort((a, b) => a.check.score - b.check.score || a.check.subject.length - b.check.subject.length));
  const picked = [];
  const kinds = new Set();
  for (const c of worst) if (picked.length < 5 && !kinds.has(c.check.issues[0]) && kinds.add(c.check.issues[0])) picked.push(c);
  for (const c of worst) if (picked.length < 5 && !picked.includes(c)) picked.push(c);
  picked.sort((a, b) => a.check.score - b.check.score);
  const used = new Map();
  const shame = picked.map((c) => ({ message: c.check.subject, score: c.check.score, issues: c.check.issues, roast: roastFor(c.check, used), date: c.date || null }));
  const fame = unique(list.filter((c) => c.check.good).sort((a, b) => b.check.subject.length - a.check.subject.length))
    .slice(0, 3)
    .map((c) => ({ message: c.check.subject }));

  // Tips for the most common problems
  const tips = ISSUE_ORDER.filter((i) => issueCounts[i] > 0)
    .sort((a, b) => issueCounts[b] - issueCounts[a])
    .slice(0, 3)
    .map((i) => ({ issue: i, count: issueCounts[i], ...TIPS[i] }));
  if (stats.conventionalPct < 30) tips.push({ issue: "convention", count: null, ...TIPS.convention });

  return { score, tier, stats, issueCounts, headlines: headlines.slice(0, 4), shame, fame, tips };
}

// ---------------------------------------------------------------------------
// Parsing pasted `git log` output (for private repos)
// ---------------------------------------------------------------------------

export function parseGitLog(text) {
  const src = String(text || "").replace(/\r\n?/g, "\n");
  // Full `git log` format: "commit <sha>", "Date: ...", blank line, indented message.
  if (/^commit [0-9a-f]{7,40}/m.test(src)) {
    return src
      .split(/^commit [0-9a-f]{7,40}.*$/m)
      .map((block) => {
        const date = (block.match(/^Date:\s+(.+)$/m) || [])[1];
        const message = (block.match(/^\s{4}(\S.*)$/m) || [])[1];
        return message ? { message: message.trim(), date: date ? new Date(date).toISOString() : null } : null;
      })
      .filter(Boolean);
  }
  // `git log --oneline` (optionally with decorations) or one message per line.
  return src
    .split("\n")
    .map((l) => l.trim().replace(/^[0-9a-f]{7,40}\s+/, "").replace(/^\([^)]*\)\s+/, ""))
    .filter(Boolean)
    .map((message) => ({ message, date: null }));
}
