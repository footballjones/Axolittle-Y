/**
 * Minimal telemetry stub. First-party only — never send PII or any identifier
 * for under-13 sessions. Replace the body with a real analytics call later;
 * the surface is intentionally constrained so callers can't leak PII through it.
 *
 * Events use snake_case names. Props must be primitive (number / boolean / short string)
 * and must not contain user IDs, usernames, emails, friend codes, or device identifiers.
 */
type Primitive = string | number | boolean | null;
type EventProps = Record<string, Primitive>;

export function track(event: string, props: EventProps = {}): void {
  // Production builds strip console.* via the vite esbuild drop, so this is a
  // dev-only signal until a real analytics sink is wired up.
  console.info(`[telemetry] ${event}`, props);
}
