import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    reason?: string | null;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    ip?: string | null;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? undefined,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        reason: entry.reason ?? undefined,
        before: entry.before,
        after: entry.after,
        ip: entry.ip ?? undefined,
      },
    });
  }
}
