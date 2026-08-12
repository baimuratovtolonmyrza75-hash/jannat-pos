import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;

  /**
   * Positive = add stock, Negative = remove stock
   */
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  adjustment: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
