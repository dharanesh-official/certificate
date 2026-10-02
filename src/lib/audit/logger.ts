import { prisma } from "@/lib/database/prisma";

export interface LogAuditParams {
  adminId?: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
}

export async function logAuditAction(params: LogAuditParams): Promise<void> {
  try {
    const detailsStr =
      typeof params.details === "object"
        ? JSON.stringify(params.details)
        : params.details || null;

    await prisma.auditLog.create({
      data: {
        admin_id: params.adminId || null,
        admin_email: params.adminEmail || null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        details: detailsStr,
        ip_address: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}
