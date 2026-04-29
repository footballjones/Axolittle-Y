/**
 * Tutorial / onboarding configuration.
 *
 * OnboardingProgress: single linear enum replacing 8 boolean flags.
 * MilestoneId: replaces 6 one-time "seen" booleans.
 * TUTORIAL_STEP_CONFIGS: config registry so new steps = config edit, not state-machine surgery.
 */

export type OnboardingProgress =
  | 'swipe'            // first-ever aquarium view — prompt to explore
  | 'feed'             // axolotl shows hunger; Feed button glows
  | 'eat'              // watch the axolotl eat
  | 'play'             // play tutorial (stat allocation interrupt fires here too)
  | 'clean'            // first poop clean
  | 'water'            // first water change
  | 'wellbeing_reward' // WellbeingCompleteModal + 5-opal reward
  | 'complete';        // all core tutorials done

export type MilestoneId =
  | 'stat_tutorial'     // player has allocated at least one stat point
  | 'juvenile_unlock'   // sprout-stage modal shown
  | 'level7_unlock'     // level 7 games-unlock modal shown
  | 'shrimp_tutorial'   // ghost-shrimp intro shown
  | 'rebirth_ready'     // level-30 rebirth-ready modal shown
  | 'mini_game_tutorial'; // mini-game onboarding shown

export type TutorialLockMode =
  | 'swipe' | 'feed' | 'watch' | 'stat' | 'play' | 'clean' | 'water';

interface TutorialStepConfig {
  id: OnboardingProgress;
  /** Which lock mode to derive when in this step (null = modal / no button lock). */
  lockMode: TutorialLockMode | null;
  /** Action buttons to dim while in this step. */
  lockedButtons: readonly string[];
}

const ALL_BUTTONS = ['Feed', 'Playtime', 'Clean', 'Water Quality'] as const;

export const TUTORIAL_STEP_CONFIGS: TutorialStepConfig[] = [
  { id: 'swipe',            lockMode: 'swipe',  lockedButtons: ALL_BUTTONS },
  { id: 'feed',             lockMode: 'feed',   lockedButtons: ['Playtime', 'Clean', 'Water Quality'] },
  { id: 'eat',              lockMode: 'watch',  lockedButtons: ALL_BUTTONS },
  { id: 'play',             lockMode: 'play',   lockedButtons: ['Feed', 'Clean', 'Water Quality'] },
  { id: 'clean',            lockMode: 'clean',  lockedButtons: ['Feed', 'Playtime', 'Water Quality'] },
  { id: 'water',            lockMode: 'water',  lockedButtons: ['Feed', 'Playtime', 'Clean'] },
  { id: 'wellbeing_reward', lockMode: null,     lockedButtons: [] },
  { id: 'complete',         lockMode: null,     lockedButtons: [] },
];

export function getStepConfig(progress: OnboardingProgress): TutorialStepConfig | undefined {
  return TUTORIAL_STEP_CONFIGS.find(s => s.id === progress);
}
