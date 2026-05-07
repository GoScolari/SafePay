import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'outline';
  disabled?: boolean;
}

export function ActionButton({ label, onPress, loading, variant = 'primary', disabled }: Props) {
  const bgColor = variant === 'primary' ? Colors.primary
    : variant === 'danger' ? Colors.danger
    : 'transparent';
  const textColor = variant === 'outline' ? Colors.primary : '#fff';
  const borderColor = variant === 'outline' ? Colors.primary : 'transparent';

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bgColor, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0 }, (loading || disabled) && styles.disabled]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn:      { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  text:     { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
