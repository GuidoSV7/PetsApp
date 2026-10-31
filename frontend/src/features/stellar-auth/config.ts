export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export type StellarConfig = { serverAccount: string; homeDomain: string; webAuthDomain: string };

export function isStellarConfigured(config = getStellarConfig()) {
  const domain = /^(?=.{1,253}$)[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
  return /^G[A-Z2-7]{55}$/.test(config.serverAccount) && domain.test(config.homeDomain) && domain.test(config.webAuthDomain);
}

/** Independently deployed public trust roots; never populated from a challenge/wallet. */
export function getStellarConfig(): StellarConfig {
  return {
    serverAccount: process.env.NEXT_PUBLIC_STELLAR_AUTH_SERVER_ACCOUNT ?? "",
    homeDomain: process.env.NEXT_PUBLIC_STELLAR_HOME_DOMAIN ?? "",
    webAuthDomain: process.env.NEXT_PUBLIC_STELLAR_WEB_AUTH_DOMAIN ?? "",
  };
}
