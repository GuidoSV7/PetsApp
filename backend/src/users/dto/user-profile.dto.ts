/** Profile of the authenticated user: only their own, non-sensitive data. */
export class UserProfileDto {
  id: string;
  email: string;
  userName: string;
  role: string;
  roles: string[];
  isBlocked: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
