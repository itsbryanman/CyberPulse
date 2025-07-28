import { Router } from 'express';
import Threat, { ThreatDocument } from '../threatModel.js';

const router = Router();

router.get('/', async (_req, res) => {
  const threats = await Threat.find().sort({ detectedAt: -1 }).limit(100);
  res.json(threats);
});

router.post('/', async (req, res) => {
  const threat: ThreatDocument = new Threat(req.body);
  await threat.save();
  res.status(201).json(threat);
});

export default router;
