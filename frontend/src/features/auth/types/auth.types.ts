/** Built-in backend roles (`UserRole` enum in the API). */
export type PetsAppApiRole = "admin" | "super_admin" | "member";

/** `user` as `POST /auth/login`, `POST /auth/register` and `GET /auth/profile` answer it. */
export type PetsAppUserResponse = {
  id: string;
  name: string;
  email: string;
  role: PetsAppApiRole;
  roles: PetsAppApiRole[];
  country: string | null;
};

export type LoginRegisterResponse = {
  user: PetsAppUserResponse;
  token: string;
};

/** Body of `POST /auth/register`. `country` is ISO 3166-1 alpha-2. */
export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  country?: string;
};

/** `GET /users/me` (UserProfileDto in the API). */
export type UserProfileResponse = {
  id: string;
  email: string;
  userName: string;
  role: PetsAppApiRole;
  roles: PetsAppApiRole[];
  isBlocked: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

/** `GET /admin/users` and `GET /admin/users/:id` (CompleteUserDto). */
export type AdminUserResponse = {
  id: string;
  email: string;
  userName: string;
  role: PetsAppApiRole;
  roles: PetsAppApiRole[];
  isBlocked: boolean;
  isVerified: boolean;
  country: string | null;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
};

export type AuthModalMode = "sign-in" | "sign-up";
