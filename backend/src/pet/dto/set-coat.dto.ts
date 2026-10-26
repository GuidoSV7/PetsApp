import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { COAT_PATTERNS, type CoatPattern } from '../pet-rules.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

export class SetCoatDto {
  @IsString()
  @Matches(HEX)
  primary!: string;

  @IsString()
  @Matches(HEX)
  secondary!: string;

  @IsString()
  @Matches(HEX)
  accent!: string;

  @IsOptional()
  @IsIn(COAT_PATTERNS)
  pattern?: CoatPattern;
}
