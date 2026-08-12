import { IsInt, IsPositive, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockEntryDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPrice: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sellingPrice: number;
}
