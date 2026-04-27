'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useShipment } from '@/hooks/useShipments';
import { useInitiatePayment } from '@/hooks/usePayments';
import { PaymentForm } from '@/components/payments/PaymentForm';

export default function PaymentPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const router = useRouter();
  const { data: shipment } = useShipment(shipmentId);
  const { mutateAsync: initiate } = useInitiatePayment();
  const [paymentData, setPaymentData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (shipmentId) initiate(shipmentId).then(setPaymentData);
  }, [shipmentId]);

  if (!paymentData) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-700" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pagar envío</h1>
      <PaymentForm
        data={{ ...paymentData, shipment: { reference: shipment?.reference ?? '', origin: shipment?.origin ?? '', destination: shipment?.destination ?? '' } } as Parameters<typeof PaymentForm>[0]['data']}
        onSuccess={() => router.push('/payments/success')}
      />
    </div>
  );
}
