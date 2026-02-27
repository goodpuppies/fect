# Fect

Simple TypeScript library for effects and pattern matching.

Fect reduces function coloring — the hard boundary between async/sync,
effectful/pure, fallible/infallible code — without a DSL, generators, or pipe
chains. Wrap your functions with `Fect.fn`, compose them normally, and unwrap at
the boundary.

```ts
import { Fect } from "@goodpuppies/fect";

const fetchUser = Fect.fn(async (name: string) => {
  const res = await fetch(`https://api.github.com/users/${name}`);
  return (await res.json()) as User;
});

const getDisplayName = Fect.fn((user: User) => user.name ?? user.login);

// getDisplayName expects a User, but gets the async Fect from fetchUser.
// It just works — no await, no unwrap, no flatMap.
const name = getDisplayName(fetchUser("denoland"));

// Unwrap once at the boundary.
console.log(await Fect.try(name));
```

`getDisplayName` is a plain sync function. It doesn't know or care that its
input is async. Fect handles that automatically — async propagates through the
chain and you discharge it once, when you need the concrete value.

## How It Works

`Fect.fn` wraps a function so it accepts both plain values and Fect-wrapped
values. When you pass a wrapped value, the function chains onto it
automatically. When you pass a plain value, it behaves like a normal function
call.

```ts
const double = Fect.fn((x: number) => x * 2);

double(5); // plain 10 — not wrapped
double(Fect.ok(5)); // Fect<10> — stays in Fect-land
double(someAsyncFect); // async Fect<10> — async propagates
```

If you've used promises, you've already seen the core idea. In JavaScript,
`Promise.resolve(Promise.resolve(123))` gives you `Promise<number>`, not
`Promise<Promise<number>>` the runtime flattens nested promises automatically.
Fect does the same thing: when you pass a wrapped value to a Fect function, it
flattens. You never get `Fect<Fect<number>>`. The inner value is always unwrapped 
before your handler runs, whether it's async, an error, or both.

Rust's `?` operator is another take on this — it unwraps `Result` at each call
site. But `?` is still function coloring: you write it explicitly, and it
changes the function's return type. Fect has no operator. You just call
functions.

This is similar to Effect's approach but without the generator/DSL layer. You
write normal TypeScript functions, wrap them with `Fect.fn`, and compose with
regular function calls. Fect stays out of your way until something is actually
effectful.

## Errors

### Tagged Errors

Declare errors in one line:

```ts
class NotFound extends Fect.error("NotFound")<{ id: string }>() {}
class Unauthorized extends Fect.error("Unauthorized")() {}
```

Return errors from `Fect.fn` handlers with `.err()`:

```ts
const loadUser = Fect.fn(async (id: string) => {
  const res = await fetch(`/api/users/${id}`);
  if (res.status === 404) return NotFound.err({ id });
  if (res.status === 401) return Unauthorized.err();
  return (await res.json()) as User;
});
```

Errors short-circuit — downstream steps don't run if an upstream step failed.

### Defects

Unhandled throws and rejected promises are caught automatically and tagged as
`UnknownException` or `PromiseRejected`. You can customize this:

```ts
Fect.fn(handler, {
  mapThrown: (cause) => new MyError(cause),
  mapRejected: (cause) => new MyError(cause),
});
```

## Unwrapping

At the boundary of your program — where you need a concrete value — you have two
options.

### Pattern Matching

`Fect.match` gives you exhaustive, type-safe matching on both Fect carriers and
plain values:

```ts
const message = await Fect.match(result).with({
  ok: (user) => `Hello, ${user.name}`,
  err: {
    NotFound: (e) => `No user ${e.id}`,
    Unauthorized: () => "Access denied",
    PromiseRejected: () => "Network error",
    UnknownException: (e) => `Bug: ${e.cause}`,
  },
});
```

Miss an error branch and TypeScript will tell you at compile time.

For non-tagged errors, pass a function:

```ts
Fect.match(result).with({
  ok: (v) => v,
  err: (e) => `failed: ${e}`,
});
```

`match` also works on plain values:

```ts
type UserType = "admin" | "user";

const login = Fect.fn((userType: UserType) => {
  return Fect.match(userType).with({
    admin: () => "Welcome, Administrator!",
    user: () => "Hello, User!",
  })
})
```

### Try

`Fect.try` extracts the value directly, throwing on error:

```ts
const user = Fect.try(syncResult); // throws if err
const user = await Fect.try(asyncResult); // rejects if err
```

## RemoteValue

One-shot async rendezvous for values that arrive later — from another actor, a
WebSocket, a callback:

```ts
const rv = Fect.remoteValue<number>({ timeoutMs: 5000 });

// Fill from anywhere:
rv.fill(42);

// Compose like any other value:
const doubled = double(rv);
console.log(await Fect.try(doubled)); // 84
```

## Full Example

```ts
import { Fect } from "@goodpuppies/fect";

class InputEmpty extends Fect.error("InputEmpty")() {}
class HttpError
  extends Fect.error("HttpError")<{ status: number; where: string }>() {}

const parseInput = Fect.fn((raw: string) => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return InputEmpty.err();
  return trimmed;
});

const fetchUser = Fect.fn(async (username: string) => {
  const res = await fetch(`https://api.github.com/users/${username}`);
  if (!res.ok) return HttpError.err({ status: res.status, where: "fetchUser" });
  return (await res.json()) as { login: string; repos_url: string };
});

const fetchRepos = Fect.fn(async (user: { repos_url: string }) => {
  const res = await fetch(user.repos_url);
  if (!res.ok) {
    return HttpError.err({ status: res.status, where: "fetchRepos" });
  }
  return (await res.json()) as { name: string; stargazers_count: number }[];
});

const summarize = Fect.fn((
  repos: { name: string; stargazers_count: number }[],
) =>
  repos.sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 3)
    .map((r) => `${r.name} (${r.stargazers_count}★)`)
);

// Compose — no intermediate awaits, no unwrapping between steps.
const parsed = parseInput("denoland");
const user = fetchUser(parsed);
const repos = fetchRepos(user);
const result = summarize(repos);

// Unwrap at the boundary with exhaustive matching.
const message = await Fect.match(result).with({
  ok: (top) => `Top repos: ${top.join(", ")}`,
  err: {
    InputEmpty: () => "Error: empty input",
    HttpError: (e) => `Error: HTTP ${e.status} at ${e.where}`,
    PromiseRejected: () => "Error: network failure",
    UnknownException: (e) => `Error: ${e.cause}`,
  },
});

console.log(message);
```

## API

| Function                        | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `Fect.fn(handler, options?)`    | Wrap a function for effect-aware composition |
| `Fect.ok(value)`                | Construct a success carrier                  |
| `Fect.err(error)`               | Construct an error carrier                   |
| `Fect.fail(error)`              | Signal an error inside a handler             |
| `Fect.error(tag)<Fields>()`     | Declare a tagged error class                 |
| `Fect.match(input).with({...})` | Pattern match on carriers or plain values    |
| `Fect.try(carrier)`             | Extract value or throw                       |
| `Fect.isOk(carrier)`            | Check if carrier holds a value               |
| `Fect.isErr(carrier)`           | Check if carrier holds an error              |
| `Fect.isFect(value)`            | Runtime type guard                           |
| `Fect.remoteValue(options?)`    | Create a one-shot async rendezvous           |

All functions are also available as named exports (`fn`, `ok`, `err`, `match`,
etc.) if you prefer destructured imports.

## License

MIT
