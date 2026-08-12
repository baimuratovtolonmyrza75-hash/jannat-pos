import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { SubmitAuditDto } from './dto/submit-audit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll() {
    return this.auditService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.findOne(id);
  }

  @Post('start')
  startAudit(@CurrentUser('id') userId: number) {
    return this.auditService.startAudit(userId);
  }

  @Post(':id/submit')
  submitAudit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitAuditDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.auditService.submitAudit(id, dto, userId);
  }
}
