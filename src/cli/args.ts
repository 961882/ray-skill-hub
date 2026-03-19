export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

export function getOptionValue(args: string[], option: string): string | undefined {
  const optionIndex = args.findIndex((arg) => arg === option);
  if (optionIndex < 0) {
    return undefined;
  }

  const candidate = args[optionIndex + 1];
  if (!candidate || candidate.startsWith("--")) {
    return undefined;
  }

  return candidate;
}

export function getCsvOptionValues(args: string[], option: string): string[] | undefined {
  const value = getOptionValue(args, option);
  if (value === undefined) {
    return undefined;
  }

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed;
}

export function getFirstPositionalArg(args: string[], optionsWithValues: string[] = []): string | undefined {
  const skipIndexes = new Set<number>();

  for (const option of optionsWithValues) {
    const optionIndex = args.findIndex((arg) => arg === option);
    if (optionIndex < 0) {
      continue;
    }
    skipIndexes.add(optionIndex);
    const candidate = args[optionIndex + 1];
    if (candidate && !candidate.startsWith("--")) {
      skipIndexes.add(optionIndex + 1);
    }
  }

  return args.find((arg, index) => !arg.startsWith("--") && !skipIndexes.has(index));
}
