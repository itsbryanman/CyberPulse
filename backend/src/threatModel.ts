import mongoose, { Schema, Document } from 'mongoose';

export interface ThreatDocument extends Document {
  source: string;
  ip: string;
  type: string;
  severity: string;
  detectedAt: Date;
}

const ThreatSchema = new Schema<ThreatDocument>({
  source: { type: String, required: true },
  ip: { type: String, required: true },
  type: { type: String, required: true },
  severity: { type: String, required: true },
  detectedAt: { type: Date, default: Date.now }
});

export default mongoose.model<ThreatDocument>('Threat', ThreatSchema);
