import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCommit, fill, parseGitLog, roastRepo } from "../src/roast.js";
import { parseRepo } from "../src/github.js";
import { DEMO } from "../src/demo.js";

const issues = (m) => checkCommit(m).issues;

test("detects lazy, smash, short, final, shouting, desperate, vague and long messages", () => {
  assert.deepEqual(issues("fix"), ["lazy"]);
  assert.deepEqual(issues("Update"), ["lazy"]);
  assert.deepEqual(issues("wip"), ["lazy"]);
  assert.deepEqual(issues("asdf"), ["smash"]);
  assert.deepEqual(issues("."), ["smash"]);
  assert.deepEqual(issues("sdfgh"), ["smash"]);
  assert.deepEqual(issues("css"), ["short"]);
  assert.deepEqual(issues("final final v2"), ["final"]);
  assert.deepEqual(issues("FIXED THE LOGIN BUG"), ["shouting"]);
  assert.deepEqual(issues("pls work now"), ["desperate"]);
  assert.deepEqual(issues("update stuff"), ["vague", "short"]);
  assert.ok(issues("x".repeat(30) + " " + "y".repeat(50)).includes("long"));
});

test("good messages score high and get no issues", () => {
  for (const m of ["Add login page with email and password fields", "feat: add dark mode toggle", "fix(cart): prevent crash when empty", "Refactor checkout flow into components"]) {
    const c = checkCommit(m);
    assert.deepEqual(c.issues, [], m);
    assert.equal(c.good, true, m);
    assert.equal(c.score, 100, m);
  }
  assert.equal(checkCommit("Fixed the footer on mobile").score, 90);
  assert.deepEqual(issues("Initial commit"), []);
});

test("conventional prefix does not hide a lazy description", () => {
  assert.deepEqual(issues("fix: fix"), ["lazy"]);
  assert.deepEqual(issues("chore: update"), ["lazy"]);
});

test("words that merely contain lazy words are not flagged", () => {
  assert.deepEqual(issues("Fix flaky test in payment service"), []);
  assert.deepEqual(issues("Final exam timetable page"), ["final"]);
  assert.deepEqual(issues("Update dependencies to latest versions"), []);
});

test("fill replaces template variables", () => {
  assert.equal(fill("{a} and {b}", { a: 1, b: "two" }), "1 and two");
  assert.equal(fill("{missing}", {}), "{missing}");
});

test("demo repo gets roasted hard", () => {
  const r = roastRepo(DEMO.commits);
  assert.ok(r.score < 40, `score ${r.score}`);
  assert.equal(r.stats.merges, 1);
  assert.equal(r.stats.commits, DEMO.commits.length - 1);
  assert.equal(r.stats.favWord, "fix");
  assert.ok(r.headlines[0].startsWith('You wrote "fix"'));
  assert.ok(r.stats.lateNight >= 10);
  assert.equal(r.shame.length, 5);
  assert.equal(new Set(r.shame.map((s) => s.message.toLowerCase())).size, 5, "hall of shame has no duplicates");
  assert.ok(r.fame.length >= 2);
  assert.ok(r.tips.length >= 3);
  assert.ok(r.shame.every((s) => s.roast.includes(s.message.slice(0, 10))));
});

test("hall of shame shows variety and never repeats a joke", () => {
  const r = roastRepo(DEMO.commits);
  assert.equal(new Set(r.shame.map((s) => s.issues[0])).size, 5, "one of each kind first");
  assert.ok(r.shame.some((s) => s.message === "fix"), "the classic 'fix' makes the list");
  const templates = r.shame.map((s) => s.roast.replace(/"[^"]*"/, ""));
  assert.equal(new Set(templates).size, templates.length);
});

test("roasts are deterministic", () => {
  assert.deepEqual(roastRepo(DEMO.commits).shame, roastRepo(DEMO.commits).shame);
});

test("a clean repo gets a high score and the 'great' headline", () => {
  const commits = ["feat: add search bar", "fix: handle empty search results", "docs: explain local setup", "Refactor search service into hooks"].map((message) => ({ message }));
  const r = roastRepo(commits);
  assert.equal(r.score, 100);
  assert.equal(r.tier.title, "Commit Poet");
  assert.deepEqual(r.shame, []);
  assert.equal(r.headlines.length, 1);
  assert.ok(r.headlines[0].startsWith("Honestly?"));
  assert.equal(r.stats.lateNight, null, "no dates means no time stats");
});

test("empty input returns null", () => {
  assert.equal(roastRepo([]), null);
  assert.equal(roastRepo([{ message: "Merge pull request #1 from x/y" }]), null);
});

test("parseRepo accepts common formats", () => {
  const want = { owner: "mudit2308", repo: "jd-decoder" };
  for (const s of ["mudit2308/jd-decoder", "https://github.com/mudit2308/jd-decoder", "github.com/mudit2308/jd-decoder/", "https://github.com/mudit2308/jd-decoder.git", "https://github.com/mudit2308/jd-decoder/tree/main/src", "git@github.com:mudit2308/jd-decoder.git"]) {
    assert.deepEqual(parseRepo(s), want, s);
  }
  assert.equal(parseRepo("not a repo"), null);
  assert.equal(parseRepo(""), null);
});

test("parseGitLog reads --oneline, plain lines and full git log", () => {
  assert.deepEqual(parseGitLog("a1b2c3d (HEAD -> main) fix\n9f8e7d6 add login\n\n"), [
    { message: "fix", date: null },
    { message: "add login", date: null },
  ]);
  const full = `commit 1234567890abcdef1234567890abcdef12345678
Author: Dev <dev@example.com>
Date:   Tue Sep 1 23:15:00 2026 +0530

    pls work

commit abcdefabcdefabcdefabcdefabcdefabcdefabcd
Author: Dev <dev@example.com>
Date:   Mon Aug 31 10:00:00 2026 +0530

    Add signup form
`;
  const parsed = parseGitLog(full);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].message, "pls work");
  assert.ok(parsed[0].date.startsWith("2026-09-01T17:45"));
});
