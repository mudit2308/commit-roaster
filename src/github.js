// Fetches a repo's recent commits from the public GitHub API.

const API = "https://api.github.com";
const MAX_PAGES = 3; // up to 300 commits

export class GitHubError extends Error {}

/** Accepts "owner/repo", "github.com/owner/repo", full URLs (with .git or extra paths). */
export function parseRepo(input) {
  const s = String(input || "").trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const m =
    s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/i) ||
    s.match(/^git@github\.com:([\w.-]+)\/([\w.-]+)$/i) ||
    s.match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? { owner: m[1], repo: m[2].replace(/\.git$/, "") } : null;
}

async function request(path, token) {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (res.status === 404) throw new GitHubError("Repo not found. Check the link, or it may be private (paste your git log instead).");
  if (res.status === 409) throw new GitHubError("This repo is empty. Nothing to roast… yet.");
  if (res.status === 401) throw new GitHubError("That token was rejected.");
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const when = reset ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString()}.` : "";
    throw new GitHubError(`GitHub's rate limit was reached.${when}`);
  }
  if (!res.ok) throw new GitHubError(`GitHub returned an error (${res.status}).`);
  return res.json();
}

export async function fetchCommits({ owner, repo }, token) {
  const info = await request(`/repos/${owner}/${repo}`, token);
  const commits = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await request(`/repos/${owner}/${repo}/commits?per_page=100&page=${page}`, token);
    commits.push(
      ...batch.map((c) => ({
        message: c.commit?.message || "",
        date: c.commit?.author?.date || null,
        author: c.author?.login || c.commit?.author?.name || null,
      }))
    );
    if (batch.length < 100) break;
  }
  return { info: { name: info.full_name, url: info.html_url, stars: info.stargazers_count }, commits };
}
