import axios from 'axios';
import { Threat } from './types';

export const fetchThreats = async () => {
  const { data } = await axios.get<Threat[]>('/api/threats');
  return data;
};
