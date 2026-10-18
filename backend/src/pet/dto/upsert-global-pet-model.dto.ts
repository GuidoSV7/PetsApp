import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class UpsertGlobalPetModelDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.2)
  @Max(2.5)
  modelScale!: number;
}
