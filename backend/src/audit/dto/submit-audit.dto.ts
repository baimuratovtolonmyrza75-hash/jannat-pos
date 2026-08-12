import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsInt,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AuditItemInputDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  actualQty: number;
}

export class SubmitAuditDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => AuditItemInputDto)
  items: AuditItemInputDto[];
}
