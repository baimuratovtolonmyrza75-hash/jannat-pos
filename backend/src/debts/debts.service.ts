import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayDebtDto } from './dto/pay-debt.dto';

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.debt.findMany({
      include: {
        customer: true,
        sale: {
          include: {
            saleItems: {
              include: { product: true }
            }
          }
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const debt = await this.prisma.debt.findUnique({
      where: { id },
      include: {
        customer: true,
        sale: {
          include: {
            saleItems: {
              include: { product: true }
            }
          }
        },
        payments: {
          include: { createdBy: { select: { id: true, email: true } } }
        },
      },
    });
    if (!debt) throw new NotFoundException('Debt not found');
    return debt;
  }

  async payDebt(id: number, payDto: PayDebtDto, cashierId: number) {
    return this.prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findUnique({ where: { id } });
      if (!debt) throw new NotFoundException('Debt not found');
      if (debt.isPaidOff) throw new BadRequestException('Debt is already paid off');

      const remainingAmount = debt.totalAmount - debt.paidAmount;
      if (payDto.amount > remainingAmount) {
        throw new BadRequestException(`Cannot pay more than remaining debt (${remainingAmount})`);
      }

      const newPaidAmount = debt.paidAmount + payDto.amount;
      const isPaidOff = newPaidAmount >= debt.totalAmount;

      // 1. Record payment
      await tx.debtPayment.create({
        data: {
          debtId: debt.id,
          amount: payDto.amount,
          paymentMethod: payDto.paymentMethod,
          createdById: cashierId,
        }
      });

      // 2. Update debt
      return tx.debt.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          isPaidOff,
        },
        include: {
          customer: true,
          payments: true,
        }
      });
    });
  }
}
