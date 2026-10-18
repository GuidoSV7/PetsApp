import { IsString, Matches } from 'class-validator';

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
}
