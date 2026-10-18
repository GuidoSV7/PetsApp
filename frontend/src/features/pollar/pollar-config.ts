/** Pollar publishable key from env (safe in the browser). */
export function pollarPublishableKey(): string {
  return process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY?.trim() ?? "";
}

export function isPollarConfigured(): boolean {
  return pollarPublishableKey().length > 0;
}

/** Network inferred from key prefix, same idea as Tinkazo. */
export function pollarNetwork(): "testnet" | "mainnet" {
  const key = pollarPublishableKey();
  if (key.startsWith("pub_mainnet_")) return "mainnet";
  return "testnet";
}
