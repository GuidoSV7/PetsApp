/** @vitest-environment jsdom */
import { expect, it } from "vitest";
import { bindSessionQueryClient, createAppQueryClient } from "@/lib/query-client";
import { clearSession, savePetsAppSession } from "@/stores/auth-session";
it("cancels and removes old-owner queries on session change, fencing late results", async () => {
 const client = createAppQueryClient(); const stop = bindSessionQueryClient(client);
 client.setQueryData(["previous-owner"], { name: "Previous" });
 let resolve!: (value: string) => void;
 const late = client.fetchQuery({ queryKey: ["late"], queryFn: () => new Promise<string>((done) => { resolve = done; }) }).catch(() => undefined);
 savePetsAppSession({ token: "next", user: { id: "next", name: "Next", email: "next@example.test", role: "member", roles: ["member"], country: null } });
 expect(client.getQueryData(["previous-owner"])).toBeUndefined();
 resolve("Previous late result"); await late;
 expect(client.getQueryData(["late"])).toBeUndefined();
 stop(); client.setQueryData(["unbound"], 1); clearSession();
 expect(client.getQueryData(["unbound"])).toBe(1); client.clear();
});
