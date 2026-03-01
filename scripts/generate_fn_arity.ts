const ROOT = new URL("../", import.meta.url);

const fectPath = new URL("./lib/fect.ts", ROOT);
const fnPath = new URL("./lib/fn.ts", ROOT);

const typeNames = [
  "A",
  "B",
  "C",
  "DArg",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
];

const argNames = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
];

function replaceBetween(
  source: string,
  startMarker: string,
  endMarker: string,
  content: string,
): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Missing marker pair: ${startMarker} / ${endMarker}`);
  }
  const before = source.slice(0, start + startMarker.length);
  const after = source.slice(end);
  return `${before}\n${content}${after}`;
}

function generateMergeInputFxTypes(maxArity: number): string {
  const lines: string[] = [];

  for (let n = 5; n <= maxArity; n += 1) {
    const params = typeNames.slice(0, n);
    const prev = params.slice(0, -1);
    const last = params.at(-1)!;

    lines.push(`export type MergeInputFx${n}<${params.join(", ")}, D> = MergeFx<`);
    lines.push(`  MergeInputFx${n - 1}<${prev.join(", ")}, D>,`);
    lines.push(`  InputArgToFx<${last}, D>`);
    lines.push(`>;`);
  }

  return lines.join("\n");
}

function generateFnOverloads(maxArity: number): string {
  const lines: string[] = [];

  for (let n = 5; n <= maxArity; n += 1) {
    const fnArgs = argNames.slice(0, n);
    const genericArgs = typeNames.slice(0, n).map((name) => `${name}In`);

    lines.push("export function fn<");
    lines.push(
      `  H extends (${fnArgs.map((name) => `${name}: any`).join(", ")}) => unknown,`,
    );
    lines.push("  DRejected = PromiseRejected,");
    lines.push("  DThrown = UnknownException,");
    lines.push(">(");
    lines.push("  handler: H,");
    lines.push("  options?: FnOptions<DRejected, DThrown>,");
    lines.push("): {");
    lines.push("  (");
    lines.push(
      fnArgs.map((name, i) => `    ${name}: Parameters<H>[${i}],`).join("\n"),
    );
    lines.push(
      "  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;",
    );
    lines.push("  <");
    lines.push(
      genericArgs
        .map((name, i) => `    ${name} extends InfectedArg<Parameters<H>[${i}]>,`)
        .join("\n"),
    );
    lines.push("  >(");
    lines.push(fnArgs.map((name, i) => `    ${name}: ${genericArgs[i]},`).join("\n"));
    lines.push("  ): FnReturn<");
    lines.push(
      `    Fect<unknown, MergeInputFx${n}<${genericArgs.join(", ")}, DRejected | DThrown>>,`,
    );
    lines.push("    ReturnType<H>,");
    lines.push("    DRejected | DThrown");
    lines.push("  >;");
    lines.push("};");
  }

  return lines.join("\n");
}

const mergeTypes = generateMergeInputFxTypes(12);
const overloads = generateFnOverloads(12);

const fectSource = await Deno.readTextFile(fectPath);
const fnSource = await Deno.readTextFile(fnPath);

const nextFect = replaceBetween(
  fectSource,
  "// @generated-start merge-input-fx",
  "// @generated-end merge-input-fx",
  `${mergeTypes}\n`,
);
const nextFn = replaceBetween(
  fnSource,
  "// @generated-start fn-overloads-5-12",
  "// @generated-end fn-overloads-5-12",
  `${overloads}\n`,
);

await Deno.writeTextFile(fectPath, nextFect);
await Deno.writeTextFile(fnPath, nextFn);

console.log("Regenerated fn overload and merge-input types up to arity 12.");
