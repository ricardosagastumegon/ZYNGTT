import axios from 'axios';
import { logger } from '../utils/logger';

export interface CarrierRate {
  carrier: string;
  mode: 'SEA' | 'AIR' | 'GROUND';
  price: number;
  currency: string;
  transitDays: number;
  validUntil: Date;
}

export async function getMaerskRates(
  origin: string, destination: string, weight: number, volume: number
): Promise<CarrierRate> {
  try {
    const res = await axios.get('https://api.maersk.com/maeu/rates', {
      headers: { 'Consumer-Key': process.env.MAERSK_API_KEY },
      params: { origin, destination, weight, volume },
      timeout: 10000,
    });

    const data = res.data;
    return {
      carrier: 'Maersk',
      mode: 'SEA',
      price: data.totalPrice ?? estimateSeaRate(weight, volume),
      currency: 'USD',
      transitDays: data.transitTime ?? 25,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  } catch (err) {
    logger.warn('Maersk API unavailable, using estimated rate', { err });
    return {
      carrier: 'Maersk',
      mode: 'SEA',
      price: estimateSeaRate(weight, volume),
      currency: 'USD',
      transitDays: 25,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }
}

function estimateSeaRate(weight: number, volume: number): number {
  const cbm = volume;
  const chargeableWeight = Math.max(weight, cbm * 1000);
  return Math.round(chargeableWeight * 0.8 + 350);
}
