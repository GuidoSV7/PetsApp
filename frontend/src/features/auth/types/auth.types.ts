export type PetsAppApiRole = "admin" | "merchant";

export type PetsAppUserResponse = {
  id: string;
  fullName: string;
  email: string;
  role: PetsAppApiRole;
  country: string;
  walletAddress: string | null;
  isVerified?: boolean;
  isActive?: boolean;
};

export type LoginRegisterResponse = {
  user: PetsAppUserResponse;
  token: string;
};

export type AuthModalMode = "sign-in" | "sign-up";
