import { Controller, Get, Query, UseGuards, Post, Body, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, ExpenseCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNumber, IsPositive, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDashboardMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('sales-by-day')
  getSalesByDay(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getSalesByDay(
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ─── Detailed Reports ──────────────────────────────────────────────────────

  @Get('reports/sales')
  getDetailedSales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDetailedSales(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('reports/stock')
  getDetailedStockValue() {
    return this.analyticsService.getDetailedStockValue();
  }

  // ─── Expenses (OWNER-only) ────────────────────────────────────────────────

  @Get('expenses')
  getExpenses() {
    return this.prisma.expense.findMany({
      include: { createdBy: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('expenses')
  createExpense(
    @Body() dto: CreateExpenseDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.prisma.expense.create({
      data: {
        title: dto.title,
        amount: dto.amount,
        category: dto.category || ExpenseCategory.OTHER,
        createdById: userId,
      },
    });
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
