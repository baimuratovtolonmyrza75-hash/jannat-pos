import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { name: dto.name } });
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  async findAll(search?: string, categoryId?: number) {
    return this.prisma.product.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { SKU: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { 
        OR: [
          { barcode },
          { SKU: { equals: barcode, mode: 'insensitive' } }
        ]
      },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with barcode or SKU ${barcode} not found`);
    }

    return product;
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    // Generate barcode from SKU: EAN13-like numeric barcode
    const barcode = this.generateBarcode(dto.SKU);

    return this.prisma.product.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        SKU: dto.SKU,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        barcode,
        size: dto.size,
        color: dto.color,
      },
      include: { category: true },
    });
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: `Product #${id} deleted successfully` };
  }

  async getProductMovements(productId: number) {
    // Ensure product exists
    await this.findOne(productId);

    return this.prisma.stockMovement.findMany({
      where: { productId },
      include: {
        createdBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generates a numeric barcode string from SKU.
   * Uses a deterministic hash to produce a 12-digit code.
   * Frontend renders it visually using JsBarcode.
   */
  private generateBarcode(sku: string): string {
    let hash = 0;
    for (let i = 0; i < sku.length; i++) {
      const char = sku.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    // Ensure positive 12-digit number
    const code = Math.abs(hash).toString().padStart(12, '0').slice(0, 12);
    return code;
  }
}
