import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  organizationId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  },
  { timestamps: true },
);

export default mongoose.models.Department ||
  mongoose.model<IDepartment>("Department", DepartmentSchema);
