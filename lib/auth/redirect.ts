/**
 * Validate a `redirectTo` query parameter so it can only point at our
 * own app, never an external host. Prevents open-redirect.
 */
export function safeInternalPath(target: string | undefined | null): string | null {
  if (!target) return null;
  if (!target.startsWith("/")) return null;
  // `//` is protocol-relative, would let an attacker redirect to //evil.com.
  if (target.startsWith("//")) return null;
  return target;
}
