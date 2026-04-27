import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence } from 'motion/react';
import App from './app/App';
import { AuthProvider } from './app/context/AuthContext';
import { LoadingScreen } from './app/components/LoadingScreen';
import './styles/index.css';

// Guarantees the loading screen is visible for at least 1 second on every
// fresh open, regardless of how quickly auth and game state resolve.
// AnimatePresence lives here (above App) so it stays mounted across the
// transition and can play the exit animation when the overlay disappears.
function Root() {
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSplashVisible(false), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <AuthProvider>
        <App />
      </AuthProvider>
      <AnimatePresence>
        {splashVisible && <LoadingScreen key="splash" />}
      </AnimatePresence>
    </>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
