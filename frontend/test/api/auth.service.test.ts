/** @vitest-environment jsdom */
import { afterEach, expect, it } from "vitest";
import api from "@/lib/axios";
import { clearSession, savePetsAppSession } from "@/stores/auth-session";
afterEach(() => clearSession());
it("sends cookie credentials and preserves email Bearer precedence, with no wallet Bearer", async () => {
 const user = { id: "member", name: "Member", email: "member@example.test", role: "member" as const, roles: ["member" as const], country: null };
 savePetsAppSession({ token: "email", user });
 const inspect: Array<{ credentials: unknown; authorization: unknown }> = [];
 const adapter: NonNullable<import("axios").AxiosRequestConfig["adapter"]> = async (config) => {
   inspect.push({ credentials: config.withCredentials, authorization: config.headers.get("Authorization") });
   return { status: 200, statusText: "OK", headers: {}, data: {}, config };
 };
 await api.get("/auth/profile", { adapter });
 savePetsAppSession({ token: null, method: "stellar", user: { ...user, email: null } });
 await api.get("/auth/profile", { adapter });
 expect(inspect).toEqual([{ credentials: true, authorization: "Bearer email" }, { credentials: true, authorization: undefined }]);
});
