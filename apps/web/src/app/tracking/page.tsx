'use client';
import { useState } from 'react';
import { usePublicTracking } from '@/hooks/useTracking';
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline';
import { Search } from 'lucide-react';

export default function PublicTrackingPage() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const { data, isLoading, error } = usePublicTracking(query);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-700 text-white py-12 text-center">
        <h1 className="text-3xl font-bold">ZYN — Tracking</h1>
        <p className="mt-2 text-navy-100">Consulta el estado de tu envío sin iniciar sesión</p>

        <div className="mt-8 flex gap-2 max-w-md mx-auto px-4">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setQuery(input)}
            placeholder="Número de tracking" className="flex-1 rounded-lg px-4 py-2.5 text-gray-800 text-sm outline-none" />
          <button onClick={() => setQuery(input)} className="bg-white text-navy-700 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2">
            <Search size={16} /> Buscar
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-10 px-4">
        {isLoading && <div className="text-center text-gray-400">Buscando...</div>}
        {error && <div className="text-center text-red-500">No se encontró el número de tracking</div>}
        {data && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Referencia: <strong>{data.reference}</strong></span>
              <span className="text-gray-500">Estado: <strong>{data.status}</strong></span>
            </div>
            <p className="text-sm text-gray-500">{data.origin} → {data.destination}</p>
            <hr />
            <TrackingTimeline events={data.events} current />
          </div>
        )}
        {!query && <div className="text-center text-gray-400 mt-16">Ingresa un número de tracking para comenzar</div>}
      </main>
    </div>
  );
}
