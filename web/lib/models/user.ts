import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  privyId: string;
  email?: string;
  name?: string;
  role: "ADMIN" | "EMPLOYEE";
  ensName?: string;
  encryptedMnemonic: string;
  unlinkAddress?: string;
  evmAddress?: string;
  organizationId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    privyId: { type: String, required: true, unique: true },
    email: { type: String, sparse: true },
    name: { type: String },
    role: { type: String, enum: ["ADMIN", "EMPLOYEE"], default: "EMPLOYEE" },
    ensName: { type: String },
    encryptedMnemonic: { type: String, required: true },
    unlinkAddress: { type: String },
    evmAddress: { type: String },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
