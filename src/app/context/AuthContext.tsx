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
import { isNativeIOS, nativeOAuthSignIn } from '../services/nativeAuth';

const GUEST_KEY = 'axolotl-guest-mode';

/**
 * Converts a username into a synthetic Supabase-compatible email.
 * e.g. "axolotl_King 99" → "axolotl_king99@play.axolittle.app"
 *
 * NOTE: Email confirmation must be disabled in your Supabase project:
 *   Dashboard → Authentication → Email → "Confirm email" → OFF
 */
function toSyntheticEmail(username: string): string {
  const sanitized = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `${sanitized}@play.axolittle.app`;
}

/** Returns a user-friendly error message for common Supabase auth errors. */
function friendlyError(message: string): string {
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'That username is already taken — try a different one!';
  }
  if (message.includes('Invalid login credentials')) {
    return 'Wrong username or PIN. Give it another go!';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts — wait a moment and try again.';
  }
  return message;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True while auth state is being determined on first mount. */
  isLoading: boolean;
  /** True when the user has explicitly chosen to play without an account. */
  isGuest: boolean;
  /**
   * Creates a new account with a username + password.
   * recoveryEmail is optional but strongly encouraged (used if password is forgotten).
   */
  signUp: (
    username: string,
    password: string,
    recoveryEmail?: string
  ) => Promise<{ error: string | null }>;
  /**
   * Signs into an existing account with a username + password.
   */
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /**
   * Deletes the user's account and all associated data from Supabase
   * via the `delete_my_account` RPC, then signs them out locally and
   * clears the on-device save. Apple Guideline 5.1.1(v) requires
   * in-app account deletion for any app that allows account creation.
   */
  deleteAccount: () => Promise<{ error: string | null }>;
  /** Opts the user into anonymous / local-only play. */
  continueAsGuest: () => void;
  /** Signs in / up via Google OAuth (opens system browser on mobile). */
  signInWithGoogle: () => Promise<{ error: string | null }>;
  /** Signs in / up via Apple OAuth (opens system browser on mobile). */
  signInWithApple: () => Promise<{ error: string | null }>;
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
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (username: string, password: string, recoveryEmail?: string) => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };

      const { error } = await supabase.auth.signUp({
        email: toSyntheticEmail(username),
        password,
        options: {
          data: {
            username,
            recoveryEmail: recoveryEmail?.trim() || null,
          },
        },
      });

      if (error) return { error: friendlyError(error.message) };
      return { error: null };
    },
    [],
  );

  const signIn = useCallback(async (username: string, password: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };

    const { error } = await supabase.auth.signInWithPassword({
      email: toSyntheticEmail(username),
      password,
    });

    if (error) return { error: friendlyError(error.message) };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };

    const { error } = await supabase.rpc('delete_my_account');
    if (error) return { error: friendlyError(error.message) };

    // The server-side RPC removed auth.users; sign out locally and wipe the
    // device save so re-launch starts clean.
    await supabase.auth.signOut();
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem('axolotl-game-state');
    setIsGuest(false);
    return { error: null };
  }, []);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, 'true');
    setIsGuest(true);
  }, []);

  /**
   * Shared OAuth helper.
   *
   * iOS path: uses the ASWebAuthenticationSession bridge in ViewController.swift.
   *   1. Obtain the provider OAuth URL from Supabase without redirecting
   *      (skipBrowserRedirect: true).
   *   2. Hand the URL to the native layer via window.webkit.messageHandlers.axoAuth.
   *   3. Native opens ASWebAuthenticationSession; result comes back as
   *      axolittle-auth://auth/callback?code=...
   *   4. Exchange the PKCE code for a Supabase session.
   *
   * Web path: standard full-page redirect to window.location.origin.
   */
  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'apple') => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };

      if (isNativeIOS()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: 'axolittle-auth://auth/callback',
            skipBrowserRedirect: true,
          },
        });
        if (error || !data.url) {
          return { error: friendlyError(error?.message ?? 'Could not get OAuth URL') };
        }

        try {
          const callbackUrl = await nativeOAuthSignIn(data.url);
          const url = new URL(callbackUrl);

          // PKCE flow (default): exchange authorization code for session
          const code = url.searchParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) return { error: friendlyError(exchangeError.message) };
            return { error: null };
          }

          // Implicit flow fallback: tokens arrive in the hash fragment
          const hash = new URLSearchParams(url.hash.replace('#', ''));
          const access_token  = hash.get('access_token');
          const refresh_token = hash.get('refresh_token');
          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessionError) return { error: friendlyError(sessionError.message) };
            return { error: null };
          }

          return { error: 'OAuth callback did not include a session.' };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // User dismissed the sheet — not a failure
          if (msg === 'cancelled' || msg.toLowerCase().includes('cancel')) return { error: null };
          return { error: friendlyError(msg) };
        }
      }

      // Web: standard redirect
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) return { error: friendlyError(error.message) };
      return { error: null };
    },
    [],
  );

  const signInWithGoogle = useCallback(
    () => signInWithOAuth('google'),
    [signInWithOAuth],
  );

  const signInWithApple = useCallback(
    () => signInWithOAuth('apple'),
    [signInWithOAuth],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isGuest,
        signUp,
        signIn,
        signOut,
        deleteAccount,
        continueAsGuest,
        signInWithGoogle,
        signInWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
