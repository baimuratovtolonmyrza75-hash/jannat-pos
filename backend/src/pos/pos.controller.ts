import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  /**
   * POST /pos/sales — Create a sale (CASHIER, ADMIN, OWNER)
   * This is the hot path: must respond <100ms under normal load.
   */
  @Roles(Role.OWNER, Role.ADMIN, Role.CASHIER)
  @Post('sales')
  createSale(
    @Body() dto: CreateSaleDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.posService.createSale(dto, userId);
  }

  /**
   * GET /pos/sales — History (OWNER and ADMIN see all, CASHIER sees own)
   */
  @Roles(Role.OWNER, Role.ADMIN, Role.CASHIER)
  @Get('sales')
  getSales(
    @CurrentUser() user: { id: number; role: Role },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Cashiers can only see their own sales
    const cashierId =
      user.role === Role.CASHIER ? user.id : undefined;

    return this.posService.getSalesHistory(
      cashierId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.CASHIER)
  @Get('sales/:id')
  getSaleById(@Param('id', ParseIntPipe) id: number) {
    return this.posService.getSaleById(id);
  }
}
