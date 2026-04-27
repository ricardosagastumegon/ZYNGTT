import type { CarrierRate } from './maersk';

const GROUND_RATES: Record<string, { basePrice: number; perKg: number; days: number }> = {
  'GT-HN': { basePrice: 150, perKg: 0.35, days: 2 },
  'GT-SV': { basePrice: 130, perKg: 0.30, days: 1 },
  'GT-MX': { basePrice: 250, perKg: 0.50, days: 3 },
  'HN-SV': { basePrice: 120, perKg: 0.28, days: 1 },
  'HN-GT': { basePrice: 150, perKg: 0.35, days: 2 },
  'SV-GT': { basePrice: 130, perKg: 0.30, days: 1 },
  'SV-HN': { basePrice: 120, perKg: 0.28, days: 1 },
};

function getRouteKey(origin: string, destination: string): string {
  const o = origin.toUpperCase().slice(0, 2);
  const d = destination.toUpperCase().slice(0, 2);
  return `${o}-${d}`;
}

export function getGroundRates(origin: string, destination: string, weight: number): CarrierRate {
  const key = getRouteKey(origin, destination);
  const rate = GROUND_RATES[key] ?? { basePrice: 200, perKg: 0.40, days: 4 };

  return {
    carrier: 'Transporte Terrestre CA',
    mode: 'GROUND',
    price: Math.round(rate.basePrice + weight * rate.perKg),
    currency: 'USD',
    transitDays: rate.days,
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  };
}
