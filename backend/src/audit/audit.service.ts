import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitAuditDto } from './dto/submit-audit.dto';
import { AuditStatus } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.audit.findMany({
      include: {
        createdBy: { select: { id: true, email: true } },
        _count: { select: { auditItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const audit = await this.prisma.audit.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, email: true } },
        auditItems: {
          include: {
            product: {
              select: { id: true, name: true, SKU: true, barcode: true },
            },
          },
        },
      },
    });

    if (!audit) {
      throw new NotFoundException(`Audit #${id} not found`);
    }

    return audit;
  }

  /**
   * Start a new audit: creates an Audit in IN_PROGRESS status.
   * Pre-populates AuditItems with expectedQty from current DB stock.
   */
  async startAudit(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Check no other audit is in progress
      const existing = await tx.audit.findFirst({
        where: { status: AuditStatus.IN_PROGRESS },
      });

      if (existing) {
        throw new BadRequestException(
          `An audit is already in progress (ID: ${existing.id}). Complete it before starting a new one.`,
        );
      }

      const allProducts = await tx.product.findMany({
        select: { id: true, stock: true },
      });

      const audit = await tx.audit.create({
        data: {
          createdById: userId,
          status: AuditStatus.IN_PROGRESS,
          auditItems: {
            createMany: {
              data: allProducts.map((p) => ({
                productId: p.id,
                expectedQty: p.stock,
                actualQty: 0,
                difference: -p.stock, // Will be recalculated on submit
              })),
            },
          },
        },
        include: {
          auditItems: {
            include: {
              product: {
                select: { id: true, name: true, SKU: true, barcode: true, stock: true },
              },
            },
          },
        },
      });

      return audit;
    });
  }

  /**
   * Submit audit results: update actual quantities and calculate discrepancies.
   * Apply stock corrections as adjustments and record movements.
   */
  async submitAudit(id: number, dto: SubmitAuditDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const audit = await tx.audit.findUnique({
        where: { id },
        include: { auditItems: true },
      });

      if (!audit) {
        throw new NotFoundException(`Audit #${id} not found`);
      }

      if (audit.status === AuditStatus.COMPLETED) {
        throw new BadRequestException(`Audit #${id} is already completed`);
      }

      // Update each audit item with actual quantities
      for (const item of dto.items) {
        const auditItem = audit.auditItems.find(
          (ai) => ai.productId === item.productId,
        );

        if (!auditItem) {
          throw new NotFoundException(
            `Product #${item.productId} not found in this audit`,
          );
        }

        const difference = item.actualQty - auditItem.expectedQty;

        await tx.auditItem.update({
          where: { id: auditItem.id },
          data: {
            actualQty: item.actualQty,
            difference,
          },
        });

        // Apply stock correction to match physical count
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: item.actualQty },
        });

        // If there is a difference, record the stock movement
        if (difference !== 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'AUDIT_ADJUSTMENT',
              quantity: difference,
              referenceId: auditItem.id,
              createdById: userId,
            },
          });
        }
      }

      // Mark audit as completed
      return tx.audit.update({
        where: { id },
        data: {
          status: AuditStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: {
          auditItems: {
            include: {
              product: { select: { id: true, name: true, SKU: true } },
            },
          },
        },
      });
    });
  }
}
