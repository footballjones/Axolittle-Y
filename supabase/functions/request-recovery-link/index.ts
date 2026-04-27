/**
 * request-recovery-link — sends a Supabase password-recovery link to the
 * `recoveryEmail` stored in a user's auth metadata.
 *
 * Why a custom function: our auth model uses synthetic emails
 * (`<username>@play.axolittle.app`) for sign-in, so Supabase's built-in
 * `resetPasswordForEmail` would address the wrong inbox. This function
 * mints a real recovery link via `auth.admin.generateLink({ type: 'recovery' })`
 * tied to the user's auth row, then sends it to the recoveryEmail the
 * user provided at sign-up via Resend.
 *
 * Security:
 *  - Always returns the same generic success message regardless of whether
 *    the username exists or has a recovery email on file (no enumeration).
 *  - Service role key never leaves the function.
 *  - Rate-limit at the project level (Supabase default) — caller can also
 *    add per-IP limits in front if abuse becomes a problem.
 *
 * Required Supabase function secrets:
 *   SUPABASE_URL              (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 *   APP_URL                   target SPA origin used as redirectTo
 *   RESEND_API_KEY            Resend API key (https://resend.com)
 *   RECOVERY_FROM_EMAIL       verified sender, e.g. noreply@axolittle.app
 *
 * Without RESEND_API_KEY the function still returns success but logs the
 * link to the function logs — useful for staging/dev where no mail is set up.
 */

// @ts-nocheck — Deno runtime, not part of the Vite/TypeScript build.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://axolittle.app';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('RECOVERY_FROM_EMAIL') ?? 'noreply@axolittle.app';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/** Generic, non-leaky success payload. Returned in every non-error path. */
const SUCCESS_PAYLOAD = {
  ok: true,
  message:
    "If an account with that username has a recovery email on file, we've just sent a reset link. " +
    'Check your inbox (and spam folder).',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { username?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const username = String(body.username ?? '').trim();
  if (!USERNAME_RE.test(username)) {
    return json({ error: 'Invalid username' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Find user by metadata.username. listUsers is paginated; iterate up to a
  // reasonable cap. For larger user bases, replace with a profiles-table
  // index lookup (profiles already stores `username`).
  const user = await findUserByUsername(admin, username);
  if (!user) return json(SUCCESS_PAYLOAD);

  const recoveryEmail = (user.user_metadata?.recoveryEmail as string | null) ?? null;
  const authEmail = user.email;
  if (!recoveryEmail || !authEmail) return json(SUCCESS_PAYLOAD);

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: authEmail,
    options: { redirectTo: APP_URL },
  });
  const link = linkData?.properties?.action_link;
  if (linkErr || !link) {
    console.error('[recovery] generateLink failed', linkErr);
    return json(SUCCESS_PAYLOAD);
  }

  if (!RESEND_API_KEY) {
    console.info(`[recovery] (no RESEND_API_KEY) ${recoveryEmail}: ${link}`);
    return json(SUCCESS_PAYLOAD);
  }

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: recoveryEmail,
      subject: 'Reset your Axolittle password',
      html: emailHtml(username, link),
      text: emailText(username, link),
    }),
  });
  if (!sendRes.ok) {
    console.error('[recovery] Resend send failed', sendRes.status, await sendRes.text());
  }

  return json(SUCCESS_PAYLOAD);
});

async function findUserByUsername(admin: ReturnType<typeof createClient>, username: string) {
  const lower = username.toLowerCase();
  const PER_PAGE = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error || !data) return null;
    const hit = data.users.find((u) => {
      const u_name = (u.user_metadata?.username as string | undefined)?.toLowerCase();
      return u_name === lower;
    });
    if (hit) return hit;
    if (data.users.length < PER_PAGE) break;
  }
  return null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailHtml(username: string, link: string): string {
  const u = htmlEscape(username);
  const l = htmlEscape(link);
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;">
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
    <h2 style="color:#0e7490;margin:0 0 16px 0;">Reset your Axolittle password</h2>
    <p style="font-size:15px;line-height:1.55;color:#222;">Hi <strong>${u}</strong>, we got a request to reset your password. Tap the button below to choose a new one:</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${l}" style="background:#0e7490;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">Reset password</a>
    </p>
    <p style="font-size:13px;color:#555;line-height:1.5;">If you didn't request this, you can ignore this email — your password won't change.</p>
    <p style="font-size:11px;color:#999;margin-top:32px;">This link expires in 1 hour.</p>
  </div>
</body></html>`;
}

function emailText(username: string, link: string): string {
  return [
    'Reset your Axolittle password',
    '',
    `Hi ${username},`,
    '',
    'We got a request to reset your password. Use this link to choose a new one:',
    '',
    link,
    '',
    "If you didn't request this, you can ignore this email — your password won't change.",
    '',
    'This link expires in 1 hour.',
  ].join('\n');
}
