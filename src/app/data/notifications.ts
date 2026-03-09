export interface GameNotification {
  id: string;
  type: 'poke' | 'evolution' | 'gift' | 'friend' | 'milestone';
  emoji: string;
  message: string;
  time: string;
  read: boolean;
}

export const INITIAL_NOTIFICATIONS: GameNotification[] = [
  { id: 'n1', type: 'poke', emoji: '👉', message: 'Bubbles poked you!', time: '2m ago', read: false },
  { id: 'n2', type: 'gift', emoji: '🎁', message: 'Coral sent you 10 coins', time: '15m ago', read: false },
  { id: 'n3', type: 'milestone', emoji: '🏆', message: 'You reached Level 5!', time: '1h ago', read: true },
  { id: 'n4', type: 'friend', emoji: '🤝', message: 'Nemo accepted your request', time: '3h ago', read: true },
];
