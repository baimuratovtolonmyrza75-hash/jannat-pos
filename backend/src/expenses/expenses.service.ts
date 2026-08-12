import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.expense.findMany({
      include: {
        createdBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateExpenseDto, userId: number) {
    return this.prisma.expense.create({
      data: {
        ...dto,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, email: true } },
      },
    });
  }

  async remove(id: number) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    await this.prisma.expense.delete({ where: { id } });
    return { message: 'Expense deleted' };
  }
}
