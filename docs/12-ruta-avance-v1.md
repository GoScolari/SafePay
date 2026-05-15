# SafePay — Ruta de Avance

**Stack:** NestJS · PostgreSQL · React Native · Expo Router v6  
**Estado:** Fase 1 cerrada ✅ · **Fecha inicio:** Mayo 2026

---

## Mapa de fases

| Fase | Nombre | Estado | Tiempo est. | Habilita |
|------|--------|--------|-------------|----------|
| **Fase 1** | Smoke test backend | ✅ Cerrada (2026-05-08) | — | Integración mobile |
| **Fase 2** | Integración mobile ↔ backend local | ✅ Cerrada (2026-05-14) | — | Confianza en flujos E2E |
| **Fase 3** | Calidad de código + gaps | ⏳ Pendiente | 2–3 días | Base sólida para sandbox |
| **Fase 4** | Sandbox Mercado Pago | ⏳ Pendiente | 1–2 días | Pagos reales validados |
| **Fase 5** | Preparación producción | ⏳ Pendiente | 3–5 días | Deploy en AWS |

---

## Fase 1 — Smoke test backend ✅ CERRADA

**Objetivo:** Validar que la API NestJS arranca limpia, conecta a PostgreSQL y los endpoints críticos responden correctamente.

**Resultado:** 19/19 tests pasados. 3 bugs detectados y resueltos el mismo día.

**Documentos:**
- Protocolo: `docs/10-fase1-smoke-test-backend-v1.md`
- Resultados: `tests/fase1/results.md`
- Checklist: `docs/08-checklist-backend-v1.md`

---

## Fase 2 — Integración mobile ↔ backend local ⏳

**Objetivo:** Validar que la app React Native/Expo se conecta al backend local y los flujos end-to-end funcionan en un dispositivo o emulador real.

**Alcance:**
- Auth flow completo (register → OTP → login → JWT persistido)
- Ciclo de transacción completo: crear → aceptar → pagar (modo dev simulado) → tracking → confirmar recepción → completado
- Deep link público `tx/[slug]` sin autenticación
- Subida de fotos a S3 con URL firmada
- Flujo de disputa (E2E)
- Notificaciones push (FCM en dispositivo real)

**Criterio de aprobación:** M1–M10 + N1–N5 pasando en dispositivo o emulador. Flujo vendedor→comprador completo ejecutado sin interrupciones.

**Criterio de rechazo:** Auth no funciona, no se puede crear transacción, o el pago simulado no transiciona de estado.

**Documentos:**
- Protocolo: `docs/11-fase2-integracion-mobile-backend-local-v1.md`
- Resultados: `tests/fase2/results.md`

---

## Fase 3 — Calidad de código + gaps ⏳ En curso

**Objetivo:** Cerrar los pendientes técnicos que quedaron fuera del MVP para tener una base sólida antes de tocar Mercado Pago real.

**Alcance:**
- Implementar notificación `TX_SHIPPED` (TODO pendiente en `shipping.service.ts`)
- Tests de integración de endpoints principales (supertest + DB real)
- Cobertura de tests ≥ 80% en todos los módulos core (`auth.service` actualmente sin medir, `payments.service` en 71%)
- Revisar y cerrar cualquier observación de Fase 2

**Criterio de aprobación:** `npm run test:cov` reporta ≥80% en auth, transactions y payments. `TX_SHIPPED` dispara push al comprador al registrar tracking.

**Documentos:**
- Protocolo: `docs/13-fase3-calidad-gaps-v1.md`
- Resultados: `tests/fase3/results.md` (pendiente)

---

## Fase 4 — Sandbox Mercado Pago ⏳

**Objetivo:** Validar el flujo de pago real en el entorno de sandbox de Mercado Pago antes de tocar producción.

**Pre-requisitos:**
- Cuenta Mercado Pago creada y verificada
- Cuenta marketplace (Split Payments) aprobada por MP
- Credenciales sandbox: `MP_APP_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`
- URL pública del backend (ngrok o servidor de staging) para recibir webhooks

**Alcance:**
- Conectar cuenta vendedor vía OAuth (`/users/mp/connect → /users/mp/callback`)
- Crear preferencia de pago real en sandbox (`/payments/initiate`)
- Completar checkout en WebView con tarjeta de prueba de MP
- Recibir webhook `payment.approved` y verificar transición `CONFIRMADA → PAGADO`
- Probar reembolso (`/payments/refund/:id`)
- Verificar `marketplace_fee` en panel de MP sandbox

**Criterio de aprobación:** Pago aprobado end-to-end en sandbox, webhook recibido con HMAC válido, transición de estado correcta, fee debitado correctamente.

---

## Fase 5 — Preparación producción ⏳

**Objetivo:** Dejar el sistema listo para un primer deploy en AWS con un checklist completo verificado.

**Pre-requisitos:** Fases 2, 3 y 4 aprobadas.

**Alcance:**

1. **Infraestructura AWS:**
   - ECS Fargate (backend)
   - RDS PostgreSQL 15 (db)
   - S3 (archivos)
   - Secrets Manager (variables críticas)
   - ECR (imágenes Docker)

2. **CI/CD — GitHub Actions:**
   - Pipeline: test → build → push ECR → deploy ECS
   - Variables de entorno desde Secrets Manager
   - Migración automática al deploy (`npm run migration:run`)

3. **Backend producción:**
   - `NODE_ENV=production` con Joi validando todas las vars críticas
   - `synchronize: false` (ya implementado)
   - CORS restringido a `safepay.cl`
   - Webhook URL registrado en panel MP

4. **Mobile producción:**
   - Build de producción (EAS Build)
   - `EXPO_PUBLIC_API_URL` apuntando a dominio real
   - App firmada para TestFlight / Play Store interno

**Criterio de aprobación:** Checklist completo de `07-guia-despliegue-v1.md §06` verificado. Health check en URL pública responde `{ status: "ok", db: "connected" }`.

---

## Estado actual de pendientes transversales

| Pendiente | Fase | Prioridad |
|-----------|------|-----------|
| `TX_SHIPPED` — notificación al comprador al registrar tracking | Fase 3 | Media |
| Tests de integración endpoints | Fase 3 | Media |
| Cobertura ≥80% auth.service + resto | Fase 3 | Media |
| Cuenta marketplace MP aprobada (Split Payments) | Fase 4 | Alta — bloqueante |
| Webhook URL en panel MP | Fase 4 | Alta |
| Variables en AWS Secrets Manager | Fase 5 | Alta |
| CI/CD pipeline | Fase 5 | Alta |
