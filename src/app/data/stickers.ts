/**
 * Reaction stickers — the lightweight feedback a player can leave during a
 * visit to a friend's aquarium. All preset (no free text → COPPA-safe).
 *
 * Sticker IDs are stored in friend_notifications.sticker_id. Adding a new
 * sticker means appending it here; removing one is fine — unknown IDs render
 * as a generic ✨ icon via STICKER_FALLBACK.
 */

export interface StickerDef {
  id: string;
  emoji: string;
  label: string;        // Short, kid-readable
  message: string;      // Full notification text (sender_name is prefixed by the renderer)
}

export const STICKERS: StickerDef[] = [
  { id: 'cool',     emoji: '🐠', label: 'Cool tank', message: 'thinks your tank is cool!' },
  { id: 'love',     emoji: '🌊', label: 'Love it',   message: 'loves your aquarium!' },
  { id: 'wow',      emoji: '✨', label: 'Wow',       message: 'is wowed by your reef!' },
  { id: 'nice',     emoji: '🐚', label: 'Nice',      message: 'left a nice shell for you!' },
  { id: 'amazing',  emoji: '🌟', label: 'Amazing',   message: 'thinks your axolotl is amazing!' },
  { id: 'friends',  emoji: '💜', label: 'Friends',   message: 'is glad to be your friend!' },
];

export const STICKER_FALLBACK = '✨';

export function getSticker(id: string | null | undefined): StickerDef | null {
  if (!id) return null;
  return STICKERS.find(s => s.id === id) ?? null;
}
