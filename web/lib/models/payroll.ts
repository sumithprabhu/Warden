import mongoose, { Schema, Document } from "mongoose";

export interface IPayrollApproval {
  approverAddress: string;
  signedAt: Date;
}

export interface IPayroll extends Document {
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  status: "PENDING" | "PENDING_APPROVAL" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalAmount: string;
  employeeCount: number;
  unlinkTxId?: string;
  approvals: IPayrollApproval[];
  executedAt?: Date;
  createdAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    status: {
      type: String,
      enum: ["PENDING", "PENDING_APPROVAL", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    totalAmount: { type: String, required: true },
    employeeCount: { type: Number, required: true },
    unlinkTxId: { type: String },
    approvals: [
      {
        approverAddress: { type: String, required: true },
        signedAt: { type: Date, default: Date.now },
      },
    ],
    executedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.Payroll ||
  mongoose.model<IPayroll>("Payroll", PayrollSchema);
