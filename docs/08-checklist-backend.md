# SafePay — Checklist de Desarrollo Backend

**Stack:** NestJS · PostgreSQL · TypeORM  
**Estado:** En progreso · **Fecha inicio:** Mayo 2026

---

## Infraestructura base
- [x] Proyecto NestJS inicializado en `backend/`
- [x] Dependencias instaladas (TypeORM, JWT, Passport, Throttler, Schedule, S3, Twilio, FCM, Axios)
- [x] Estructura de módulos y carpetas creada
- [x] 8 entidades TypeORM definidas con relaciones e índices
- [x] Enums definidos (`tx_status`, `tx_role`, `user_role`, `payment_status`, etc.)
- [x] Guards creados (`JwtAuthGuard`, `RolesGuard`)
- [x] Decoradores creados (`@CurrentUser()`, `@Roles()`)
- [x] `app.module.ts` configurado (TypeORM, ConfigModule, Throttler, Schedule)
- [x] `main.ts` configurado (ValidationPipe, CORS, cookie-parser, prefix `/api/v1`)
- [x] `GET /api/v1/health` funcionando con verificación de DB
- [x] Docker + PostgreSQL corriendo localmente
- [x] `.env.example` documentado

---

## AuthModule ✅
- [x] `POST /auth/register` — crear usuario con teléfono, enviar OTP vía Twilio Verify
- [x] `POST /auth/verify-otp` — verificar código OTP, marcar `phone_verified = true`
- [x] `POST /auth/login` — login por teléfono, enviar OTP de segundo factor
- [x] `POST /auth/refresh` — rotar access token usando refresh token en cookie HTTP-only
- [x] `POST /auth/logout` — invalidar refresh token
- [x] DTOs con validación (`RegisterDto`, `LoginDto`, `VerifyOtpDto`)
- [x] Generación y firma de JWT (access 15min + refresh 30d en cookie HTTP-only)
- [x] Rate limiting específico en rutas auth (5 intentos)

---

## UsersModule ✅
- [x] `GET /users/me` — retornar perfil del usuario autenticado
- [x] `PATCH /users/me` — actualizar nombre, email, device token
- [x] `POST /users/validate-rut` — validar RUT chileno (algoritmo módulo 11)
- [x] `GET /users/:id/reputation` — retornar rating y total de transacciones
- [x] `GET /users/mp/connect` — generar URL de autorización OAuth Mercado Pago
- [x] `GET /users/mp/callback` — recibir `code`, obtener `access_token` y guardarlo cifrado AES-256
- [x] `DELETE /users/mp/disconnect` — revocar y eliminar token MP
- [x] `GET /users/mp/status` — verificar si cuenta MP está conectada
- [x] DTOs con validación

---

## TransactionsModule ✅
- [x] `POST /transactions` — crear transacción, generar `slug` único, calcular `fee`, setear `expires_at` +24h
- [x] `GET /transactions/my` — listar transacciones del usuario autenticado (iniciador o contraparte)
- [x] `GET /transactions/:id` — detalle completo con relaciones
- [x] `GET /tx/:slug` — lookup público por slug (para el link compartible)
- [x] `POST /transactions/:id/accept` — contraparte acepta, transición `PROPUESTA → CONFIRMADA`
- [x] `POST /transactions/:id/cancel` — cancelar antes del despacho, transición `PAGADO → CANCELADO`
- [x] Máquina de estados — validar transiciones permitidas
- [x] Lógica de cálculo de `fee` por tramo de monto
- [x] Lógica de `fee_payer` (buyer / seller / split) documentada (efecto en `unit_price` se aplica en PaymentsModule)
- [x] Cron job: expirar `PROPUESTA` sin respuesta en 24h → `EXPIRADO`
- [x] Cron job: liberar automáticamente `ENTREGADO` tras 48h → `COMPLETADO`
- [x] DTOs con validación (`CreateTransactionDto`)

---

## PaymentsModule ✅
- [x] `POST /payments/initiate` — crear preferencia de pago en MP con `marketplace_fee`
- [x] `POST /payments/release/:id` — liberar fondos retenidos al vendedor
- [x] `POST /payments/refund/:id` — emitir reembolso completo al comprador
- [x] `POST /payments/webhook` — recibir eventos MP
- [x] Validación HMAC-SHA256 del webhook MP (rechazar con 401 si no coincide)
- [x] Procesar evento `payment.approved/rejected/refunded` → actualizar `payments.status` y `transactions.status`
- [x] Transición automática `CONFIRMADA → PAGADO` al recibir webhook de pago exitoso

---

## FilesModule ✅
- [x] `POST /files/upload` — subir imagen a S3, guardar `s3_key` en `transaction_files`
- [x] `GET /files/:id/url` — generar URL firmada con expiración 1h (solo para usuarios de la Tx)
- [x] `DELETE /files/:id` — eliminar de S3 y de la DB
- [x] Validación de tipo MIME (solo `image/jpeg`, `image/png`, `image/webp`)
- [x] Límite de tamaño de archivo (5 MB)
- [x] Verificar que el usuario pertenece a la transacción antes de dar acceso

---

## ShippingModule ✅
- [x] `POST /shipping/track` — registrar tracking, transición `PAGADO → EN_TRÁNSITO`
- [x] `GET /shipping/:txId/status` — retornar estado actual del envío
- [x] `POST /shipping/webhook` — recibir eventos de BlueExpress con HMAC-SHA256
- [x] Integración Chilexpress API — polling cada 2h para envíos `IN_TRANSIT`
- [x] Integración BlueExpress API — webhook + polling de respaldo
- [x] Transición automática `EN_TRÁNSITO → ENTREGADO` al confirmar entrega (setea `autoReleaseAt +48h`)
- [x] Notificación `TX_SHIPPING_ALERT` en fallo de entrega + `TX_DELIVERED` al comprador al confirmar entrega
- [x] Cron job: polling automático de envíos activos cada 2h

---

## DisputesModule ✅
- [x] `POST /disputes/:txId/open` — abrir disputa, cancelar `autoReleaseAt`, setear `respond_before` (+48h)
- [x] `POST /disputes/:id/respond` — vendedor responde (guarda `vendorResponse`)
- [x] `GET /disputes/:id` — detalle de disputa con relaciones
- [x] `POST /disputes/:id/resolve` — solo admin (`RolesGuard`), emitir fallo, ejecutar pago/reembolso MP
- [x] Transición `ENTREGADO → EN_DISPUTA` al abrir disputa
- [x] Cron job (`*/30 * * * *`): escalar disputa sin respuesta del vendedor tras 48h → fallo automático comprador
- [x] Notificaciones automáticas — `TX_DISPUTED` al abrir/responder, `TX_COMPLETED` al resolver (admin y auto-escalación)
- [x] DTOs con validación (`OpenDisputeDto`, `RespondDisputeDto`, `ResolveDisputeDto`)

---

## NotificationsModule ✅
- [x] `POST /notifications/register-device` — guardar `device_token` FCM en `users`
- [x] `GET /notifications/my` — listar notificaciones del usuario (últimas 50)
- [x] `PATCH /notifications/:id/read` — marcar como leída
- [x] Servicio interno `notify()` — guardar en DB + enviar push FCM (graceful sin credenciales)
- [x] Disparar `notify()` en cada módulo — conectado en Payments (TX_PAID), Shipping (TX_DELIVERED, TX_SHIPPING_ALERT), Disputes (TX_DISPUTED, TX_COMPLETED)
- [ ] Disparar SMS vía Twilio en eventos críticos — pendiente (fuera de scope MVP)

---

## AdminModule ✅
- [x] `GET /admin/disputes` — lista disputas abiertas y en moderación (OPEN + RESPONDED)
- [x] `GET /admin/disputes/:id` — detalle con relaciones (tx, files, usuarios)
- [x] `POST /admin/disputes/:id/resolve` — emitir fallo, actualizar pago y tx.status
- [x] `GET /admin/transactions` — todas las transacciones con filtro `?status=` opcional
- [x] `GET /admin/transactions/:id` — vista completa con payment, shipment, dispute
- [x] `POST /admin/transactions/:id/force-status` — cambio manual con log de auditoría
- [x] `GET /admin/users` — lista de usuarios (sin campos sensibles)
- [x] `GET /admin/users/:id` — detalle con últimas 20 transacciones
- [x] `POST /admin/users/:id/ban` — setea `banned = true` en users
- [x] Todos los endpoints protegidos con `JwtAuthGuard + RolesGuard` rol `admin`

---

## Seguridad y calidad
- [x] Validación HMAC-SHA256 en webhooks de couriers (Payments + Shipping, `timingSafeEqual`)
- [x] Cifrado AES-256 del `mp_access_token` en DB (UsersService, IV aleatorio)
- [x] URLs S3 nunca públicas — solo vía URLs firmadas (FilesService, `getSignedUrl`)
- [x] Rate limiting 5 intentos en rutas `/auth/*` (`@Throttle` en AuthController)
- [x] Tests unitarios módulos core — 44 tests pasando (Auth, Transactions, Payments)
  - `auth.service.spec.ts` — register, login, verifyOtp, logout, refresh
  - `transactions.service.spec.ts` — fee tramos, create, accept, cancel, findById/Slug (94% cobertura)
  - `payments.service.spec.ts` — unit_price, initiate, release, refund, HMAC webhook (71% cobertura)
- [ ] Tests de integración endpoints principales
- [ ] Cobertura ≥ 80% en módulos core — `transactions.service` 94%, `payments.service` 71%, pendiente `auth.service` y resto

---

## Antes de ir a producción
- [x] `synchronize: false` en producción (`NODE_ENV !== 'development'`) — `data-source.ts` creado, scripts `migration:generate/run/revert` en package.json
- [ ] Variables de entorno cargadas desde AWS Secrets Manager
- [x] CORS restringido a dominios `safepay.cl` en producción, `localhost` en desarrollo
- [ ] Webhook URL registrado en panel Mercado Pago
- [ ] Cuenta marketplace MP aprobada con Split Payments activo
- [ ] Checklist completo de `07-guia-despliegue.md §06`
