'use client';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <CheckCircle size={64} className="text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-800">¡Pago exitoso!</h1>
        <p className="text-gray-500">Tu pago fue procesado correctamente.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/shipments" className="bg-navy-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold">Ver envíos</Link>
          <Link href="/dashboard" className="border border-gray-300 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-semibold">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
