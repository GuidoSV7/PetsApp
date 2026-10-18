import type { WalletInfo } from "@pollar/core";

type ProfileLike = {
  mail?: string;
  first_name?: string;
  last_name?: string;
} | null;

/** Short label for the header after a Pollar login. */
export function pollarDisplayName(
  profile: ProfileLike,
  wallet: Pick<WalletInfo, "address"> | null | undefined,
): string {
  const name = [profile?.first_name, profile?.last_name]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();
  if (name) return name;

  const mail = profile?.mail?.trim();
  if (mail) {
    const local = mail.split("@")[0]?.trim();
    if (local) return local;
  }

  const address = wallet?.address?.trim();
  if (address && address.length >= 8) {
    return `${address.slice(0, 4)}…${address.slice(-4)}`;
  }
  if (address) return address;

  return "Michi";
}
