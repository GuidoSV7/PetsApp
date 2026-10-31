/** @vitest-environment jsdom */
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { clearSession, getPetsAppSession, getSessionEpoch, invalidateSessionOwner, savePetsAppSession, subscribeSession } from "@/stores/auth-session";
const data = { token: "email-token", user: { id: "email", name: "Ada", email: "ada@example.test", role: "member" as const, roles: ["member" as const], country: null } };
beforeEach(() => clearSession());
afterEach(() => clearSession());
it("publishes a new owner epoch after save and clear, with an unsubscribe boundary", () => {
 const observe = vi.fn(() => getPetsAppSession());
 const stop = subscribeSession(observe); const initial = getSessionEpoch();
 savePetsAppSession(data);
 expect(getSessionEpoch()).toBeGreaterThan(initial);
 expect(observe).toHaveReturnedWith(data);
 const saved = getSessionEpoch(); clearSession();
 expect(getSessionEpoch()).toBeGreaterThan(saved);
 expect(observe).toHaveLastReturnedWith(null);
 stop(); const count = observe.mock.calls.length; invalidateSessionOwner();
 expect(observe).toHaveBeenCalledTimes(count);
});
