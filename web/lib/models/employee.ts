import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  employeeType: "FULL_TIME" | "CONTRACTOR";
  salary: string;
  payFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    employeeType: { type: String, enum: ["FULL_TIME", "CONTRACTOR"], default: "FULL_TIME" },
    salary: { type: String, required: true },
    payFrequency: { type: String, enum: ["WEEKLY", "BIWEEKLY", "MONTHLY"], default: "MONTHLY" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.Employee ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);
