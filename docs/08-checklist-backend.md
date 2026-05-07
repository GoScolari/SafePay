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

## UsersModule
- [ ] `GET /users/me` — retornar perfil del usuario autenticado
- [ ] `PATCH /users/me` — actualizar nombre, email, device token
- [ ] `POST /users/validate-rut` — validar RUT chileno (algoritmo módulo 11)
- [ ] `GET /users/:id/reputation` — retornar rating y total de transacciones
- [ ] `GET /users/mp/connect` — generar URL de autorización OAuth Mercado Pago
- [ ] `GET /users/mp/callback` — recibir `code`, obtener `access_token` y guardarlo cifrado AES-256
- [ ] `DELETE /users/mp/disconnect` — revocar y eliminar token MP
- [ ] `GET /users/mp/status` — verificar si cuenta MP está conectada
- [ ] DTOs con validación

---

## TransactionsModule
- [ ] `POST /transactions` — crear transacción, generar `slug` único, calcular `fee`, setear `expires_at` +24h
- [ ] `GET /transactions/my` — listar transacciones del usuario autenticado (iniciador o contraparte)
- [ ] `GET /transactions/:id` — detalle completo con relaciones
- [ ] `GET /tx/:slug` — lookup público por slug (para el link compartible)
- [ ] `POST /transactions/:id/accept` — contraparte acepta, transición `PROPUESTA → CONFIRMADA`
- [ ] `POST /transactions/:id/cancel` — cancelar antes del despacho, transición `PAGADO → CANCELADO`
- [ ] Máquina de estados — validar transiciones permitidas
- [ ] Lógica de cálculo de `fee` por tramo de monto
- [ ] Lógica de `fee_payer` (buyer / seller / split) y su efecto en `unit_price` de MP
- [ ] Cron job: expirar `PROPUESTA` sin respuesta en 24h → `EXPIRADO`
- [ ] Cron job: liberar automáticamente `ENTREGADO` tras 48h → `COMPLETADO`
- [ ] DTOs con validación (`CreateTransactionDto`)

---

## PaymentsModule
- [ ] `POST /payments/initiate` — crear preferencia de pago en MP con `marketplace_fee`
- [ ] `POST /payments/release/:id` — liberar fondos retenidos al vendedor
- [ ] `POST /payments/refund/:id` — emitir reembolso completo al comprador
- [ ] `POST /payments/webhook` — recibir eventos MP
- [ ] Validación HMAC-SHA256 del webhook MP (rechazar con 401 si no coincide)
- [ ] Procesar evento `payment.updated` → actualizar `payments.status` y `transactions.status`
- [ ] Transición automática `CONFIRMADA → PAGADO` al recibir webhook de pago exitoso

---

## FilesModule
- [ ] `POST /files/upload` — subir imagen a S3, guardar `s3_key` en `transaction_files`
- [ ] `GET /files/:id/url` — generar URL firmada con expiración 1h (solo para usuarios de la Tx)
- [ ] `DELETE /files/:id` — eliminar de S3 y de la DB
- [ ] Validación de tipo MIME (solo `image/jpeg`, `image/png`, `image/webp`)
- [ ] Límite de tamaño de archivo
- [ ] Verificar que el usuario pertenece a la transacción antes de dar acceso

---

## ShippingModule
- [ ] `POST /shipping/track` — registrar tracking, transición `PAGADO/CONFIRMADA → EN_TRÁNSITO`
- [ ] `GET /shipping/:txId/status` — retornar estado actual del envío
- [ ] `POST /shipping/webhook` — recibir eventos de BlueExpress
- [ ] Integración Chilexpress API — polling cada 2h para envíos `IN_TRANSIT`
- [ ] Integración BlueExpress API — webhook + polling de respaldo
- [ ] Transición automática `EN_TRÁNSITO → ENTREGADO` al confirmar entrega
- [ ] Notificación `TX_SHIPPING_ALERT` en fallo de entrega (Tx permanece `EN_TRÁNSITO`)
- [ ] Cron job: polling automático de envíos activos cada 2h

---

## DisputesModule
- [ ] `POST /disputes/:txId/open` — abrir disputa, congelar pago, setear `respond_before` (+48h)
- [ ] `POST /disputes/:id/respond` — vendedor responde con evidencia
- [ ] `GET /disputes/:id` — detalle de disputa con fotos de publicación y recepción
- [ ] `POST /disputes/:id/resolve` — solo admin, emitir fallo, trigger pago o reembolso
- [ ] Transición `ENTREGADO/EN_TRÁNSITO → EN_DISPUTA`
- [ ] Cron job: escalar disputa sin respuesta del vendedor tras 48h
- [ ] Notificaciones automáticas por cambio de estado de disputa
- [ ] DTOs con validación (`OpenDisputeDto`, `RespondDisputeDto`, `ResolveDisputeDto`)

---

## NotificationsModule
- [ ] `POST /notifications/register-device` — guardar `device_token` FCM en `users`
- [ ] `GET /notifications/my` — listar notificaciones del usuario (últimas 50)
- [ ] `PATCH /notifications/:id/read` — marcar como leída
- [ ] Servicio interno `notify()` — guardar en DB + enviar push FCM
- [ ] Disparar notificaciones automáticas en cada cambio de estado de transacción
- [ ] Disparar SMS vía Twilio en eventos críticos (pago recibido, disputa abierta)

---

## AdminModule
- [ ] `GET /admin/disputes` — lista disputas abiertas y en moderación
- [ ] `GET /admin/disputes/:id` — detalle con evidencia fotográfica
- [ ] `POST /admin/disputes/:id/resolve` — emitir fallo con nota de moderador
- [ ] `GET /admin/transactions` — todas las transacciones con filtros
- [ ] `GET /admin/transactions/:id` — vista completa
- [ ] `POST /admin/transactions/:id/force-status` — cambio manual de estado (casos edge)
- [ ] `GET /admin/users` — lista de usuarios
- [ ] `GET /admin/users/:id` — detalle con historial
- [ ] `POST /admin/users/:id/ban` — bloquear usuario por fraude
- [ ] Todos los endpoints protegidos con `RolesGuard` rol `admin`

---

## Seguridad y calidad
- [ ] Validación HMAC-SHA256 en webhooks de couriers
- [ ] Cifrado AES-256 del `mp_access_token` en DB
- [ ] URLs S3 nunca públicas — solo vía URLs firmadas
- [ ] Rate limiting 5 intentos en rutas `/auth/*`
- [ ] Tests unitarios módulos core (Auth, Transactions, Payments)
- [ ] Tests de integración endpoints principales
- [ ] Cobertura ≥ 80% (requerida por pipeline CI/CD)

---

## Antes de ir a producción
- [ ] Cambiar `synchronize: false` en TypeORM y generar migraciones
- [ ] Variables de entorno cargadas desde AWS Secrets Manager
- [ ] CORS restringido a dominios `safepay.cl`
- [ ] Webhook URL registrado en panel Mercado Pago
- [ ] Cuenta marketplace MP aprobada con Split Payments activo
- [ ] Checklist completo de `07-guia-despliegue.md §06`
