import * as LucideIcons from 'lucide-react';

interface GameIconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export function GameIcon({ name, size = 18, className = '', color }: GameIconProps) {
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string; color?: string }>>)[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} className={className} color={color} />;
}
