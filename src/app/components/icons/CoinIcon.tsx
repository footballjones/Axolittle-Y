export function CoinIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="8"/>
      <path d="M12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-4"/>
    </svg>
  );
}
