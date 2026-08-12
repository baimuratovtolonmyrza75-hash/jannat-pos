import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getAllStockEntries(productId?: number) {
    return this.prisma.stockEntry.findMany({
      where: productId ? { productId } : {},
      include: {
        product: { select: { id: true, name: true, SKU: true } },
        createdBy: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Receive goods: create a stock entry, atomically increment product stock,
   * recalculate average cost price, and record a stock movement.
   */
  async receiveStock(dto: CreateStockEntryDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product #${dto.productId} not found`);
      }

      // Calculate new average cost price
      const totalCurrentValue = product.stock * product.costPrice;
      const totalNewValue = dto.quantity * dto.costPrice;
      const newTotalStock = product.stock + dto.quantity;
      const newAverageCost = newTotalStock > 0 
        ? (totalCurrentValue + totalNewValue) / newTotalStock 
        : dto.costPrice;

      const stockEntry = await tx.stockEntry.create({
        data: {
          productId: dto.productId,
          quantity: dto.quantity,
          costPrice: dto.costPrice,
          sellingPrice: dto.sellingPrice,
          createdById: userId,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          type: 'RECEIVE',
          quantity: dto.quantity,
          referenceId: stockEntry.id,
          createdById: userId,
        },
      });

      await tx.product.update({
        where: { id: dto.productId },
        data: {
          stock: newTotalStock,
          costPrice: newAverageCost,
          sellingPrice: dto.sellingPrice,
        },
      });

      return stockEntry;
    });
  }

  /**
   * Manual stock adjustment (can be positive or negative)
   */
  async adjustStock(dto: AdjustStockDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product #${dto.productId} not found`);
      }

      const newStock = product.stock + dto.adjustment;

      if (newStock < 0) {
        throw new BadRequestException(
          `Cannot adjust stock below 0. Current stock: ${product.stock}, adjustment: ${dto.adjustment}`,
        );
      }

      // Create a stock movement for the manual adjustment
      await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          type: 'AUDIT_ADJUSTMENT',
          quantity: dto.adjustment,
          createdById: userId,
        },
      });

      return tx.product.update({
        where: { id: dto.productId },
        data: { stock: newStock },
        include: { category: true },
      });
    });
  }

  async getLowStockProducts(threshold = 5) {
    return this.prisma.product.findMany({
      where: { stock: { lte: threshold } },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });
  }
}
