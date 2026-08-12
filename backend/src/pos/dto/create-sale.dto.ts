import {
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class SaleItemDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  quantity: number;
}

export class CreateSaleDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  customerId?: number;
}
