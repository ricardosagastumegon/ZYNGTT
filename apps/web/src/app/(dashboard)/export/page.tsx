import { ArrowUpFromLine } from 'lucide-react';

export default function ExportPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="rounded-2xl bg-navy-50 p-5 mb-5">
        <ArrowUpFromLine className="w-10 h-10 text-navy-700" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-2">Exportaciones</h1>
      <p className="text-gray-400 text-sm max-w-xs">
        Módulo en desarrollo. Próximamente podrás gestionar tus exportaciones GT→MX desde aquí.
      </p>
    </div>
  );
}
