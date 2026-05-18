# Fase 4A — Refinamiento UX Mobile

**Pre-requisito:** Fase 3 cerrada ✅ (2026-05-17)  
**Estado:** ✅ Cerrada (2026-05-17)  
**Alcance:** Mejoras de usabilidad en la app mobile antes de integrar Mercado Pago sandbox

---

## Objetivo

Pulir la experiencia del usuario en los flujos más utilizados para que el prototipo sea presentable y la UX sea coherente antes de conectar pagos reales.

---

## Cambios implementados

### 4A — Login: formateo de teléfono chileno

**Archivo:** `mobile/app/(auth)/login.tsx`

**Problema:** El campo de teléfono era un TextInput libre que formateaba "+56 9 XXXX XXXX" como valor controlado, lo que impedía borrar correctamente y duplicaba el prefijo.

**Solución:**
- Prefijo "+56 9" mostrado como `Text` estático (no editable)
- Separador visual entre prefijo y dígitos
- TextInput acepta solo los 8 dígitos restantes (`keyboardType="number-pad"`, `maxLength=8`)
- Formateo visual `XXXX XXXX` aplicado al `displayValue` sin afectar el estado
- Validación: `isValid = digits.length === 8`
- Borde verde (`Colors.secondary`) cuando válido, rojo (`Colors.danger`) cuando inválido, neutro cuando vacío
- Envía `+569XXXXXXXX` al backend

---

### 4B — OTP: countdown visual

**Archivo:** `mobile/app/(auth)/verify-otp.tsx`

**Problema:** No había indicación de que el código expira, y el usuario podía intentar verificar un código vencido sin feedback.

**Solución:**
- Countdown de 2 minutos (`OTP_TTL = 120`) con `setInterval` limpiado en `useEffect` cleanup
- Timer naranja (`Colors.warning`) cuando quedan < 30 segundos
- "Código expirado — reenviar para continuar" en rojo (`Colors.danger`) al llegar a 0
- Dígitos con fondo gris y borde tenue cuando expirado
- Botón "Verificar" deshabilitado cuando expirado
- Botón "Reenviar código" prominente cuando expirado; resetea el counter a 120 y llama `login({ phone })` de nuevo

---

### 4C — Dashboard: secciones contextuales

**Archivo:** `mobile/app/(app)/index.tsx`

**Problema:** FlatList plana sin jerarquía visual — el usuario no sabía qué transacciones requerían su acción inmediata.

**Solución:** SectionList con 3 secciones generadas por `classifyTransactions()`:

| Sección | Icono | Criterio |
|---------|-------|----------|
| Requieren tu atención | ⚡ | `PROPUESTA` donde el usuario es contraparte, o `ENTREGADO` donde el usuario es comprador |
| En progreso | 🔄 | `CONFIRMADA`, `PAGADO`, `EN_TRANSITO`, `EN_DISPUTA` |
| Recientes | 📋 | Estados terminales — últimas 5 |

**Otros cambios:**
- Subtítulo dinámico en el header: muestra conteo de atención cuando > 0
- Botón 🗂️ circular en header que navega a pantalla de archivadas
- `stickySectionHeadersEnabled={false}` para scroll fluido
- Empty state mejorado con CTA "Crear mi primera transacción"

---

### 4D — Detalle de transacción: actualización en tiempo real

**Archivos:** `mobile/hooks/useTransaction.ts`, `mobile/app/(app)/transactions/[id].tsx`

**Problema:** El stepper de estados no se actualizaba al cambiar el estado en el otro dispositivo — había que salir y volver a entrar a la pantalla.

**Solución:**
- `refetchInterval` de 30s en `useTransaction` cuando `status` es activo (`CONFIRMADA`, `PAGADO`, `EN_TRANSITO`, `ENTREGADO`, `EN_DISPUTA`)
- `refetchIntervalInBackground: false` para no consumir batería en background
- `RefreshControl` en el `ScrollView` del detalle — pull-to-refresh manual
- `onRefresh` con estado `refreshing` local para mostrar el spinner del sistema

---

### 4E — Tracking: actualización automática

**Archivo:** `mobile/app/(app)/transactions/tracking.tsx`

**Problema:** El estado del envío no se actualizaba sin salir y volver a entrar.

**Solución:**
- `refetchInterval: 60_000` cuando `status !== 'DELIVERED'`
- `RefreshControl` en ScrollView para actualización manual
- Hook `useRelativeTime(date)` — actualiza un label cada 30s:
  - "Actualizado hace unos segundos" (< 1 min)
  - "Actualizado hace X min" (< 1 hora)
  - "Actualizado hace X h" (≥ 1 hora)
- `setLastUpdated(new Date())` en el `onSuccess` de la query

---

### 4F — Pantalla de transacciones archivadas

**Archivo:** `mobile/app/(app)/transactions/archived.tsx`

**Problema:** No existía pantalla para ver las transacciones archivadas.

**Solución:**
- Pantalla nueva con `GET /transactions/archived`
- Chips de filtro horizontal scrolleable:
  - Todas · Completadas · Canceladas · Reembolsadas · Expiradas
- Filtrado client-side: `data.filter(tx => tx.status === filter)`
- Empty states diferenciados:
  - Sin filtro: "🗂️ Sin transacciones archivadas"
  - Con filtro: "Sin resultados para este filtro" + "Probá seleccionando otro filtro"
- Pull-to-refresh

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `mobile/app/(auth)/login.tsx` | Reescrito — nuevo input de teléfono |
| `mobile/app/(auth)/verify-otp.tsx` | Reescrito — countdown OTP |
| `mobile/app/(app)/index.tsx` | Reescrito — SectionList con secciones contextuales |
| `mobile/app/(app)/transactions/[id].tsx` | Pull-to-refresh + auto-refresh 30s |
| `mobile/app/(app)/transactions/tracking.tsx` | Auto-refresh 60s + `useRelativeTime` |
| `mobile/app/(app)/transactions/archived.tsx` | Nuevo — pantalla de archivadas con filtros |
| `mobile/hooks/useTransaction.ts` | Polling 30s en estados activos |

---

## Criterio de aprobación

- [x] Login acepta solo 8 dígitos, prefijo "+56 9" estático, sin bugs de borrado
- [x] OTP muestra countdown, se torna naranja < 30s, bloquea verificación al expirar
- [x] Dashboard agrupa por sección y destaca transacciones que requieren atención
- [x] Detalle se actualiza cada 30s sin acción del usuario
- [x] Tracking se actualiza cada 60s y muestra hora de última actualización
- [x] Pantalla de archivadas funciona con filtros client-side
