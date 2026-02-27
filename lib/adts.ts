import { err, ok, type Fect } from "./fect.ts";

export type None = { readonly _tag: "None" };
export type Some<T> = { readonly _tag: "Some"; readonly value: T };
export type Option<T> = None | Some<T>;

export const None: None = { _tag: "None" };

export function Some<T>(value: T): Some<T> {
  return { _tag: "Some", value };
}

export function isSome<T>(option: Option<T>): option is Some<T> {
  return option._tag === "Some";
}

export function isNone<T>(option: Option<T>): option is None {
  return option._tag === "None";
}

export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value == null ? None : Some(value);
}

export function map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
  return isSome(option) ? Some(fn(option.value)) : None;
}

export function flatMap<T, U>(
  option: Option<T>,
  fn: (value: T) => Option<U>,
): Option<U> {
  return isSome(option) ? fn(option.value) : None;
}

export function getOrElse<T>(option: Option<T>, fallback: () => T): T {
  return isSome(option) ? option.value : fallback();
}

export function toResult<T, E>(
  option: Option<T>,
  onNone: () => E,
): Fect<T, {}> | Fect<never, { result: E }> {
  return isSome(option) ? ok(option.value) : err(onNone());
}

export function matchOption<T, R>(
  option: Option<T>,
  handlers: { Some: (value: T) => R; None: () => R },
): R {
  return isSome(option) ? handlers.Some(option.value) : handlers.None();
}

export const Option = {
  None,
  Some,
  isSome,
  isNone,
  fromNullable,
  map,
  flatMap,
  getOrElse,
  toResult,
  match: matchOption,
} as const;
