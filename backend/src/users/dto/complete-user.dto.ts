/** Full user view for administrators. Never carries the password hash. */
export class CompleteUserDto {
  id: string;
  email: string | null;
  userName: string;
  role: string;
  roles: string[];
  isBlocked: boolean;
  isVerified: boolean;
  country: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
}
