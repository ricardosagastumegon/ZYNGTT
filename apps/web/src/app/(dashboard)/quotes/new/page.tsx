'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateQuote } from '@/hooks/useQuotes';
import { QuoteCard } from '@/components/quotes/QuoteCard';

const schema = z.object({
  type: z.enum(['IMPORT', 'EXPORT']),
  mode: z.enum(['SEA', 'AIR', 'GROUND']),
  origin: z.string().min(2),
  destination: z.string().min(2),
  weight: z.coerce.number().positive(),
  volume: z.coerce.number().positive().optional(),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const steps = ['Tipo y modo', 'Detalles del envío', 'Resultado'];

export default function NewQuotePage() {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const { mutateAsync: createQuote, isPending } = useCreateQuote();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'IMPORT', mode: 'SEA' },
  });

  const onSubmit = async (data: FormData) => {
    const quote = await createQuote(data as Record<string, unknown>);
    setResult(quote);
    setStep(2);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Nueva cotización de flete</h1>

      <div className="flex gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className={`flex-1 text-center text-xs py-2 rounded-lg font-medium ${i === step ? 'bg-navy-700 text-white' : i < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        {step === 0 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de operación</label>
              <div className="grid grid-cols-2 gap-3">
                {(['IMPORT', 'EXPORT'] as const).map(t => (
                  <label key={t} className={`border-2 rounded-lg p-3 cursor-pointer text-center text-sm font-medium transition ${watch('type') === t ? 'border-navy-700 bg-navy-50 text-navy-700' : 'border-gray-200'}`}>
                    <input {...register('type')} type="radio" value={t} className="sr-only" />
                    {t === 'IMPORT' ? 'Importación' : 'Exportación'}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modo de transporte</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'SEA', l: 'Marítimo' }, { v: 'AIR', l: 'Aéreo' }, { v: 'GROUND', l: 'Terrestre' }].map(({ v, l }) => (
                  <label key={v} className={`border-2 rounded-lg p-3 cursor-pointer text-center text-sm font-medium transition ${watch('mode') === v ? 'border-navy-700 bg-navy-50 text-navy-700' : 'border-gray-200'}`}>
                    <input {...register('mode')} type="radio" value={v} className="sr-only" />{l}
                  </label>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setStep(1)} className="w-full bg-navy-700 text-white py-2.5 rounded-lg text-sm font-semibold">Siguiente</button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
                <input {...register('origin')} placeholder="Guatemala" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700" />
                {errors.origin && <p className="text-red-500 text-xs mt-1">{errors.origin.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                <input {...register('destination')} placeholder="Miami, FL" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700" />
                {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                <input {...register('weight')} type="number" step="0.1" placeholder="1000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volumen (m³)</label>
                <input {...register('volume')} type="number" step="0.01" placeholder="5.5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de mercancía</label>
              <textarea {...register('description')} rows={3} placeholder="Textiles, electrónicos, etc." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-semibold">Atrás</button>
              <button type="submit" disabled={isPending} className="flex-1 bg-navy-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
                {isPending ? 'Cotizando...' : 'Obtener cotización'}
              </button>
            </div>
          </>
        )}

        {step === 2 && result && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Resultado de cotización</h3>
            <QuoteCard quote={result as unknown as Parameters<typeof QuoteCard>[0]['quote']} />
            <button type="button" onClick={() => { setStep(0); setResult(null); }} className="w-full mt-4 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm">Nueva cotización</button>
          </div>
        )}
      </form>
    </div>
  );
}
