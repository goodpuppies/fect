import { Fect } from "../mod.ts";

// ── Error declarations ──────────────────────────────────────────

class InputEmpty extends Fect.error("InputEmpty")() {}
class HttpError
  extends Fect.error("HttpError")<{ status: number; where: string }>() {}

// ── Domain types ────────────────────────────────────────────────────

interface GitHubUser {
  login: string;
  repos_url: string;
}

interface GitHubRepo {
  name: string;
  stargazers_count: number;
  fork: boolean;
}

// ── Pipeline steps ──────────────────────────────────────────────────

const parseInput = Fect.fn((raw: string) => {
  const username = raw.trim();
  if (username.length === 0) return InputEmpty.err();
  return username;
});

const fetchUser = Fect.fn(async (username: string) => {
  const response = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "logicalassert-infection-example4",
      },
    },
  );

  if (!response.ok) {
    return HttpError.err({ status: response.status, where: "fetchUser" });
  }

  return (await response.json()) as GitHubUser;
});

const fetchRepos = Fect.fn(async (user: GitHubUser) => {
  const response = await fetch(user.repos_url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "logicalassert-infection-example4",
    },
  });

  if (!response.ok) {
    return HttpError.err({ status: response.status, where: "fetchRepos" });
  }

  return (await response.json()) as GitHubRepo[];
});

const summarize = Fect.fn((repos: GitHubRepo[]) => {
  const top = [...repos]
    .filter((repo) => !repo.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 3)
    .map((repo) => `${repo.name} (${repo.stargazers_count}★)`);
  
  throw new Error("catch me")

  return { count: repos.length, top };
});

// ── Run ─────────────────────────────────────────────────────────────

// The pipeline composes synchronously — carriers thread through instantly.
// Async is just another infection in Fx. The only `await` is at discharge.
export async function runInfectionExample4(rawInput: string): Promise<void> {
  const parsed = parseInput(rawInput);
  const user = fetchUser(parsed);
  const repos = fetchRepos(user);
  const result = summarize(repos);

  const message = await Fect.match(result).with({
    ok: (value) =>
      `Repos: ${value.count} | Top: ${value.top.join(", ") || "none"}`,
    err: {
      PromiseRejected: () => "Error: promise rejected",
      UnknownException: (e) => {
        if (e.cause instanceof Error) {
          return `Error: unknown exception ${e.cause.message}`;
        }
        return "Error: unknown exception";
      },
      InputEmpty: () => "Error: input username is empty",
      HttpError: (e) => `Error: HTTP ${e.status} at ${e.where}`,
    },
  });

  console.log(message);
}

if (import.meta.main) {
  await runInfectionExample4(Deno.args[0] ?? "denoland");
}
