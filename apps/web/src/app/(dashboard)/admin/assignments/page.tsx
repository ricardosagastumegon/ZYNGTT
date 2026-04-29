'use client';

import { GitMerge } from 'lucide-react';

export default function AssignmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
          Asignaciones
        </h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de relaciones empresa ↔ agente ↔ transportista</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <GitMerge className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Próximamente</p>
        <p className="text-sm text-gray-400 mt-1">
          Aquí podrás asignar agentes aduanales y transportistas a cada empresa cliente.
        </p>
      </div>
    </div>
  );
}
