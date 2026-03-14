/**
 * Music configuration — maps screens/contexts to their background music tracks.
 * Add MP3 files to the corresponding public/music/ subfolder, then add the path here.
 */

export const MUSIC_CONFIG = {
  aquarium: [
    '/music/aquarium/Axolotl Keeper.mp3',
    '/music/aquarium/Axolotl Dream Tank.mp3',
    '/music/aquarium/Axolotl Dream Tank (1).mp3',
    '/music/aquarium/Axolotl Moonlight.mp3',
    '/music/aquarium/Dream Cartridge.mp3',
  ] as const,
  miniGames: [
    '/music/mini-games/Axolittle mini game screen.mp3',
    '/music/mini-games/Axolittle mini game screen2.mp3',
  ] as const,
  social: [
    // '/music/social/track-1.mp3',
    // '/music/social/track-2.mp3',
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
