/**
 * Minimal telemetry stub. First-party only — never send PII or any identifier
 * for under-13 sessions. Replace the body of `track()` with a real analytics
 * call later; the surface is intentionally constrained so callers can't leak
 * PII through it.
 *
 * Events use snake_case names. Props must be primitive (number / boolean /
 * short string) and must not contain user IDs, usernames, emails, friend
 * codes, or device identifiers.
 */
type Primitive = string | number | boolean | null;
type EventProps = Record<string, Primitive>;

/**
 * Canonical event names. Add new entries here so call sites can autocomplete
 * against a single source. Names are intentionally verbose snake_case so a
 * grep for the literal returns every emit site.
 */
export const SocialEvents = {
  // Friend code surface
  FRIEND_CODE_VIEWED: 'friend_code_viewed',
  FRIEND_CODE_COPIED: 'friend_code_copied',
  FRIEND_CODE_SHARED: 'friend_code_shared',

  // Add-friend funnel
  ADD_FRIEND_OPENED: 'add_friend_opened',
  ADD_FRIEND_ATTEMPTED: 'add_friend_attempted',
  ADD_FRIEND_SUCCEEDED: 'add_friend_succeeded',
  ADD_FRIEND_FAILED: 'add_friend_failed',
  FIRST_FRIEND_ADDED: 'first_friend_added',

  // Visit / gift / poke
  FRIEND_VISITED: 'friend_visited',
  GIFT_SENT: 'gift_sent',
  GIFT_RECEIVED: 'gift_received',
  POKE_SENT: 'poke_sent',

  // Friend requests (new infra)
  FRIEND_REQUEST_SENT: 'friend_request_sent',
  FRIEND_REQUEST_RECEIVED: 'friend_request_received',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  FRIEND_REQUEST_DECLINED: 'friend_request_declined',
} as const;

export type SocialEventName = typeof SocialEvents[keyof typeof SocialEvents];

export function track(event: string, props: EventProps = {}): void {
  // Production builds strip console.* via the vite esbuild drop, so this is a
  // dev-only signal until a real analytics sink is wired up.
  console.info(`[telemetry] ${event}`, props);
}

const ONCE_PREFIX = 'tel_once_';

/**
 * Fires a "first time on this install" event at most once per device. Backed
 * by localStorage so it survives reloads but not reinstalls. Use for funnel
 * milestones like time-to-first-friend; do not use for high-frequency events.
 */
export function trackOnce(event: string, props: EventProps = {}): void {
  try {
    const key = ONCE_PREFIX + event;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, String(Date.now()));
    track(event, props);
  } catch {
    // localStorage unavailable (private mode etc.) — fire normally.
    track(event, props);
  }
}
