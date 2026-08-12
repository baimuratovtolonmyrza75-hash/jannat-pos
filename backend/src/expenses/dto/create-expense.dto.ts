import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;
}
