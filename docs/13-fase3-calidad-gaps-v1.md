# Fase 3 — Calidad de código + gaps

**Pre-requisito:** Fase 2 cerrada ✅ (2026-05-14)  
**Estado:** ✅ Cerrada (2026-05-17)  
**Tiempo estimado:** 2–3 días

---

## Objetivo

Cerrar los pendientes técnicos que quedaron fuera del MVP para tener una base sólida antes de tocar Mercado Pago real.

---

## 01. Tareas

### T1 — Notificación `TX_SHIPPED` al comprador ✅

**Archivo:** `backend/src/modules/shipping/shipping.service.ts`  
**Estado:** Implementado. `notificationsService.notify()` con `NotificationType.TX_SHIPPED` al registrar tracking.

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

### T3 — Cobertura de tests ≥ 80% en módulos core ✅

**Estado:** Completado. 64 tests pasando (100% pass rate).

**Resultados:**
- `transactions.service`: **100%** de cobertura — findByUser, findArchivedByUser, archive, deliver, expireProposals, autoRelease
- `auth.service`: **97%** de cobertura — register, login, verifyOtp (válido e inválido), logout, refresh
- `payments.service`: >80% — unit_price, initiate, release, refund, webhook HMAC

**Archivos actualizados:**
```
backend/src/modules/auth/auth.service.spec.ts
backend/src/modules/transactions/transactions.service.spec.ts
backend/src/modules/payments/payments.service.spec.ts
```

---

### T4 — Cerrar observaciones de Fase 2

Las siguientes observaciones quedaron documentadas en `tests/fase2/results.md`:

| Observación | Acción | Estado |
|-------------|--------|--------|
| Archivar transacciones canceladas/completadas | Endpoint `PATCH /transactions/:id/archive` + campo `archived_at` en DB + pantalla mobile de archivadas | ✅ T4a resuelto |
| Flujo B: pantalla pública sin guía al vendedor | Mensaje "Iniciá sesión para aceptar esta transacción" + botón a login | ✅ T4b resuelto |
| M9 pendiente: subida de foto de evidencia | Requiere S3 — postergar a Fase 4 | ⏳ Postergado |
| Push notifications en Expo Go | No disponible en Expo Go SDK 53 — requiere development build | ⏳ Postergado |

**Criterio:** T4a y T4b resueltos ✅. M9 y push formalmente postergados.

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

- [x] `TX_SHIPPED` dispara notificación push al comprador al registrar tracking
- [x] `npm run test:cov` reporta ≥80% en auth (97%), transactions (100%), payments (>80%)
- [ ] `npm run test:e2e` pasa con al menos 1 test de integración por módulo core *(postergado — sin DB de test separada en prototipo)*
- [x] `PATCH /transactions/:id/archive` implementado y testeado
- [x] Flujo B pantalla pública: mensaje claro con botón a login

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
