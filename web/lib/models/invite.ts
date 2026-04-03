import mongoose, { Schema, Document } from "mongoose";
import { randomUUID } from "crypto";

export interface IInvite extends Document {
  organizationId: mongoose.Types.ObjectId;
  email?: string;
  ensName?: string;
  token: string;
  salary: string;
  payFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  employeeType: "FULL_TIME" | "CONTRACTOR";
  departmentId?: mongoose.Types.ObjectId;
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    email: { type: String },
    ensName: { type: String },
    token: { type: String, unique: true, default: () => randomUUID() },
    salary: { type: String, required: true },
    payFrequency: { type: String, enum: ["WEEKLY", "BIWEEKLY", "MONTHLY"], default: "MONTHLY" },
    employeeType: { type: String, enum: ["FULL_TIME", "CONTRACTOR"], default: "FULL_TIME" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.Invite ||
  mongoose.model<IInvite>("Invite", InviteSchema);
