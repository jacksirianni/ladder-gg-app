export function cn(
  ...inputs: Array<string | number | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(" ");
}
