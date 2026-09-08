// Lightweight session store using a simple in-memory token map.
// For a real production app you would use NextAuth + JWT, this is a demo only.

import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  branch?: string | null;
};

// Use globalThis to survive HMR re-evaluations during dev
const globalForSessions = globalThis as unknown as {
  __cbsSessions?: Map<string, SessionUser>;
};
const sessions: Map<string, SessionUser> =
  globalForSessions.__cbsSessions ?? new Map<string, SessionUser>();
globalForSessions.__cbsSessions = sessions;

export function createSession(user: SessionUser): string {
  const token = crypto.randomUUID() + crypto.randomUUID();
  sessions.set(token, user);
  return token;
}

export function getSession(token: string | null | undefined): SessionUser | null {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

export function destroySession(token: string) {
  sessions.delete(token);
}

export async function authenticate(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await db.user.findFirst({
    where: { email: email.toLowerCase().trim(), active: true },
  });
  if (!user) return null;
  // verify password
  const enc = new TextEncoder().encode(password + "::cbs-salt");
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hash !== user.password) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    branch: user.branch,
  };
}
