# Mini-Game Integration Guide

This guide helps you integrate your proof-of-concept game code into the Axolittle game.

## Required Interface

All mini-games must implement the `MiniGameProps` interface:

```typescript
interface MiniGameProps {
  onEnd: (result: GameResult) => void;
  energy: number; // Current energy (for display/validation)
}
```

## Required GameResult Format

When your game ends, call `onEnd` with this structure:

```typescript
interface GameResult {
  score: number;           // Your game's score (used for tier calculation)
  tier: 'normal' | 'good' | 'exceptional';  // Will be calculated automatically
  xp: number;              // Will be calculated automatically
  coins: number;           // Will be calculated automatically
  opals?: number;          // Optional: 1 if exceptional tier and opal roll succeeds
}
```

**Note:** You can pass `tier: 'normal'`, `xp: 0`, `coins: 0` - the reward system will calculate the actual values based on your `score`.

## Integration Steps

### 1. Use GameWrapper (Optional but Recommended)

The `GameWrapper` provides:
- Full-screen overlay with gradient background
- Close button (X) in top-left
- Pause button (optional)
- Score display (optional)
- Pause overlay

```typescript
import { GameWrapper } from './GameWrapper';

export function YourGame({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Your game logic here...
  
  return (
    <GameWrapper
      gameName="Your Game Name"
      score={score}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
      onEnd={onEnd}
    >
      {/* Your game content here */}
    </GameWrapper>
  );
}
```

### 2. Calculate Rewards

Use the `calculateRewards` function to get proper rewards:

```typescript
import { calculateRewards } from './config';

// When game ends:
const rewards = calculateRewards('your-game-id', score);
onEnd({
  score,
  tier: rewards.tier,
  xp: rewards.xp,
  coins: rewards.coins,
  opals: rewards.opals,
});
```

### 3. Register Your Game

Add your game to `App.tsx`:

```typescript
// Import
import { YourGame } from './minigames/YourGame';

// In the render section (around line 1150):
{activeGame === 'your-game-id' && gameState && (
  <YourGame
    onEnd={handleMiniGameEnd}
    energy={gameState.energy}
  />
)}
```

### 4. Add Game to Menu

Add your game to `MiniGameMenu.tsx`:

```typescript
// In soloGames or multiplayerGames array:
{
  id: 'your-game-id',
  name: 'Your Game Name',
  emoji: '🎮',
  color: 'from-blue-400 to-cyan-500',
  description: 'Your game description',
  coins: '10-30',
  players: '1', // or '2', '4' for multiplayer
}
```

### 5. Add Reward Configuration

Add your game to `config.ts`:

```typescript
// In GAME_REWARDS:
'your-game-id': {
  normal: { xp: 0.5, coins: 15 },
  good: { xp: 1, coins: 25 },
  exceptional: { xp: 2, coins: 35, opalChance: 0.1 },
},

// In SCORE_THRESHOLDS:
'your-game-id': { good: 20, exceptional: 40 },
```

## Game IDs Reference

Current game IDs:
- `keepey-upey` - Keep the axolotl afloat
- `fish-hooks` - Flappy Bird style
- `math-rush` - Math equations
- `axolotl-stacker` - Stack blocks
- `coral-code` - Mastermind code guessing
- `treasure-hunt` - Cave exploration
- `fishing` - Multiplayer fishing (2 players)
- `bite-tag` - Multiplayer tag (4 players)

## Common Patterns

### Game Loop Pattern
```typescript
const gameLoop = useCallback(() => {
  if (!isPlaying || isPaused) return;
  
  // Update game state
  // Check collisions
  // Update score
  
  animationFrameRef.current = requestAnimationFrame(gameLoop);
}, [isPlaying, isPaused, /* dependencies */]);

useEffect(() => {
  if (isPlaying && !isPaused) {
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }
  return () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
}, [isPlaying, isPaused, gameLoop]);
```

### Ending Game Pattern
```typescript
useEffect(() => {
  if (!isPlaying && score > 0) {
    const rewards = calculateRewards('your-game-id', score);
    onEnd({
      score,
      tier: rewards.tier,
      xp: rewards.xp,
      coins: rewards.coins,
      opals: rewards.opals,
    });
  }
}, [isPlaying, score, onEnd]);
```

## Styling Guidelines

- Use Tailwind CSS classes
- Use `motion` from `motion/react` for animations
- Full-screen games should use `fixed inset-0` or GameWrapper
- Mobile-first responsive design
- Touch-friendly (minimum 44x44px touch targets)

## Testing Checklist

- [ ] Game starts when selected from menu
- [ ] Game ends and calls `onEnd` with proper GameResult
- [ ] Rewards are calculated correctly
- [ ] Energy is deducted (if energy > 0)
- [ ] No rewards given when energy = 0
- [ ] Game closes and returns to menu
- [ ] Works on mobile and desktop
- [ ] No console errors
- [ ] Performance is acceptable (60fps)

## Notes

- Games are rendered with `AnimatePresence` for smooth transitions
- Games use `z-50` to appear above everything
- The `energy` prop is for display/validation only - energy deduction happens in App.tsx
- All games should be playable even with 0 energy (just no rewards)
