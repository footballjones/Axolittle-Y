import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const GUEST_KEY = 'axolotl-guest-mode';

interface AuthContextValue {
  /** Authenticated user, or null if signed out / not yet loaded. */
  user: User | null;
  session: Session | null;
  /** True while auth state is being determined on first mount. */
  isLoading: boolean;
  /** True when user has explicitly chosen to play without an account. */
  isGuest: boolean;
  /**
   * Sends a magic-link email.
   * Returns { error: string } on failure or { error: null } on success.
   */
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Opts the user into anonymous / local-only play. */
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(
    () => localStorage.getItem(GUEST_KEY) === 'true',
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // No credentials — treat as guest automatically, skip auth loading.
      setIsLoading(false);
      return;
    }

    // Retrieve the existing session (if any) on first mount.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Keep the context in sync with auth state changes (sign-in via magic link, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, 'true');
    setIsGuest(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, isGuest, signInWithEmail, signOut, continueAsGuest }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
