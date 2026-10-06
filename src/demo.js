// A fictional, gloriously messy commit history for the "Try a demo" button.
// Dates are local time so the late-night stats show up for every visitor.

const at = (day, hour, minute = 12) => new Date(2026, 8, day, hour, minute).toISOString();

const MESSAGES = [
  ["Initial commit", 1, 14],
  ["add navbar", 1, 15],
  ["fix", 2, 23],
  ["fix", 3, 1],
  ["asdf", 3, 2],
  ["Add login page with email and password fields", 3, 16],
  ["update", 4, 0],
  ["fix", 4, 0],
  ["FIXED THE STUPID BUG", 4, 2],
  ["final", 5, 18],
  ["final final", 5, 19],
  ["final final v2", 5, 23],
  ["pls work", 6, 3],
  ["why is this not working", 6, 3],
  ["changes", 6, 11],
  ["fix", 7, 14],
  ["update stuff", 7, 15],
  ["wip", 8, 22],
  ["wip", 8, 23],
  [".", 9, 2],
  ["feat: add dark mode toggle to settings page", 9, 15],
  ["fix", 10, 1],
  ["ok now it works", 10, 1],
  ["minor changes", 11, 17],
  ["fix: prevent crash when cart is empty", 12, 10],
  ["qwerty", 12, 4],
  ["some things", 13, 20],
  ["fix", 13, 21],
  ["update", 14, 3],
  ["THIS TIME IT WILL WORK", 14, 3],
  ["css", 15, 19],
  ["Refactor checkout flow into smaller components", 16, 11],
  ["fix", 17, 2],
  ["hopefully the last fix", 17, 2],
  ["updated the readme file and also fixed the footer alignment on mobile and changed colors", 18, 13],
  ["test", 19, 22],
  ["final version for real", 20, 18],
  ["fix", 20, 19],
  ["ugh", 21, 4],
  ["Merge branch 'main' of github.com:demo/disaster-app", 21, 5],
  ["fix", 22, 0],
];

export const DEMO = {
  info: { name: "demo/disaster-app", url: null, stars: 3 },
  commits: MESSAGES.map(([message, day, hour]) => ({ message, date: at(day, hour) })).reverse(),
};
