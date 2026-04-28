/**
 * Per-friend interaction counters, kept in localStorage on the device. Used
 * for the friend-card QoL display ("visited 4 times", "you've sent 3 gifts").
 *
 * Intentionally local-only: this is a private "how do I feel about this
 * friend" memory, not something other players need to see. Keeping it off
 * the wire avoids both privacy questions and a database round-trip on every
 * card render.
 *
 * Data shape per friend:
 *   { visits: number, giftsSent: number, lastVisitAt?: number }
 *
 * All values reset on localStorage clear (account switch / reinstall) — this
 * is intentional. The numbers are meant as gentle social texture, not a
 * permanent ledger.
 */

const KEY = 'friend_stats_v1';

export interface FriendStats {
  visits: number;
  giftsSent: number;
  lastVisitAt?: number;
}

type StatsMap = Record<string, FriendStats>;

function readAll(): StatsMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StatsMap;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: StatsMap): void {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* quota / private mode */ }
}

export function getFriendStats(friendId: string): FriendStats {
  const map = readAll();
  return map[friendId] ?? { visits: 0, giftsSent: 0 };
}

export function getAllFriendStats(): StatsMap {
  return readAll();
}

export function recordFriendVisit(friendId: string): void {
  const map = readAll();
  const cur = map[friendId] ?? { visits: 0, giftsSent: 0 };
  map[friendId] = { ...cur, visits: cur.visits + 1, lastVisitAt: Date.now() };
  writeAll(map);
}

export function recordFriendGift(friendId: string): void {
  const map = readAll();
  const cur = map[friendId] ?? { visits: 0, giftsSent: 0 };
  map[friendId] = { ...cur, giftsSent: cur.giftsSent + 1 };
  writeAll(map);
}
