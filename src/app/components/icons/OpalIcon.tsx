export function OpalIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l3.5 7h7L16 14l2.5 7L12 17l-6.5 4L8 14 1.5 9h7z"/>
    </svg>
  );
}
