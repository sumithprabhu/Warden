import { connectDB } from "./db";
import AuditLog from "./models/audit-log";

export async function logAction(params: {
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  metadata?: Record<string, any>;
}) {
  await connectDB();
  return AuditLog.create(params);
}
