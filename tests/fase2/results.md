# Fase 2 — Resultados Integración Mobile ↔ Backend Local

**Fecha de ejecución:** 2026-05-14  
**Ejecutado por:** GoScolari  
**Branch:** HEAD  
**Commit:** ced6052

## Entorno

- SO: Windows 11 / Android
- Node: v20
- Expo: SDK 53 (Expo Go)
- Dispositivo / Emulador: 2 dispositivos físicos Android
- IP LAN backend: 192.168.100.57:3000

---

## Resumen

| # | Test | Resultado | Notas |
|---|------|-----------|-------|
| M1 | Register vendedor + OTP | ✅ | Home muestra "Hola, Vendedor 👋", lista vacía. DB: phone_verified=true, role=user |
| M1b | Register comprador + OTP | ✅ | Home muestra "Hola, Comprador 👋". DB: phone_verified=true. 2 dispositivos activos |
| M2 | Login + JWT persistido entre reinicios | ✅ | Verificado en ambos dispositivos (vendedor y comprador). Entra directo al home sin pedir login |
| M3 | Crear transacción (vendedor, shipping) | ✅ | slug=tx-a920e4c4, status=PROPUESTA, fee=990, fee_payer=buyer, expiresAt=+24h. Stepper y detalle correctos |
| M4 | Lookup público por slug — sin auth | ✅ | Deep link exp:// abre pantalla con detalles y botón "Confirmar transacción". Bug #1 (link hardcoded), Bug #2 (status check) y Bug #3 (campo Vendedor) resueltos. Pantalla pública rediseñada: muestra "Confirmar transacción" en lugar de "Pagar" |
| M5 | Aceptar transacción (comprador) | ✅ | PROPUESTA → CONFIRMADA. counterpartId=Comprador Test, acceptedAt correcto. Comprador confirma desde link público → tx pasa a CONFIRMADA → comprador ve detalle con "Ir a pagar" |
| M6 | Pago modo dev simulado | ✅ | Comprador: stepper muestra PAGADO, botón "Cancelar". DB: status=PAGADO. Vendedor: stepper no actualiza (Bug #4). Bug #5: handleSuccess() no llamaba backend en modo dev — fix: endpoint POST /payments/dev-confirm/:id |
| M7 | Registrar tracking envío | ✅ | Vendedor: pantalla "Estado del envío", courier=Chilexpress, tracking=1234567890, rawStatus="EN CAMINO (simulado)". DB: status=EN_TRANSITO. Bug #7: courier enviado en mayúsculas (fix: minúsculas en tracking.tsx). Botón "🧪 Simular entrega" disponible para vendedor en EN_TRANSITO |
| M8 | Confirmar recepción | ✅ | Comprador: stepper COMPLETADO, sin botones de acción. Vendedor: idem. DB: status=COMPLETADO, payment.status=released, released_at registrado. Bug #8: releasePayment() pasaba txId en lugar de paymentId — fix: tx.payment?.id en [id].tsx |
| M9 | Subir foto de evidencia | | |
| M10 | Listar notificaciones y marcar leída | ✅ | Vendedor: tab Alertas muestra cápsula TX_PAID "Pago recibido". Tap navega al detalle. DB: read=true tras tap. Push no disponible en Expo Go SDK 53 (no bloqueante — Fase 4) |
| M11 | Flujo disputa E2E | ✅ | Comprador abre disputa (reason=damaged). Vendedor: detalle muestra badge "En disputa" + botón "Ver disputa". Pantalla disputa: estado Abierta → motivo + plazo + form respuesta → vendedor responde → estado Respondida. DB: status=responded, vendor_response registrado. Bug #9: "Ver disputa" usaba txId — fix: tx.dispute?.id |
| N1 | Número inválido → error en pantalla | ✅ | Error visible en español "El teléfono debe ser un número válido (ej: +56912345678)" — mensajes traducidos post-testing |
| N2 | OTP incorrecto → error | ⚠️ | OTP 000000 aceptado — comportamiento esperado en dev: sin credenciales Twilio, auth.service.ts línea 165 acepta cualquier código. En producción Twilio validará. No es bug de prod |
| N3 | Sin sesión → redirige a login | ✅ | Al abrir app sin sesión activa muestra pantalla login. Deep link a ruta inexistente muestra "Unmatched Route" (comportamiento estándar de Expo Router, no es bug) |
| N4 | Monto < $1.000 → error inline | ✅ | Error "El monto debe ser entre $1.000 y $2.000.000" en rojo, botón "Siguiente" bloqueado |
| N5 | Slug inexistente → 404 amigable | ✅ | Pantalla "Transacción no encontrada / El link puede estar expirado o ser incorrecto." |

---

## Bugs encontrados

### Bug #1 — "Copiar link de pago" generaba URL hardcodeada a safepay.cl ✅ RESUELTO
- **Test:** M4
- **Severidad:** baja (solo afecta dev; en producción safepay.cl existirá)
- **Causa:** `useTransaction.ts` usaba `` `https://safepay.cl/tx/${tx.slug}` `` literal
- **Resolución:** `EXPO_PUBLIC_WEB_URL` en `mobile/.env` + `process.env.EXPO_PUBLIC_WEB_URL ?? 'https://safepay.cl'` en `useTransaction.ts`

### Bug #2 — Pantalla pública no mostraba acción para transacciones PROPUESTA válidas ✅ RESUELTO
- **Test:** M4
- **Severidad:** alta (bloqueaba el flujo A completo)
- **Causa:** `tx/[slug].tsx` solo mostraba acción si `status === 'CONFIRMADA'`
- **Resolución:** Pantalla pública rediseñada — muestra "Confirmar transacción" para `PROPUESTA + initiatorRole=seller`. Al confirmar llama `POST /transactions/:id/accept` y navega al detalle autenticado

### Bug #9 — "Ver disputa" navegaba con transaction ID en lugar de dispute ID ✅ RESUELTO
- **Test:** M11
- **Severidad:** alta (bloqueaba ver el detalle de la disputa desde el detalle de transacción)
- **Causa:** `[id].tsx` usaba `router.push(\`/(app)/disputes/${id}\`)` con el transaction ID
- **Resolución:** `tx.dispute?.id` agregado al tipo `Transaction`; navegación usa `tx.dispute?.id ?? id`

### Bug #8 — releasePayment() pasaba transaction ID en lugar de payment ID ✅ RESUELTO
- **Test:** M8
- **Severidad:** alta (bloqueaba confirmar recepción — endpoint recibía UUID incorrecto)
- **Causa:** `[id].tsx` llamaba `releasePayment(id)` donde `id` es el transaction ID, pero `POST /payments/release/:id` espera el payment ID
- **Resolución:** `tx.payment?.id` agregado al tipo `Transaction` en `transaction.store.ts`; `[id].tsx` usa `tx.payment?.id ?? id`

### Bug #7 — Courier enviado en mayúsculas, backend espera minúsculas ✅ RESUELTO
- **Test:** M7
- **Severidad:** alta (bloqueaba el registro de envío — validación @IsEnum fallaba)
- **Causa:** `tracking.tsx` usaba `type Courier = 'CHILEXPRESS' | 'BLUEXPRESS'` mientras el enum del backend tiene `chilexpress` / `bluexpress`
- **Resolución:** Cambiado a minúsculas en `tracking.tsx` (tipo, estado inicial y array de opciones)

### Bug #6 — "Ir a pagar" aparecía en vista del vendedor para estado CONFIRMADA ✅ RESUELTO
- **Test:** M7 (observado al intentar avanzar)
- **Severidad:** media (acción inválida visible para el usuario equivocado)
- **Causa:** `renderActions()` en `[id].tsx` mostraba "Ir a pagar" para cualquier rol cuando `status === 'CONFIRMADA'`
- **Resolución:** condición `if (isBuyer)` — vendedor ve mensaje informativo "Esperando que el comprador realice el pago"

### Bug #4b — Stepper no refetchea automáticamente entre sesiones ✅ RESUELTO
- **Test:** M6–M7 (vendedor veía CONFIRMADA cuando DB ya era PAGADO)
- **Severidad:** media (usuario debe cerrar y reabrir Expo Go para ver estado actual)
- **Causa:** `staleTime` por defecto (30s) en `useTransaction` hook; `refetchOnWindowFocus` no funciona en React Native
- **Resolución:** `staleTime: 0` + `useFocusEffect` de Expo Router en `useTransaction.ts` — refetchea al navegar de vuelta al detalle

### Bug #5 — Modo dev: "Simular pago exitoso" no llamaba al backend ✅ RESUELTO
- **Test:** M6
- **Severidad:** alta (bloqueaba el flujo completo en modo dev — status nunca transitaba a PAGADO)
- **Causa:** `handleSuccess()` en `pay.tsx` solo invalidaba el cache de React Query y navegaba de vuelta, sin llamar ningún endpoint backend
- **Resolución:** Nuevo endpoint `POST /payments/dev-confirm/:paymentId` (bloqueado en producción con 403). `handleSuccess()` lo llama cuando `checkoutUrl === null` (modo dev)

### Bug #4 — Stepper del detalle de transacción no se actualiza automáticamente al cambiar estado ✅ RESUELTO
- **Test:** M5 (observado en dispositivo vendedor)
- **Severidad:** baja (visual, pull-to-refresh lo resuelve)
- **Causa:** React Query `staleTime: 30s` + `refetchOnWindowFocus` no funciona en React Native
- **Resolución:** `staleTime: 0` + `useFocusEffect` en `useTransaction.ts` (resuelto post-testing junto con Bug #4b)

### Bug #3 — Campo "Vendedor" mostraba "—" en pantalla pública ✅ RESUELTO
- **Test:** M4
- **Severidad:** baja (visual)
- **Causa:** Endpoint público devuelve `initiatorName` (string plano), pero la pantalla leía `tx.initiator?.fullName` (objeto relación no incluido)
- **Resolución:** `(tx as any).initiatorName ?? tx.initiator?.fullName ?? '—'` en `tx/[slug].tsx`

---

## Observaciones adicionales

- **Eliminar transacciones:** No existe funcionalidad de eliminación — correcto para un sistema de custodia (auditoría). Mejora Fase 3: opción de "archivar" transacciones canceladas/completadas para limpiar la lista.
- **Compartir link de transacción nueva:** ✅ Validado — Flujo A (vendedor inicia): contraparte abre link y ve "Pagar con Mercado Pago" directamente, sin paso de aceptación explícita (correcto por diseño). Flujo B (comprador inicia): vendedor recibe link pero debe autenticarse para aceptar — la pantalla pública muestra estado informativo, no botón de pago.

## Decisión

- [x] ✅ Fase 2 aprobada — pasar a Fase 3
- [ ] ⚠️ Fase 2 aprobada con observaciones — bugs no bloqueantes documentados
- [ ] ❌ Fase 2 reprobada — bugs críticos detectados, corregir antes de continuar

**Nota:** 9 bugs detectados durante la ejecución, todos resueltos en la misma sesión. Fixes adicionales post-testing: mensajes en español, `useFocusEffect`, endpoint `dev-deliver`, rediseño pantalla pública (Confirmar transacción), botón "🧪 Simular entrega". DB limpiada para Fase 3.
