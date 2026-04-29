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

  // Reaction stickers (Release 1.2)
  STICKER_SENT: 'sticker_sent',
  STICKER_RECEIVED: 'sticker_received',

  // Friend code share (Release 1.2)
  FRIEND_CODE_SHARE_SUCCEEDED: 'friend_code_share_succeeded',
  FRIEND_CODE_SHARE_DISMISSED: 'friend_code_share_dismissed',
  FRIEND_CODE_SHARE_FALLBACK_COPY: 'friend_code_share_fallback_copy',

  // Friend requests (new infra)
  FRIEND_REQUEST_SENT: 'friend_request_sent',
  FRIEND_REQUEST_RECEIVED: 'friend_request_received',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  FRIEND_REQUEST_DECLINED: 'friend_request_declined',
} as const;

/**
 * Friendship-level events (Phase 2.1). Track XP grants, level-ups, and which
 * actions actually drive the curve so we can tune pacing post-launch.
 */
export const FriendshipEvents = {
  XP_AWARDED: 'friendship_xp_awarded',
  LEVELED_UP: 'friendship_leveled_up',
  CAP_REACHED: 'friendship_cap_reached',
  RING_TAPPED: 'friendship_ring_tapped',
  DETAIL_VIEWED: 'friendship_detail_viewed',
} as const;

export type FriendshipEventName = typeof FriendshipEvents[keyof typeof FriendshipEvents];

/**
 * Moderation events (Phase 2.0). Required for App Store / Play Store UGC
 * compliance — the funnel data lets us measure how often players use these
 * tools and tune the UX so they're easy to reach without being noisy.
 */
export const ModerationEvents = {
  // Report flow
  REPORT_OPENED: 'report_opened',
  REPORT_SUBMITTED: 'report_submitted',
  REPORT_FAILED: 'report_failed',

  // Block flow
  USER_BLOCKED: 'user_blocked',
  USER_UNBLOCKED: 'user_unblocked',

  // Server-side name moderation outcomes
  AXOLOTL_NAME_REJECTED_SERVER: 'axolotl_name_rejected_server',

  // Under-13 sync
  UNDER13_FLAG_SET: 'under13_flag_set',
} as const;

export type ModerationEventName = typeof ModerationEvents[keyof typeof ModerationEvents];

export type SocialEventName = typeof SocialEvents[keyof typeof SocialEvents];

export const OnboardingEvents = {
  NAMING_COMPLETE:    'onboarding_naming_complete',
  FIRST_FEED:         'onboarding_first_feed',
  FIRST_CARE_CYCLE:   'onboarding_first_care_cycle',
  SESSION_RETURN:     'onboarding_session_return',
} as const;

export type OnboardingEventName = typeof OnboardingEvents[keyof typeof OnboardingEvents];

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
