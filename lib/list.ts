import {
  FectError,
  err,
  ok,
  type Fect,
  type FectErrorClass,
} from "./fect.ts";
import { None, type Option, Some } from "./adts.ts";

const ListIndexOutOfBoundsBase: FectErrorClass<
  "ListIndexOutOfBounds",
  { index: number; length: number }
> = FectError("ListIndexOutOfBounds")<{ index: number; length: number }>();

export class ListIndexOutOfBounds extends ListIndexOutOfBoundsBase {}

export function length<T>(items: readonly T[]): number {
  return items.length;
}

export function slice<T>(
  items: readonly T[],
  start: number,
  end?: number,
): readonly T[] {
  return items.slice(start, end);
}

export function atOption<T>(items: readonly T[], index: number): Option<T> {
  if (index < 0 || index >= items.length) return None;
  return Some(items[index]);
}

export function at<T>(
  items: readonly T[],
  index: number,
): Fect<T, { result: ListIndexOutOfBounds }> {
  if (index < 0 || index >= items.length) {
    return err(ListIndexOutOfBounds.of({ index, length: items.length }));
  }
  return ok(items[index]) as unknown as Fect<T, { result: ListIndexOutOfBounds }>;
}

export function prepend<T>(head: T, tail: readonly T[]): readonly T[] {
  return [head, ...tail];
}

export const List = {
  length,
  slice,
  atOption,
  at,
  prepend,
  ListIndexOutOfBounds,
} as const;
