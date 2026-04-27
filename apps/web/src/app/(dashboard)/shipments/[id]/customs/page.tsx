'use client';
import { useParams } from 'next/navigation';
import { useCustomsRecord, useSaveCustomsRecord } from '@/hooks/useCustoms';
import { CustomsChecklist } from '@/components/customs/CustomsChecklist';
import { CustomsStatusCard } from '@/components/customs/CustomsStatusCard';
import { useForm } from 'react-hook-form';

export default function ShipmentCustomsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: record } = useCustomsRecord(id);
  const { mutate: save } = useSaveCustomsRecord(id);
  const { register, handleSubmit } = useForm({ defaultValues: record ?? {} });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Gestión Aduanera</h2>
      {record && <CustomsStatusCard record={record} />}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Datos de aduana</h3>
        <form onSubmit={handleSubmit(data => save(data as Record<string, unknown>))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código HS</label>
              <input {...register('hsCode')} placeholder="ej. 6201" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor declarado (USD)</label>
              <input {...register('value')} type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agente aduanero</label>
            <input {...register('agent')} placeholder="Nombre del agente" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-navy-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Guardar</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Checklist de documentos</h3>
        <CustomsChecklist shipmentId={id} />
      </div>
    </div>
  );
}
