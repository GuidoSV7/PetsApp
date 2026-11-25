import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * S11 list query. `limit` defaults to 100 and caps at 200, `offset` starts
 * at 0; both are integers (non-numeric values answer 400).
 */
export class ListUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value : undefined))
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  offset?: number;
}
