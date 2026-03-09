# Axolittle

A virtual pet mobile game where players raise an axolotl through four life stages in a customizable aquarium. Features real aquarium care mechanics, mini games tied to level progression, a rebirth and lineage system, and social features.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```
   Or if using pnpm:
   ```bash
   pnpm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   Or with pnpm:
   ```bash
   pnpm dev
   ```

3. **Open in browser:**
   - The dev server will start on `http://localhost:5173` (or another port if 5173 is busy)
   - Open the URL shown in your terminal
   - The game will load in your browser - no mobile device needed for development

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🎮 Testing the Game

### First Time Setup
1. When you first open the game, you'll see the welcome screen
2. Enter a name for your axolotl
3. Click "Start Your Journey" to begin

### Key Features to Test

**Core Gameplay:**
- **Feeding**: Tap the Feed button to drop food. Your axolotl will swim to it.
- **Care Actions**: Use Playtime, Clean, and Water buttons to maintain wellbeing stats
- **Stats**: Watch hunger, happiness, cleanliness, and water quality decay over time
- **Evolution**: Your axolotl progresses through Baby → Juvenile → Adult → Elder stages based on XP/Level

**Mini Games:**
- Navigate to the Games screen (tap the gamepad icon)
- Play any of 8 mini-games:
  - **Solo**: Keepey Upey, Flappy Fish Hooks, Axolotl Stacker, Treasure Hunt Cave, Math Rush, Coral Code
  - **Multiplayer**: Fishing (2P), Bite Tag (4P) - uses bots in v1
- Each game costs 1 energy. Energy regenerates over time.
- Earn XP, coins, and occasionally opals based on performance

**Eggs & Breeding:**
- Reach Elder stage (Level 30-40) to unlock Rebirth
- Rebirth creates an egg that incubates for 24 hours
- Visit the Eggs panel (hamburger menu) to view eggs
- Use Boost (3 opals) to instantly hatch, or wait for natural incubation
- Breed with friends in the Social screen (mock friends available)

**Shop & Customization:**
- Buy decorations, filters, and food in the Shop
- Customize your aquarium background and add decorations
- Premium items cost Opals (premium currency)

### Game State
- All progress is saved automatically to `localStorage`
- To reset: Use Settings → Reset Game, or clear browser localStorage
- Game state persists between browser sessions

## 📁 Project Structure

```
src/
├── app/
│   ├── components/     # React components (UI, modals, displays)
│   ├── config/         # Game configuration constants
│   ├── data/           # Static data (decorations, notifications)
│   ├── minigames/      # All 8 mini-game implementations
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Game logic, storage, helpers
│   └── App.tsx         # Main application component
└── index.html          # Entry point
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Motion (Framer Motion)** - Animations
- **Tailwind CSS** - Styling
- **localStorage** - Game state persistence

## 📝 Development Notes

- **No Figma Dependencies**: All visuals are CSS/SVG-based (no external image assets)
- **Mobile-First**: Designed for 7-14 year olds, works on desktop for development
- **Energy System**: Games cost 1 energy. Energy regenerates at 1 per hour (configurable in `config/game.ts`)
- **XP/Level System**: Level 2 = 10 XP, then +5 XP per level. Stages: Baby (L1-9), Juvenile (L10-19), Adult (L20-29), Elder (L30-40)

## 🐛 Troubleshooting

**Port already in use:**
- Vite will automatically try the next available port
- Check the terminal output for the actual URL

**Game not loading:**
- Clear browser cache and localStorage
- Check browser console for errors
- Ensure all dependencies are installed (`npm install`)

**State not persisting:**
- Check that localStorage is enabled in your browser
- Game state saves automatically every 5 seconds

## 📚 Original Design

The original Figma design is available at: https://www.figma.com/design/6XgrvWp8GyW3DQzUsSyawD/Axolittle

Game mechanics and design documentation are in the `Axolittle Game Design/` folder.
