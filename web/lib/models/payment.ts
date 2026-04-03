import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  payrollId: mongoose.Types.ObjectId;
  employeeUserId: mongoose.Types.ObjectId;
  amount: string;
  unlinkTxId?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  payslipGenerated: boolean;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    payrollId: { type: Schema.Types.ObjectId, ref: "Payroll", required: true },
    employeeUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: String, required: true },
    unlinkTxId: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    payslipGenerated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
