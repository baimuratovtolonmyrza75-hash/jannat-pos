import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  categoryId?: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  costPrice?: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  sellingPrice?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;
}
