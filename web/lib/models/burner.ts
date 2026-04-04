import mongoose, { Schema, Document } from "mongoose";

export interface IBurner extends Document {
  userId: mongoose.Types.ObjectId;
  address: string; // burner EVM address
  encryptedPrivateKey: string; // AES-256-GCM encrypted
  vaultAddress: string; // which vault this burner deposited into
  token: string; // token address (USDC)
  amount: string; // amount deposited (units)
  status: "active" | "disposed";
  createdAt: Date;
  updatedAt: Date;
}

const BurnerSchema = new Schema<IBurner>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    address: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    vaultAddress: { type: String, required: true },
    token: { type: String, required: true },
    amount: { type: String, required: true },
    status: { type: String, enum: ["active", "disposed"], default: "active" },
  },
  { timestamps: true },
);

export default mongoose.models.Burner ||
  mongoose.model<IBurner>("Burner", BurnerSchema);
