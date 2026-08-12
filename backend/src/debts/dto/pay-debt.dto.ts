import { IsNumber, IsPositive, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PayDebtDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
