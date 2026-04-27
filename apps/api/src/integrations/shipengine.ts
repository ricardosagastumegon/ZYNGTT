import axios from 'axios';
import { logger } from '../utils/logger';

export interface TrackingEvent {
  status: string;
  location?: string;
  description: string;
  occurredAt: Date;
}

export async function trackShipment(trackingNumber: string, carrierCode: string): Promise<TrackingEvent[]> {
  try {
    const res = await axios.get('https://api.shipengine.com/v1/tracking', {
      headers: { 'API-Key': process.env.SHIPENGINE_API_KEY },
      params: { carrier_code: carrierCode.toLowerCase(), tracking_number: trackingNumber },
      timeout: 10000,
    });

    return (res.data.events ?? []).map((e: Record<string, unknown>) => ({
      status: String(e.status_code ?? 'UNKNOWN'),
      location: e.city_locality ? `${e.city_locality}, ${e.country_code}` : undefined,
      description: String(e.description ?? 'Tracking update'),
      occurredAt: new Date(String(e.occurred_at ?? Date.now())),
    }));
  } catch (err) {
    logger.warn('ShipEngine API unavailable', { err });
    return [];
  }
}
