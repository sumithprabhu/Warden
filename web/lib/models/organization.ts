import mongoose, { Schema, Document } from "mongoose";

export interface IApprover {
  evmAddress: string;
  ensName?: string;
}

export interface IToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface IOrganization extends Document {
  name: string;
  logo?: string;
  orgType: "TEAM" | "DAO";
  tokens: IToken[];
  treasuryAddress: string;
  treasurySalt: string;
  approvers: IApprover[];
  admins: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    logo: { type: String },
    orgType: { type: String, enum: ["TEAM", "DAO"], default: "TEAM" },
    tokens: [
      {
        address: { type: String, required: true },
        symbol: { type: String, required: true },
        name: { type: String, required: true },
        decimals: { type: Number, required: true },
      },
    ],
    treasuryAddress: { type: String, required: true },
    treasurySalt: { type: String, required: true },
    approvers: [
      {
        evmAddress: { type: String, required: true },
        ensName: { type: String },
      },
    ],
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
