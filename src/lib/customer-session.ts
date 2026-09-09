// Customer portal session store — separate from staff sessions.
// Customers access the mobile-app balance enquiry portal with phone + MPIN.

export type CustomerSession = {
  id: string;
  customerNo: string;
  name: string;
  phone: string;
};

const globalForCustomerSessions = globalThis as unknown as {
  __cbsCustomerSessions?: Map<string, CustomerSession>;
};
const sessions: Map<string, CustomerSession> =
  globalForCustomerSessions.__cbsCustomerSessions ?? new Map<string, CustomerSession>();
globalForCustomerSessions.__cbsCustomerSessions = sessions;

export function createCustomerSession(c: CustomerSession): string {
  const token = crypto.randomUUID() + crypto.randomUUID();
  sessions.set(token, c);
  return token;
}

export function getCustomerSession(token: string | null | undefined): CustomerSession | null {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

export function destroyCustomerSession(token: string) {
  sessions.delete(token);
}
