import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DebtsService } from './debts.service';
import { PayDebtDto } from './dto/pay-debt.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  findAll() {
    return this.debtsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.debtsService.findOne(+id);
  }

  @Post(':id/pay')
  payDebt(@Param('id') id: string, @Body() payDto: PayDebtDto, @Request() req) {
    return this.debtsService.payDebt(+id, payDto, req.user.userId);
  }
}
