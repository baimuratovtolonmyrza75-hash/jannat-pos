import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Process a sale with full ACID transaction:
   * 1. Fetch all products (with FOR UPDATE semantics via transaction isolation)
   * 2. Validate sufficient stock for all items
   * 3. Atomically decrement stock for each item
   * 4. Record sale with price snapshots (priceAtSale, costPriceAtSale)
   * 5. Return sale record
   *
   * This prevents race conditions: two concurrent scans of the same item
   * can't both succeed if stock would go below 0.
   */
  async createSale(dto: CreateSaleDto, cashierId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        // Step 1: Fetch all products needed for this sale
        const productIds = dto.items.map((i) => i.productId);

        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          const foundIds = products.map((p) => p.id);
          const missingIds = productIds.filter((id) => !foundIds.includes(id));
          throw new NotFoundException(
            `Products not found: ${missingIds.join(', ')}`,
          );
        }

        if (dto.paymentMethod === 'DEBT' && !dto.customerId) {
          throw new BadRequestException('Customer ID is required for debt sales');
        }

        // Step 2: Build a map for quick lookup and validate stock
        const productMap = new Map(products.map((p) => [p.id, p]));

        for (const item of dto.items) {
          const product = productMap.get(item.productId)!;
          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
            );
          }
        }

        // Step 3: Atomically decrement stock for each product
        // Using updateMany with atomic decrement to avoid read-then-write races
        for (const item of dto.items) {
          const product = productMap.get(item.productId)!;

          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity }, // Re-check stock at write time
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (updated.count === 0) {
            throw new BadRequestException(
              `Race condition detected: Insufficient stock for "${product.name}". Please try again.`,
            );
          }
        }

        // Step 4: Calculate totals using price snapshots
        let totalAmount = 0;
        let totalProfit = 0;

        const saleItemsData: Prisma.SaleItemCreateManySaleInput[] = dto.items.map(
          (item) => {
            const product = productMap.get(item.productId)!;
            const lineTotal = product.sellingPrice * item.quantity;
            const lineProfit =
              (product.sellingPrice - product.costPrice) * item.quantity;

            totalAmount += lineTotal;
            totalProfit += lineProfit;

            return {
              productId: item.productId,
              quantity: item.quantity,
              priceAtSale: product.sellingPrice,     // SNAPSHOT
              costPriceAtSale: product.costPrice,     // SNAPSHOT
            };
          },
        );

        // Step 5: Create the sale record
        const sale = await tx.sale.create({
          data: {
            cashierId,
            customerId: dto.customerId,
            paymentMethod: dto.paymentMethod,
            totalAmount,
            totalProfit,
            saleItems: {
              createMany: { data: saleItemsData },
            },
            ...(dto.paymentMethod === 'DEBT' && {
              debt: {
                create: {
                  customerId: dto.customerId!,
                  totalAmount,
                },
              },
            }),
          },
          include: {
            saleItems: {
              include: {
                product: { select: { id: true, name: true, SKU: true } },
              },
            },
            customer: true,
          },
        });

        // Step 6: Record StockMovements for the sale
        for (const item of sale.saleItems) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'SALE',
              quantity: -item.quantity, // Negative for outgoing
              referenceId: item.id,
              createdById: cashierId,
            },
          });
        }

        return sale;
      },
      {
        // Serializable isolation to prevent phantom reads / concurrent stock decrement
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000,
      },
    );
  }

  async getSalesHistory(cashierId?: number, startDate?: Date, endDate?: Date) {
    return this.prisma.sale.findMany({
      where: {
        ...(cashierId && { cashierId }),
        ...(startDate &&
          endDate && { createdAt: { gte: startDate, lte: endDate } }),
      },
      include: {
        cashier: { select: { id: true, email: true } },
        saleItems: {
          include: {
            product: { select: { id: true, name: true, SKU: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSaleById(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, email: true } },
        saleItems: {
          include: {
            product: {
              select: { id: true, name: true, SKU: true, barcode: true },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale #${id} not found`);
    }

    return sale;
  }
}
