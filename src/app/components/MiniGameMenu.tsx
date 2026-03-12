import { useState, useEffect } from 'react';
import { User, Users, Info, Zap, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GAME_CONFIG } from '../config/game';

const UNLOCK_GAMES_COST = 5; // opals

interface MiniGameMenuProps {
  onClose?: () => void;
  onSelectGame: (gameId: string) => void;
  energy?: number;
  maxEnergy?: number;
  lastEnergyUpdate?: number;
  miniGamesLockedUntil?: number;
  opals?: number;
  onUnlockGames?: () => void;
}

interface GameTileProps {
  game: { id: string; name: string; emoji: string; color: string; description: string; coins: string; players?: string };
  index: number;
  delayOffset?: number;
  expandedId: string | null;
  onToggleInfo: (id: string) => void;
  onSelectGame: (id: string) => void;
  energy?: number;
  isLocked?: boolean;
}

function GameTile({ game, index, delayOffset = 0, expandedId, onToggleInfo, onSelectGame, energy: _energy = 0, isLocked = false }: GameTileProps) {
  const isExpanded = expandedId === game.id;

  return (
    <motion.div
      key={game.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delayOffset + index * 0.05 }}
      className={`relative bg-white/50 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg shadow-purple-900/5 overflow-hidden ${isLocked ? 'opacity-50' : ''}`}
      style={{ transform: 'scale(0.65)' }}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-2xl cursor-not-allowed">
          <Lock className="w-5 h-5 text-white/80" />
        </div>
      )}
      <button
        onClick={() => !isLocked && onSelectGame(game.id)}
        disabled={isLocked}
        className={`w-full p-3 text-left group transition-colors active:bg-white/20 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className={`bg-gradient-to-br ${game.color} rounded-xl w-11 h-11 flex items-center justify-center transition-transform shadow-lg ring-1 ring-white/30`}>
            {game.id === 'fish-hooks' ? (
              // 🪝 Hook swings like a pendulum
              <motion.span
                className="text-xl leading-none inline-block"
                style={{ transformOrigin: 'top center' }}
                animate={{ rotate: [-20, 20, -20] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                {game.emoji}
              </motion.span>
            ) : game.id === 'keepey-upey' ? (
              // 🎈 Balloon drifts and bobs like floating
              <motion.span
                className="text-xl leading-none inline-block"
                animate={{ x: [-5, 4, -3, 6, -5], y: [-4, 5, -6, 2, -4] }}
                transition={{
                  x: { duration: 9, repeat: Infinity, ease: 'easeInOut' },
                  y: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                {game.emoji}
              </motion.span>
            ) : game.id === 'math-rush' ? (
              // 🔢 Numbers pulse — quiz urgency
              <motion.span
                className="text-xl leading-none inline-block"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
              >
                {game.emoji}
              </motion.span>
            ) : game.id === 'axolotl-stacker' ? (
              // 🥞 Stack wobbles side to side — balancing
              <motion.span
                className="text-xl leading-none inline-block"
                animate={{ rotate: [-6, 6, -6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                {game.emoji}
              </motion.span>
            ) : game.id === 'treasure-hunt' ? (
              // 💎 Gem sparkles with a scale pulse
              <motion.span
                className="text-xl leading-none inline-block"
                animate={{ scale: [1, 1.25, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
              >
                {game.emoji}
              </motion.span>
            ) : game.id === 'coral-code' ? (
              // 🪸 Coral sways gently in the current
              <motion.span
                className="text-xl leading-none inline-block"
                style={{ transformOrigin: 'bottom center' }}
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                {game.emoji}
              </motion.span>
            ) : game.id === 'fishing' ? (
              // 🎣 Rod bobs up and down — waiting for a bite
              <motion.span
                className="text-xl leading-none inline-block"
                animate={{ y: [-3, 3, -3], rotate: [-4, 4, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {game.emoji}
              </motion.span>
            ) : game.id === 'bite-tag' ? (
              // 🦷 Tooth chomps with a quick scale squeeze
              <motion.span
                className="text-xl leading-none inline-block"
                animate={{ scaleY: [1, 0.75, 1], scaleX: [1, 1.1, 1] }}
                transition={{ duration: 0.35, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              >
                {game.emoji}
              </motion.span>
            ) : (
              <span className="text-xl leading-none">{game.emoji}</span>
            )}
          </div>
          <h4 className="font-bold text-slate-800 text-sm leading-tight">{game.name}</h4>
        </div>
      </button>

      {/* Info button underneath title */}
      <div className="flex justify-center pb-0 -mt-3">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onToggleInfo(game.id);
          }}
          className="w-5 h-5 flex items-center justify-center"
          whileTap={{ scale: 0.9 }}
        >
          <Info className="w-3 h-3 text-purple-400" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Expandable info section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0.5 flex flex-col items-center gap-1.5 border-t border-purple-100/40">
              <p className="text-[10px] text-slate-500 leading-tight text-center mt-1.5">{game.description}</p>
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                  💰 {game.coins}
                </span>
                {game.players && (
                  <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100/80 px-2 py-0.5 rounded-full">
                    👥 {game.players}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function MiniGameMenu({ onClose: _onClose, onSelectGame, energy = 10, maxEnergy = 10, lastEnergyUpdate, miniGamesLockedUntil, opals = 0, onUnlockGames }: MiniGameMenuProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [energyTimeText, setEnergyTimeText] = useState<string>('');
  const [lockTimeText, setLockTimeText] = useState<string>('');

  const isLocked = !!miniGamesLockedUntil && miniGamesLockedUntil > Date.now();

  // Live countdown for the mini-game lock
  useEffect(() => {
    if (!miniGamesLockedUntil) return;

    const updateLockTimer = () => {
      const remaining = Math.max(0, Math.ceil((miniGamesLockedUntil - Date.now()) / 1000));
      if (remaining <= 0) {
        setLockTimeText('');
        return;
      }
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      if (h > 0) {
        setLockTimeText(`${h}h ${m}m ${s}s remaining`);
      } else if (m > 0) {
        setLockTimeText(`${m}m ${s}s remaining`);
      } else {
        setLockTimeText(`${s}s remaining`);
      }
    };

    updateLockTimer();
    const interval = setInterval(updateLockTimer, 1000);
    return () => clearInterval(interval);
  }, [miniGamesLockedUntil]);

  const toggleInfo = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // energy is stored as a float in game state, floor it for display
  const displayEnergy = Math.floor(energy);
  const energyPercent = (displayEnergy / maxEnergy) * 100;

  // Calculate time until next energy — derives directly from float energy + elapsed time.
  // Because energy is stored as a float (fractional progress is preserved), this is always
  // accurate even after the component remounts or the wellbeing engine ticks.
  useEffect(() => {
    const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600; // per second

    const updateTimer = () => {
      if (energy >= maxEnergy) {
        setEnergyTimeText('Energy is full!');
        return;
      }

      if (!lastEnergyUpdate) {
        setEnergyTimeText('Calculating...');
        return;
      }

      // Compute exact fractional energy right now
      const elapsedSinceLastUpdate = Math.max(0, (Date.now() - lastEnergyUpdate) / 1000);
      const fractionalEnergy = Math.min(maxEnergy, energy + energyRegenRate * elapsedSinceLastUpdate);

      if (fractionalEnergy >= maxEnergy) {
        setEnergyTimeText('Energy is full!');
        return;
      }

      const nextFullPoint = Math.floor(fractionalEnergy) + 1;
      const secondsUntilNext = Math.floor((nextFullPoint - fractionalEnergy) / energyRegenRate);

      if (secondsUntilNext <= 0) {
        setEnergyTimeText('0s until next energy');
        return;
      }

      const minutes = Math.floor(secondsUntilNext / 60);
      const seconds = secondsUntilNext % 60;
      setEnergyTimeText(minutes > 0 ? `${minutes}m ${seconds}s until next energy` : `${seconds}s until next energy`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [energy, maxEnergy, lastEnergyUpdate]);

  const soloGames = [
    {
      id: 'fish-hooks',
      name: 'Fish Hooks',
      emoji: '🪝',
      color: 'from-sky-400 to-cyan-500',
      description: 'Flappy Axolotl',
      coins: '10-30',
    },
    {
      id: 'keepey-upey',
      name: 'Keepey Upey',
      emoji: '🎈',
      color: 'from-fuchsia-400 to-pink-500',
      description: 'Keep It Up!',
      coins: '15-35',
    },
    {
      id: 'math-rush',
      name: 'Math Rush',
      emoji: '🔢',
      color: 'from-violet-400 to-indigo-600',
      description: 'Solve math fast!',
      coins: '20-40',
    },
    {
      id: 'axolotl-stacker',
      name: 'Axolotl Stacker',
      emoji: '🥞',
      color: 'from-blue-500 to-indigo-600',
      description: 'Stack them high!',
      coins: '15-30',
    },
    {
      id: 'treasure-hunt',
      name: 'Treasure Hunt',
      emoji: '💎',
      color: 'from-teal-400 to-emerald-500',
      description: 'Find hidden treasures',
      coins: '25-50',
    },
    {
      id: 'coral-code',
      name: 'Coral Code',
      emoji: '🪸',
      color: 'from-purple-500 to-violet-600',
      description: 'Crack the code',
      coins: '20-45',
    },
  ];

  const multiplayerGames = [
    {
      id: 'fishing',
      name: 'Fishing',
      emoji: '🎣',
      color: 'from-amber-400 to-orange-500',
      description: 'Catch the most!',
      coins: '30-60',
      players: '2',
    },
    {
      id: 'bite-tag',
      name: 'Bite Tag',
      emoji: '🦷',
      color: 'from-rose-500 to-red-600',
      description: 'Tag other axolotls!',
      coins: '25-55',
      players: '4',
    },
  ];

  return (
    <div className="pt-32 px-4 sm:px-6 pb-32 space-y-4 sm:space-y-6 min-h-full">
      {/* Energy Bar */}
      <motion.div
        className="relative bg-white/[0.08] backdrop-blur-2xl rounded-xl border border-white/10 px-2.5 py-1.5 overflow-visible"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <motion.div
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]" />
          </motion.div>
          <span className="text-[10px] font-bold text-white/80">Energy</span>
          <span className="ml-auto text-[10px] font-bold text-yellow-300">{displayEnergy}/{maxEnergy}</span>
        </div>
        <div className="h-1.5 rounded-full bg-black/30 border border-white/5 overflow-hidden relative">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 relative"
            initial={{ width: 0 }}
            animate={{ width: `${energyPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
        
        {/* Energy Timer - Always visible */}
        {energyTimeText && (
          <div className="mt-1.5 text-center">
            <p className="text-[9px] text-white/70 font-medium">
              {energyTimeText}
            </p>
          </div>
        )}
      </motion.div>

      {/* Mini-Games Lock Banner */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-500/20 border border-amber-400/40 backdrop-blur-sm rounded-2xl px-4 py-3"
          >
            <div className="flex gap-3 items-start">
              <div className="shrink-0 bg-amber-400/30 rounded-xl p-1.5 mt-0.5">
                <Lock className="w-4 h-4 text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-200 leading-tight">Mini Games Locked</p>
                <p className="text-xs text-amber-300/80 mt-0.5 leading-snug">
                  Water change in progress — games unlock in{' '}
                  <span className="font-semibold text-amber-200">{lockTimeText}</span>
                </p>
              </div>
            </div>
            {/* Unlock with opals */}
            <motion.button
              onClick={opals >= UNLOCK_GAMES_COST ? onUnlockGames : undefined}
              whileTap={opals >= UNLOCK_GAMES_COST ? { scale: 0.96 } : {}}
              disabled={opals < UNLOCK_GAMES_COST}
              className={`mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
                opals >= UNLOCK_GAMES_COST
                  ? 'bg-violet-500/80 hover:bg-violet-500 border-violet-400/50 text-white cursor-pointer'
                  : 'bg-white/10 border-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <span>✨</span>
              <span>Unlock Now — {UNLOCK_GAMES_COST} Opals</span>
              <span className={`ml-auto text-[10px] font-semibold ${opals >= UNLOCK_GAMES_COST ? 'text-violet-200' : 'text-white/30'}`}>
                (you have {opals})
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Solo Games Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl p-2 shadow-md shadow-indigo-500/20">
            <User className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-violet-100 drop-shadow-sm">Solo Games</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {soloGames.map((game, index) => (
            <GameTile
              key={game.id}
              game={game}
              index={index}
              expandedId={expandedId}
              onToggleInfo={toggleInfo}
              onSelectGame={onSelectGame}
              energy={energy}
              isLocked={isLocked}
            />
          ))}
        </div>
      </div>

      {/* Multiplayer Games Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl p-2 shadow-md shadow-rose-500/20">
            <Users className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-rose-100 drop-shadow-sm">Multiplayer Games</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {multiplayerGames.map((game, index) => (
            <GameTile
              key={game.id}
              game={game}
              index={index}
              delayOffset={soloGames.length * 0.05}
              expandedId={expandedId}
              onToggleInfo={toggleInfo}
              onSelectGame={onSelectGame}
              energy={energy}
              isLocked={isLocked}
            />
          ))}
        </div>
      </div>

      {/* Info Box */}
      <motion.div
        className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <p className="text-xs text-white/90 text-center font-medium">
          {energy <= 0 
            ? '⚡ No energy! You can still play for fun, but no XP or coins will be earned. Energy regenerates over time.'
            : '💡 Playing mini-games earns coins and boosts your axolotl\'s stats!'}
        </p>
      </motion.div>
    </div>
  );
}