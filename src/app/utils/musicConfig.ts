/**
 * Music configuration — maps screens/contexts to their background music tracks.
 * Add MP3 files to the corresponding public/music/ subfolder, then add the path here.
 */

/**
 * Resolve a public-folder asset path relative to index.html so it works
 * under both http:// (dev server) and file:// (iOS WKWebView bundle).
 */
const base = import.meta.env.BASE_URL;          // './' in production, '/' in dev

export const MUSIC_CONFIG = {
  aquarium: [
    `${base}music/aquarium/Axolotl Keeper.mp3`,
    `${base}music/aquarium/Axolotl Dream Tank.mp3`,
    `${base}music/aquarium/Axolotl Dream Tank (1).mp3`,
    `${base}music/aquarium/Axolotl Moonlight.mp3`,
    `${base}music/aquarium/Dream Cartridge.mp3`,
  ] as const,
  miniGames: [
    `${base}music/mini-games/Axolittle mini game screen.mp3`,
    `${base}music/mini-games/Axolittle mini game screen2.mp3`,
  ] as const,
  social: [
    // `${base}music/social/track-1.mp3`,
    // `${base}music/social/track-2.mp3`,
  ] as const,
} as const;

/**
 * Pick a random track from the given context.
 * Returns undefined if no tracks are configured.
 */
export function getRandomTrack(context: keyof typeof MUSIC_CONFIG): string | undefined {
  const tracks = MUSIC_CONFIG[context];
  if (!tracks.length) return undefined;
  return tracks[Math.floor(Math.random() * tracks.length)];
}
