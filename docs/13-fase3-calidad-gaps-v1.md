# Fase 3 — Calidad de código + gaps

**Pre-requisito:** Fase 2 cerrada ✅ (2026-05-14)  
**Estado:** ⏳ Pendiente  
**Tiempo estimado:** 2–3 días

---

## Objetivo

Cerrar los pendientes técnicos que quedaron fuera del MVP para tener una base sólida antes de tocar Mercado Pago real.

---

## 01. Tareas

### T1 — Notificación `TX_SHIPPED` al comprador

**Archivo:** `backend/src/modules/shipping/shipping.service.ts` — línea 92  
**Estado actual:** `// TODO: notify TX_SHIPPED al comprador`

**Qué hacer:**
- Obtener el `buyerId` a partir de `tx.initiatorRole`:
  ```typescript
  const buyerId = tx.initiatorRole === TxRole.SELLER ? tx.counterpartId : tx.initiatorId;
  ```
- Llamar a `notificationsService.notify()` con `NotificationType.TX_SHIPPED` (o crear ese enum si no existe)
- Verificar que `TX_SHIPPED` está en el enum `NotificationType` en `common/enums.ts`

**Criterio:** Al registrar tracking (`POST /shipping/track`), el comprador recibe notificación push.

---

### T2 — Tests de integración de endpoints principales

**Objetivo:** Cubrir los flujos críticos con tests de integración usando SuperTest + base de datos real (no mocks).

**Módulos a cubrir:**
- `AuthModule`: register → OTP → login → refresh token
- `TransactionsModule`: crear → aceptar → cancelar → máquina de estados
- `PaymentsModule`: initiate → dev-confirm → release → refund
- `ShippingModule`: registerTracking → getStatus → devDeliver

**Setup requerido:**
- Base de datos de test separada (`safepay_test`)
- `jest.config.ts` con `testEnvironment: 'node'` y `globalSetup` / `globalTeardown`
- Truncate de tablas entre tests (no entre assertions)

**Archivos a crear:**
```
backend/test/
├── auth.integration.spec.ts
├── transactions.integration.spec.ts
├── payments.integration.spec.ts
└── shipping.integration.spec.ts
```

**Criterio:** `npm run test:e2e` pasa sin errores contra DB real.

---

### T3 — Cobertura de tests ≥ 80% en módulos core

**Estado actual:**
- `payments.service`: ~71%
- `auth.service`: sin medir
- `transactions.service`: sin medir

**Objetivo:** `npm run test:cov` reporta ≥80% en:
- `auth.service.ts`
- `transactions.service.ts`
- `payments.service.ts`
- `shipping.service.ts`
- `disputes.service.ts`

**Archivos a completar:**
```
backend/src/modules/auth/auth.service.spec.ts
backend/src/modules/transactions/transactions.service.spec.ts
backend/src/modules/payments/payments.service.spec.ts
```

**Criterio:** `npm run test:cov -- --coverageThreshold='{"global":{"lines":80}}'` pasa sin errores.

---

### T4 — Cerrar observaciones de Fase 2

Las siguientes observaciones quedaron documentadas en `tests/fase2/results.md`:

| Observación | Acción |
|-------------|--------|
| Archivar transacciones canceladas/completadas | Agregar endpoint `PATCH /transactions/:id/archive` + campo `archived_at` en DB |
| Flujo B: pantalla pública muestra estado informativo sin guiar al vendedor | Mejorar UX: mensaje claro "Inicia sesión para aceptar esta transacción" + botón a login |
| M9 pendiente: subida de foto de evidencia | Requiere S3 — postergar a Fase 4 |
| Push notifications en Expo Go | No disponible en Expo Go SDK 53 — requiere development build en Fase 4 |

**Criterio:** T4a (archivar) y T4b (flujo B UX) resueltos. M9 y push formalmente postergados a Fase 4.

---

## 02. Orden de ejecución recomendado

```
T1 (30 min) → T4a + T4b (1h) → T2 (1 día) → T3 (1 día)
```

T1 es el fix más pequeño y elimina el único TODO crítico de producción.  
T4a/T4b son cambios pequeños de alta visibilidad.  
T2 y T3 son el grueso del trabajo y pueden hacerse en paralelo.

---

## 03. Criterio de aprobación de Fase 3

- [ ] `TX_SHIPPED` dispara notificación push al comprador al registrar tracking
- [ ] `npm run test:cov` reporta ≥80% en auth, transactions, payments y shipping
- [ ] `npm run test:e2e` pasa con al menos 1 test de integración por módulo core
- [ ] `PATCH /transactions/:id/archive` implementado y testeado
- [ ] Flujo B pantalla pública: mensaje claro con botón a login

---

## 04. Criterio de rechazo

- `TX_SHIPPED` no implementado (TODO sin resolver en producción)
- Cobertura <60% en algún módulo core
- Tests de integración fallan contra DB real

---

## 05. Documentos relacionados

- Protocolo: este documento (`docs/13-fase3-calidad-gaps-v1.md`)
- Ruta de avance: `docs/12-ruta-avance-v1.md`
- Resultados Fase 2: `tests/fase2/results.md`
- Modelo de datos: `docs/05-modelo-datos-v1.md`
