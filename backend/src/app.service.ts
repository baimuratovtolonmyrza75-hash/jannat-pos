import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async ping(): Promise<{ status: string; timestamp: Date }> {
    // Simple query to wake up/keep alive the Neon DB connection
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date() };
  }
}
