// Roast lines. Templates can use {msg} (the commit message), {n} (a count)
// and {word} (a word). Jokes target the commit messages, never the person.

export const ROASTS = {
  lazy: [
    "\"{msg}\". A whole story, told in one word. Hemingway is shaking.",
    "\"{msg}\" what, exactly? Future you is going to have questions.",
    "Ah yes, \"{msg}\". The commit message equivalent of a shrug.",
    "\"{msg}\" tells me everything except what you actually did.",
    "Somewhere a code reviewer read \"{msg}\" and quietly closed their laptop.",
    "\"{msg}\". Bold strategy: let git blame do the explaining.",
  ],
  smash: [
    "\"{msg}\". Did your cat write this one?",
    "\"{msg}\" isn't a commit message, it's a keyboard warm-up.",
    "Breaking news: local developer commits \"{msg}\", linguists baffled.",
    "\"{msg}\". I've seen better messages in a CAPTCHA.",
    "Your keyboard called. It wants an apology for \"{msg}\".",
  ],
  short: [
    "\"{msg}\". Short, mysterious, and completely unhelpful.",
    "\"{msg}\": a commit message with the detail of a fortune cookie.",
    "Two words? \"{msg}\" is a tweet, not a changelog.",
    "\"{msg}\". Even your variable names are more descriptive.",
    "\"{msg}\" leaves so much to the imagination.",
  ],
  final: [
    "\"{msg}\". Narrator: it was not the final version.",
    "\"{msg}\". Spoiler: there were more commits after this one.",
    "\"{msg}\". See you at final_final_v3_REAL.",
    "\"{msg}\": confidence level 100, accuracy level 0.",
  ],
  shouting: [
    "\"{msg}\". WHY ARE WE SHOUTING?",
    "\"{msg}\". Caps lock is not a personality.",
    "\"{msg}\". The commit history can hear you, no need to yell.",
    "\"{msg}\". Calm down, it's just a commit.",
  ],
  desperate: [
    "\"{msg}\". This commit message is a cry for help.",
    "\"{msg}\". You can feel the 2 AM energy through the screen.",
    "\"{msg}\". Git is not your therapist (but it is listening).",
    "\"{msg}\". Bargaining with the compiler, I see.",
    "\"{msg}\". The five stages of debugging, all in one commit.",
  ],
  long: [
    "\"{msg}\". This isn't a commit message, it's a short novel.",
    "This subject line has a plot, a twist and a sequel. Keep it under 72 characters.",
    "\"{msg}\"... and then what happened? Put the details in the body.",
  ],
  vague: [
    "\"{msg}\". \"Stuff\" and \"things\" are not technical terms.",
    "\"{msg}\". Wonderfully vague. A horoscope would be more specific.",
    "\"{msg}\". Which things? All the things?",
  ],
};

/** Big headline roasts based on the whole repo. */
export const HEADLINES = {
  topWord: "You wrote \"{word}\" {n} times. {word_cap} what? Even git doesn't know.",
  oneWord: "{n}% of your commits are a single word. Minimalism, but make it painful.",
  lateNight: "{n} commits between midnight and 5 AM. Your code has seen things.",
  weekend: "{n}% of your commits happened on weekends. Touch grass? Never heard of it.",
  shouting: "{n} commits in ALL CAPS. The repo has hearing damage.",
  final: "\"Final\" appears in {n} commits. It was never final.",
  duplicate: "\"{word}\" was committed {n} times. Copy, paste, commit, repeat.",
  smash: "{n} commits look like keyboard smashes. Respect the keyboard.",
  desperate: "{n} commit messages sound like a cry for help. Are you okay?",
  great: "Honestly? These commits are clean. This roast is going to be short.",
  friday: "{n} commits on Friday evening. Living dangerously, aren't we?",
};

export const TIERS = [
  { min: 90, title: "Commit Poet", emoji: "🧑‍🎨", blurb: "Your commit history reads like documentation. We tried, we couldn't roast it." },
  { min: 75, title: "Clean Coder", emoji: "✨", blurb: "Mostly great messages with the occasional slip. Your reviewers like you." },
  { min: 55, title: "Mostly Harmless", emoji: "🙂", blurb: "Some solid commits, some \"fix\". A respectable mess." },
  { min: 35, title: "Chaos Committer", emoji: "🌪️", blurb: "Your history is a mystery novel and nobody knows the ending." },
  { min: 15, title: "Git Gremlin", emoji: "👹", blurb: "Commits appear at 3 AM with names like \"asdf\". Classic gremlin behaviour." },
  { min: 0, title: "Certified Disaster", emoji: "💀", blurb: "Archaeologists will study this commit history for generations." },
];

/** Practical advice, keyed by the issue it fixes. */
export const TIPS = {
  lazy: { title: "Say what changed", body: "Replace \"fix\" or \"update\" with what you fixed and where.", bad: "fix", good: "Fix crash when cart is empty" },
  smash: { title: "No keyboard smashes", body: "If you can't name the change, it might be too big. Split it into smaller commits.", bad: "asdfgh", good: "Add email validation to signup form" },
  short: { title: "Add a little context", body: "Aim for 4–10 words: an action and the thing it touched.", bad: "css", good: "Center the navbar logo on mobile" },
  final: { title: "Let git track versions", body: "Git already keeps every version. Describe the change instead of numbering it.", bad: "final final v2", good: "Tweak hero spacing after design review" },
  shouting: { title: "Use sentence case", body: "Write it like a normal sentence. Capitalize the first word, that's it.", bad: "FIXED THE BUG", good: "Fix rounding error in invoice totals" },
  desperate: { title: "Keep feelings out of history", body: "Describe the change, not how it felt. Your future teammates will thank you.", bad: "pls work now", good: "Retry API call when the token expires" },
  long: { title: "Keep the subject under 72 characters", body: "Put the short summary first, then a blank line and the details in the body.", bad: "Fixed the bug where the user could not log in because the session cookie...", good: "Fix login failing after session cookie expires" },
  vague: { title: "Be specific", body: "Name the files, features or bugs instead of \"stuff\" and \"things\".", bad: "update stuff", good: "Update pricing table with new plans" },
  convention: { title: "Try Conventional Commits", body: "Prefix with a type like feat, fix, docs or refactor. Easy to scan, and tools can build changelogs from it.", bad: "added dark mode", good: "feat: add dark mode toggle" },
};
