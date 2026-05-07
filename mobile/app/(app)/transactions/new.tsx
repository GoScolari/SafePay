import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FeePreview } from '@/components/FeePreview';
import { Colors } from '@/constants/colors';
import { Transaction } from '@/stores/transaction.store';

type TxRole     = 'seller' | 'buyer';
type TxModality = 'shipping' | 'presential';
type FeePayer   = 'seller' | 'buyer' | 'split';

interface FormState {
  initiatorRole: TxRole | null;
  modality:      TxModality | null;
  amount:        string;
  description:   string;
  feePayer:      FeePayer | null;
}

const STEPS = ['Rol y modalidad', 'Monto y descripción', 'Comisión'];

export default function NewTransactionScreen() {
  const queryClient = useQueryClient();
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState<FormState>({
    initiatorRole: null, modality: null,
    amount: '', description: '', feePayer: null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const amount = parseInt(form.amount.replace(/\D/g, ''), 10) || 0;

  const { mutate: createTx, isPending } = useMutation({
    mutationFn: () =>
      api.post<Transaction>('/transactions', {
        initiatorRole: form.initiatorRole,
        modality:      form.modality,
        amount,
        description:   form.description.trim(),
        feePayer:      form.feePayer,
      }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      router.replace(`/(app)/transactions/${data.id}`);
    },
    onError: (e: any) => {
      setErrors({ description: e?.response?.data?.message ?? 'Error al crear. Intenta de nuevo.' });
    },
  });

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!form.initiatorRole) { setErrors({ initiatorRole: 'Seleccioná tu rol' }); return false; }
      if (!form.modality)      { setErrors({ modality: 'Seleccioná la modalidad' }); return false; }
    }
    if (step === 1) {
      if (amount < 1000 || amount > 2_000_000) {
        setErrors({ amount: 'El monto debe ser entre $1.000 y $2.000.000' }); return false;
      }
      if (form.description.trim().length < 10) {
        setErrors({ description: 'La descripción debe tener al menos 10 caracteres' }); return false;
      }
    }
    if (step === 2) {
      if (!form.feePayer) { setErrors({ feePayer: 'Seleccioná quién paga la comisión' }); return false; }
    }
    setErrors({});
    return true;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => { setErrors({}); setStep((s) => s - 1); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 0 ? router.back() : back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {step === 0 ? 'Cancelar' : 'Atrás'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nueva transacción</Text>
        <Text style={styles.stepLabel}>{step + 1} / {STEPS.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* ── Paso 1: Rol y modalidad ── */}
          {step === 0 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>¿Cuál es tu rol?</Text>
              <View style={styles.cards}>
                {(['seller', 'buyer'] as TxRole[]).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.card, form.initiatorRole === role && styles.cardSelected]}
                    onPress={() => { setForm((f) => ({ ...f, initiatorRole: role })); setErrors({}); }}
                  >
                    <Text style={styles.cardEmoji}>{role === 'seller' ? '🏷️' : '🛒'}</Text>
                    <Text style={[styles.cardTitle, form.initiatorRole === role && styles.cardTitleSelected]}>
                      {role === 'seller' ? 'Vendedor' : 'Comprador'}
                    </Text>
                    <Text style={styles.cardSub}>
                      {role === 'seller' ? 'Yo vendo el artículo' : 'Yo compro el artículo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.initiatorRole && <Text style={styles.error}>{errors.initiatorRole}</Text>}

              <Text style={[styles.stepTitle, { marginTop: 24 }]}>¿Cómo se entrega?</Text>
              <View style={styles.cards}>
                {(['shipping', 'presential'] as TxModality[]).map((mod) => (
                  <TouchableOpacity
                    key={mod}
                    style={[styles.card, form.modality === mod && styles.cardSelected]}
                    onPress={() => { setForm((f) => ({ ...f, modality: mod })); setErrors({}); }}
                  >
                    <Text style={styles.cardEmoji}>{mod === 'shipping' ? '📦' : '🤝'}</Text>
                    <Text style={[styles.cardTitle, form.modality === mod && styles.cardTitleSelected]}>
                      {mod === 'shipping' ? 'Con envío' : 'Presencial'}
                    </Text>
                    <Text style={styles.cardSub}>
                      {mod === 'shipping' ? 'Se despacha por courier' : 'Se entrega en persona'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.modality && <Text style={styles.error}>{errors.modality}</Text>}
            </View>
          )}

          {/* ── Paso 2: Monto y descripción ── */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>¿Cuánto vale el artículo?</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={form.amount}
                  onChangeText={(t) => {
                    const digits = t.replace(/\D/g, '');
                    setForm((f) => ({ ...f, amount: digits }));
                    setErrors({});
                  }}
                  autoFocus
                />
                <Text style={styles.currencyCode}>CLP</Text>
              </View>
              {errors.amount && <Text style={styles.error}>{errors.amount}</Text>}

              {amount >= 1000 && (
                <FeePreview amount={amount} feePayer={form.feePayer ?? 'split'} initiatorRole={form.initiatorRole ?? 'seller'} />
              )}

              <Text style={[styles.stepTitle, { marginTop: 20 }]}>Describí el artículo</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Ej: iPhone 13 Pro 256GB azul sierra, sin rayones, con caja original..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
                value={form.description}
                onChangeText={(t) => { setForm((f) => ({ ...f, description: t })); setErrors({}); }}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{form.description.length}/500</Text>
              {errors.description && <Text style={styles.error}>{errors.description}</Text>}
            </View>
          )}

          {/* ── Paso 3: ¿Quién paga la comisión? ── */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>¿Quién paga la comisión?</Text>
              <Text style={styles.stepSub}>La comisión SafePay es de {
                new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                  require('@/lib/utils').calculateFee(amount)
                )
              }</Text>

              {([
                { value: 'seller', label: 'El vendedor',          sub: 'Se descuenta del monto que recibe el vendedor' },
                { value: 'buyer',  label: 'El comprador',         sub: 'Se suma al precio que paga el comprador' },
                { value: 'split',  label: 'La pagan entre los dos', sub: 'Cada uno paga la mitad' },
              ] as { value: FeePayer; label: string; sub: string }[]).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.feeOption, form.feePayer === opt.value && styles.feeOptionSelected]}
                  onPress={() => { setForm((f) => ({ ...f, feePayer: opt.value })); setErrors({}); }}
                >
                  <View style={[styles.radio, form.feePayer === opt.value && styles.radioSelected]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.feeLabel, form.feePayer === opt.value && styles.feeLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.feeSub}>{opt.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {errors.feePayer && <Text style={styles.error}>{errors.feePayer}</Text>}

              {form.feePayer && amount >= 1000 && (
                <FeePreview amount={amount} feePayer={form.feePayer} initiatorRole={form.initiatorRole ?? 'seller'} />
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        {step < 2 ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={next}>
            <Text style={styles.primaryBtnText}>Siguiente →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, isPending && styles.btnDisabled]}
            onPress={() => { if (validateStep()) createTx(); }}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Crear transacción</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:      { minWidth: 70 },
  backText:     { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  title:        { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  stepLabel:    { minWidth: 70, textAlign: 'right', fontSize: 13, color: Colors.textMuted },
  progressBar:  { height: 3, backgroundColor: Colors.border, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  content:      { padding: 16, paddingBottom: 32, gap: 16 },
  stepContainer:{ gap: 12 },
  stepTitle:    { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  stepSub:      { fontSize: 13, color: Colors.textSecondary, marginTop: -8 },
  cards:        { flexDirection: 'row', gap: 12 },
  card:         {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, padding: 14, alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface,
  },
  cardSelected:      { borderColor: Colors.primary, backgroundColor: Colors.primary + '0D' },
  cardEmoji:         { fontSize: 28 },
  cardTitle:         { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  cardTitleSelected: { color: Colors.primary },
  cardSub:           { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  amountRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencySymbol:{ fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  amountInput:  {
    flex: 1, fontSize: 36, fontWeight: '700', color: Colors.textPrimary,
    borderBottomWidth: 2, borderBottomColor: Colors.primary, paddingVertical: 4,
  },
  currencyCode: { fontSize: 16, color: Colors.textMuted, fontWeight: '600' },
  textarea:     {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 14, fontSize: 15, color: Colors.textPrimary,
    minHeight: 100,
  },
  charCount:    { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  feeOption:    {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 14, backgroundColor: Colors.surface,
  },
  feeOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '0D' },
  radio:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  radioSelected:{ borderColor: Colors.primary, backgroundColor: Colors.primary },
  feeLabel:     { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  feeLabelSelected: { color: Colors.primary },
  feeSub:       { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  error:        { fontSize: 13, color: Colors.danger },
  footer:       { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  primaryBtn:   { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnDisabled:  { opacity: 0.6 },
  primaryBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
});
