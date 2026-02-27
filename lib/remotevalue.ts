export type RemoteValueOptions = {
  name?: string;
  timeoutMs?: number;
  register?: boolean;
};

/**
 * One-shot value container for request/reply style async rendezvous.
 * Create locally, resolve or reject from another code path.
 */
export class RemoteValue<T> implements PromiseLike<T> {
  private static registry = new Map<string, RemoteValue<unknown>>();

  public readonly id: string;
  public readonly name: string;

  private settled = false;
  private timeoutId: number | null = null;
  private resolve!: (value: T) => void;
  private reject!: (reason?: unknown) => void;
  private readonly promise: Promise<T>;

  constructor(options: RemoteValueOptions = {}) {
    this.id = crypto.randomUUID();
    this.name = options.name ?? "remote-value";

    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    }).finally(() => this.cleanup());

    if (options.register) {
      RemoteValue.registry.set(this.id, this as RemoteValue<unknown>);
    }

    if (typeof options.timeoutMs === "number" && options.timeoutMs > 0) {
      this.timeoutId = setTimeout(() => {
        this.fail(
          new Error(
            `RemoteValue '${this.name}' (${this.id}) timed out after ${options.timeoutMs}ms`,
          ),
        );
      }, options.timeoutMs) as unknown as number;
    }
  }

  get isSettled(): boolean {
    return this.settled;
  }

  fill(value: T): boolean {
    if (this.settled) return false;
    this.settled = true;
    this.resolve(value);
    return true;
  }

  fail(reason?: unknown): boolean {
    if (this.settled) return false;
    this.settled = true;
    this.reject(reason);
    return true;
  }

  wait(): Promise<T> {
    return this.promise;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  private cleanup(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    RemoteValue.registry.delete(this.id);
  }

  static create<T>(options: RemoteValueOptions = {}): RemoteValue<T> {
    return new RemoteValue<T>(options);
  }

  static resolveById<T>(id: string, value: T): boolean {
    const ref = RemoteValue.registry.get(id) as RemoteValue<T> | undefined;
    if (!ref) return false;
    return ref.fill(value);
  }

  static rejectById(id: string, reason?: unknown): boolean {
    const ref = RemoteValue.registry.get(id);
    if (!ref) return false;
    return ref.fail(reason);
  }
}

export function remoteValue<T>(options: RemoteValueOptions = {}): RemoteValue<T> {
  return new RemoteValue<T>(options);
}

export function isRemoteValue(value: unknown): value is RemoteValue<unknown> {
  return typeof value === "object" && value !== null &&
    "wait" in value &&
    typeof (value as { wait?: unknown }).wait === "function" &&
    "fill" in value &&
    typeof (value as { fill?: unknown }).fill === "function" &&
    "fail" in value &&
    typeof (value as { fail?: unknown }).fail === "function";
}

