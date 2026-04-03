import mongoose, { Schema, Document } from "mongoose";

export interface IApprover {
  evmAddress: string;
  ensName?: string;
}

export interface IOrganization extends Document {
  name: string;
  logo?: string;
  orgType: "TEAM" | "DAO";
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  encryptedEvmPrivateKey: string;
  approvers: IApprover[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    logo: { type: String },
    orgType: { type: String, enum: ["TEAM", "DAO"], default: "TEAM" },
    tokenAddress: { type: String, required: true },
    tokenSymbol: { type: String, default: "USDC" },
    tokenDecimals: { type: Number, default: 18 },
    encryptedEvmPrivateKey: { type: String, required: true },
    approvers: [
      {
        evmAddress: { type: String, required: true },
        ensName: { type: String },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
