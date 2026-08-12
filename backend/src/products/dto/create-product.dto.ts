import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  SKU: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  costPrice: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  sellingPrice: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;
}
