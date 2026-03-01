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

  return (response.json()) as Promise<GitHubRepo[]>;
});

const summarize = Fect.fn((repos: GitHubRepo[]) => {
  const top = [...repos]
    .filter((repo) => !repo.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 3)
    .map((repo) => `${repo.name} (${repo.stargazers_count}★)`);

  return { count: repos.length, top };
});

// ── Run ─────────────────────────────────────────────────────────────


// Async is just another infection in Fx. The only `await` is at discharge.
export const runInfectionExample = Fect.fn(
  async (rawInput: string): Promise<void> => {
    
    const parsed = parseInput(rawInput); //Fect<string, {result: InputEmpty;}>
    const user = fetchUser(parsed); //Fect<GitHubUser, {async: true;result: InputEmpty | HttpError;}>
    const userWithoutInputError = Fect.partial(user).with({
      err: {
        InputEmpty: () => {
          throw new Error("input username is empty");
        },
      },
    });
    const repos = fetchRepos(userWithoutInputError); //Fect<GitHubRepo[], {async: true; result: HttpError | PromiseRejected | UnknownException;}>
    const result = summarize(repos); // const result: Fect<{count: number;top: string[];}, {async: true;result: HttpError | PromiseRejected | UnknownException;}>
    
    
    
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
        HttpError: (e) => `Error: HTTP ${e.status} at ${e.where}`,
      },
    });

    console.log(message);
  },
);

if (import.meta.main) {
  runInfectionExample(Deno.args[0] ?? "denoland");
}
