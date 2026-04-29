'use client';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { DollarSign, Loader2 } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

interface PaymentData {
  clientSecret: string;
  payment: { amount: number; freightAmount: number; commissionAmount: number; currency: string };
  shipment: { reference: string; origin: string; destination: string };
}

function CheckoutForm({ data, onSuccess }: { data: PaymentData; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: { card: elements.getElement(CardElement)! },
    });

    if (result.error) { setError(result.error.message ?? 'Error de pago'); setLoading(false); }
    else if (result.paymentIntent?.status === 'succeeded') onSuccess();
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <h3 className="font-semibold text-gray-700">Resumen del envío</h3>
        <p className="text-sm text-gray-500">{data.shipment.reference} · {data.shipment.origin} → {data.shipment.destination}</p>
        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500"><span>Flete</span><span>${data.payment.freightAmount.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-500"><span>Comisión plataforma (5%)</span><span>${data.payment.commissionAmount.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-gray-800 text-base mt-1 border-t pt-1"><span>Total</span><span>${data.payment.amount.toFixed(2)} {data.payment.currency}</span></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-gray-700">Datos de pago</h3>
        <div className="border border-gray-300 rounded-lg p-3">
          <CardElement options={{ style: { base: { fontSize: '14px', color: '#374151' } } }} />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={!stripe || loading}
          className="w-full bg-navy-700 hover:bg-navy-900 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Procesando...</> : <><DollarSign size={16} /> Pagar ${data.payment.amount.toFixed(2)}</>}
        </button>
      </form>
    </div>
  );
}

export function PaymentForm(props: Parameters<typeof CheckoutForm>[0]) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.data.clientSecret }}>
      <CheckoutForm {...props} />
    </Elements>
  );
}
