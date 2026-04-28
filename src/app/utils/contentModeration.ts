/**
 * Client-side first-line moderation for user-typed text (axolotl names, future
 * aquarium names, etc.). Mirror of the server-side denylist in the
 * 2026_release_1_1_social_plumbing.sql migration. The server-side trigger is
 * the authoritative check; this is for instant UX feedback so kids don't
 * round-trip an obviously-blocked name to Supabase.
 *
 * Update both lists together: keep the SQL denylist and BANNED_SUBSTRINGS
 * below in sync.
 */

const SUBSTITUTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
};

const BANNED_SUBSTRINGS: string[] = [
  // Profanity
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'bastard',
  // Sexual / body
  'sex', 'porn', 'boob', 'tit', 'penis', 'vagina', 'nude', 'horny', 'rape',
  // Racial slurs
  'nigger', 'nigga', 'faggot', 'retard', 'tranny', 'chink', 'spic',
  'gook', 'kike', 'wetback', 'towelhead', 'raghead', 'pickaninny',
  'darkie', 'beaner', 'hymie', 'jap', 'dago', 'coon',
  // Self-harm
  'suicide', 'killyourself', 'kys',
  // Hate movements / religious slurs
  'hitler', 'nazi', 'kkk', 'klan', 'whitepower', 'whitepride',
  'supremacist', 'siegheil', 'fourteenwords', 'iabb', // 'iabb' catches "1488" via 1→i,4→a,8→b
  'kafir', 'kaffir',
  // Illicit drugs
  'cocaine', 'heroin', 'fentanyl', 'marijuana', 'cannabis', 'opium',
  'ecstasy', 'mdma', 'lsd', 'dmt', 'ketamine', 'methamphetamine',
  'crackhead', 'methhead', 'junkie', 'stoner',
];

/**
 * Lower-cases, folds common leet substitutions, and strips non-letters.
 * Matches normalize_axolotl_name() in the SQL migration so client and server
 * agree on what they're matching.
 */
export function normalizeForModeration(input: string): string {
  let out = input.toLowerCase();
  out = out.replace(/[01345678@$!]/g, ch => SUBSTITUTIONS[ch] ?? ch);
  out = out.replace(/[^a-z]/g, '');
  return out;
}

/**
 * Returns true if the input contains a banned substring after normalization.
 * Empty / whitespace-only input is NOT considered banned (callers handle the
 * empty case separately).
 */
export function isNameBanned(input: string): boolean {
  const n = normalizeForModeration(input);
  if (n === '') return false;
  return BANNED_SUBSTRINGS.some(word => n.includes(word));
}
