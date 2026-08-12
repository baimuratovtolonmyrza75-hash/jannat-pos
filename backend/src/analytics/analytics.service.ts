import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(startDate?: Date, endDate?: Date) {
    const dateFilter =
      startDate && endDate
        ? { gte: startDate, lte: endDate }
        : undefined;

    // Run all queries in parallel for performance
    const [
      salesAggregate,
      salesCount,
      totalExpenses,
      stockValue,
      topProducts,
      recentSales,
    ] = await Promise.all([
      // Revenue + Profit from sales
      this.prisma.sale.aggregate({
        where: dateFilter ? { createdAt: dateFilter } : {},
        _sum: { totalAmount: true, totalProfit: true },
      }),

      // Total transactions count
      this.prisma.sale.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),

      // Total expenses
      this.prisma.expense.aggregate({
        where: dateFilter ? { createdAt: dateFilter } : {},
        _sum: { amount: true },
      }),

      // Current total stock value (cost basis)
      this.prisma.product.aggregate({
        _sum: { stock: true },
      }),

      // Top 10 selling products by quantity
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: dateFilter
          ? { sale: { createdAt: dateFilter } }
          : {},
        _sum: { quantity: true, priceAtSale: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),

      // Recent 10 sales
      this.prisma.sale.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        include: {
          cashier: { select: { id: true, email: true } },
          _count: { select: { saleItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Enrich top products with names
    const productIds = topProducts.map((tp) => tp.productId);
    const productDetails = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, SKU: true },
    });

    const productMap = new Map(productDetails.map((p) => [p.id, p]));

    const enrichedTopProducts = topProducts.map((tp) => ({
      ...tp,
      product: productMap.get(tp.productId),
    }));

    // Calculate stock value in cost price terms
    const stockValueCalc = await this.prisma.product.findMany({
      select: { stock: true, costPrice: true },
    });

    const totalStockValue = stockValueCalc.reduce(
      (acc, p) => acc + p.stock * p.costPrice,
      0,
    );

    const totalRevenue = salesAggregate._sum.totalAmount ?? 0;
    const totalProfit = salesAggregate._sum.totalProfit ?? 0;
    const totalExpenseAmount = totalExpenses._sum.amount ?? 0;
    const netProfit = totalProfit - totalExpenseAmount;

    return {
      period: { startDate, endDate },
      revenue: totalRevenue,
      grossProfit: totalProfit,
      expenses: totalExpenseAmount,
      netProfit,
      salesCount,
      totalStockValue,
      topProducts: enrichedTopProducts,
      recentSales,
    };
  }

  async getSalesByDay(startDate: Date, endDate: Date) {
    // Raw SQL for efficient date-based grouping
    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        createdAt: true,
        totalAmount: true,
        totalProfit: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date string
    const grouped: Record<string, { revenue: number; profit: number; count: number }> = {};

    for (const sale of sales) {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { revenue: 0, profit: 0, count: 0 };
      }
      grouped[dateKey].revenue += sale.totalAmount;
      grouped[dateKey].profit += sale.totalProfit;
      grouped[dateKey].count += 1;
    }

    return Object.entries(grouped).map(([date, data]) => ({ date, ...data }));
  }

  async getDetailedSales(startDate?: Date, endDate?: Date) {
    const dateFilter =
      startDate && endDate ? { gte: startDate, lte: endDate } : undefined;

    return this.prisma.sale.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      include: {
        cashier: { select: { id: true, email: true } },
        saleItems: {
          include: {
            product: { select: { name: true, SKU: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDetailedStockValue() {
    const products = await this.prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        SKU: true,
        stock: true,
        costPrice: true,
        sellingPrice: true,
      },
    });

    return products
      .map((p) => ({
        ...p,
        totalValue: p.stock * p.costPrice,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }
}
