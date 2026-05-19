'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhone = async () => {
    if (digits.length !== 8) return;
    setLoading(true);
    setError('');
    const fullPhone = `+569${digits}`;
    try {
      await api.post('/auth/login', { phone: fullPhone });
      setPhone(fullPhone);
      setStep('otp');
    } catch {
      setError('No se pudo enviar el código. Verificá el número.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', { phone, code });
      const token: string = res.data.accessToken;
      // Verificar que es admin
      const me = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (me.data.role !== 'admin') {
        setError('Esta cuenta no tiene permisos de administrador.');
        return;
      }
      setToken(token);
      router.replace('/disputes');
    } catch {
      setError('Código incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-1">SafePay</h1>
        <p className="text-sm text-gray-500 text-center mb-8">Panel de administración</p>

        {step === 'phone' ? (
          <>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
            <div className="flex items-center border rounded-lg overflow-hidden border-gray-300 bg-white mb-4">
              <span className="px-3 py-3 bg-gray-50 text-gray-700 font-semibold border-r border-gray-300 text-sm">
                +56 9
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={9}
                className="flex-1 px-3 py-3 text-sm outline-none"
                placeholder="1234 5678"
                value={digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setDigits(raw);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePhone()}
              />
            </div>
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button
              onClick={handlePhone}
              disabled={digits.length !== 8 || loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Ingresá el código de 6 dígitos enviado a <span className="font-semibold text-gray-700">{phone}</span>
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Código OTP</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-xl tracking-[0.5em] font-bold outline-none focus:border-indigo-500 mb-4"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleOtp()}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button
              onClick={handleOtp}
              disabled={code.length !== 6 || loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
            <button
              onClick={() => { setStep('phone'); setCode(''); setError(''); }}
              className="w-full mt-2 text-sm text-indigo-600 py-2 hover:underline"
            >
              ← Cambiar número
            </button>
          </>
        )}
      </div>
    </div>
  );
}
