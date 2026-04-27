'use client';
import { useConvertQuote } from '@/hooks/useQuotes';
import { useRouter } from 'next/navigation';
import { Ship, Plane, Truck, Calendar, DollarSign } from 'lucide-react';

const modeIcons = { SEA: Ship, AIR: Plane, GROUND: Truck };
const modeLabels = { SEA: 'Marítimo', AIR: 'Aéreo', GROUND: 'Terrestre' };

interface Quote {
  id: string; carrier: string; mode: 'SEA' | 'AIR' | 'GROUND';
  price: number; currency: string; transitDays: number; validUntil: string;
  origin: string; destination: string;
}

export function QuoteCard({ quote }: { quote: Quote }) {
  const { mutate: convert, isPending } = useConvertQuote();
  const router = useRouter();
  const Icon = modeIcons[quote.mode];

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-50 rounded-lg flex items-center justify-center">
            <Icon size={20} className="text-navy-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{quote.carrier}</p>
            <p className="text-xs text-gray-400">{modeLabels[quote.mode]}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-navy-700">${quote.price.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{quote.currency}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">{quote.origin} → {quote.destination}</p>

      <div className="flex gap-4 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1"><Calendar size={12} /> {quote.transitDays} días tránsito</span>
        <span className="flex items-center gap-1"><DollarSign size={12} /> Válido hasta {new Date(quote.validUntil).toLocaleDateString()}</span>
      </div>

      <button onClick={() => convert(quote.id, { onSuccess: (s) => router.push(`/shipments/${s.id}`) })}
        disabled={isPending}
        className="w-full bg-navy-700 hover:bg-navy-900 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-60">
        {isPending ? 'Procesando...' : 'Contratar este envío'}
      </button>
    </div>
  );
}
