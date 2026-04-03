import mongoose, { Schema, Document } from "mongoose";

export interface IVesting extends Document {
  organizationId: mongoose.Types.ObjectId;
  employeeUserId: mongoose.Types.ObjectId;
  totalAmount: string;
  cliffMonths: number;
  vestingMonths: number;
  startDate: Date;
  releasedAmount: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: Date;
}

const VestingSchema = new Schema<IVesting>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalAmount: { type: String, required: true },
    cliffMonths: { type: Number, required: true },
    vestingMonths: { type: Number, required: true },
    startDate: { type: Date, required: true },
    releasedAmount: { type: String, default: "0" },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true },
);

export default mongoose.models.Vesting ||
  mongoose.model<IVesting>("Vesting", VestingSchema);
