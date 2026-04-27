import axios from 'axios';
import { logger } from '../utils/logger';
import type { CarrierRate } from './maersk';

export async function getDHLRates(
  origin: string, destination: string, weight: number
): Promise<CarrierRate> {
  try {
    const res = await axios.get('https://express.api.dhl.com/mydhlapi/rates', {
      headers: { 'DHL-API-Key': process.env.DHL_API_KEY },
      params: { originCountryCode: origin.slice(0, 2), destinationCountryCode: destination.slice(0, 2), weight },
      timeout: 10000,
    });

    const product = res.data?.products?.[0];
    return {
      carrier: 'DHL Express',
      mode: 'AIR',
      price: product?.totalPrice?.[0]?.price ?? estimateAirRate(weight),
      currency: 'USD',
      transitDays: product?.deliveryCapabilities?.estimatedDeliveryDateAndTime ? 3 : 5,
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  } catch (err) {
    logger.warn('DHL API unavailable, using estimated rate', { err });
    return {
      carrier: 'DHL Express',
      mode: 'AIR',
      price: estimateAirRate(weight),
      currency: 'USD',
      transitDays: 5,
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }
}

function estimateAirRate(weight: number): number {
  return Math.round(weight * 4.5 + 80);
}
