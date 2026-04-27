/**
 * ASWebAuthenticationSession bridge for the iOS WKWebView wrapper.
 *
 * Flow:
 *  1. JS calls supabase.auth.signInWithOAuth({ skipBrowserRedirect: true })
 *     to obtain the provider OAuth URL without triggering a page redirect.
 *  2. JS passes that URL to nativeOAuthSignIn(), which posts it to the Swift
 *     message handler registered as window.webkit.messageHandlers.axoAuth.
 *  3. Swift opens ASWebAuthenticationSession. The user authenticates in the
 *     system browser (shared cookies, Face ID, Passkeys).
 *  4. The provider redirects to axolittle-auth://auth/callback?code=...
 *     ASWebAuthenticationSession intercepts the URL and passes it back to Swift.
 *  5. Swift calls window._axoOAuthCallback(callbackUrl, null) (or null, error).
 *  6. JS resolves the Promise and calls supabase.auth.exchangeCodeForSession(code).
 */

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        axoAuth?: { postMessage: (msg: Record<string, string>) => void };
      };
    };
    _axoOAuthCallback?: (callbackUrl: string | null, error: string | null) => void;
  }
}

/** True when running inside the iOS WKWebView wrapper with the auth bridge wired up. */
export function isNativeIOS(): boolean {
  return typeof window !== 'undefined' && !!window.webkit?.messageHandlers?.axoAuth;
}

/**
 * Opens the OAuth provider page via ASWebAuthenticationSession and resolves
 * with the full callback URL (axolittle-auth://auth/callback?code=...).
 * Rejects if the user cancels or an error occurs.
 */
export function nativeOAuthSignIn(oauthUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    window._axoOAuthCallback = (callbackUrl, error) => {
      window._axoOAuthCallback = undefined;
      if (error || !callbackUrl) {
        reject(new Error(error ?? 'OAuth cancelled'));
      } else {
        resolve(callbackUrl);
      }
    };
    window.webkit!.messageHandlers!.axoAuth!.postMessage({ url: oauthUrl });
  });
}
