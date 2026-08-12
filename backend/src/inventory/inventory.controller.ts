import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('entries')
  getEntries(@Query('productId') productId?: string) {
    return this.inventoryService.getAllStockEntries(
      productId ? +productId : undefined,
    );
  }

  @Get('low-stock')
  getLowStock(@Query('threshold') threshold?: string) {
    return this.inventoryService.getLowStockProducts(
      threshold ? +threshold : 5,
    );
  }

  @Post('receive')
  receiveStock(
    @Body() dto: CreateStockEntryDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.inventoryService.receiveStock(dto, userId);
  }

  @Post('adjust')
  adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.inventoryService.adjustStock(dto, userId);
  }
}
