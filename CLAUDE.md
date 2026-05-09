# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

## Qué es SafePay

Plataforma de pagos en custodia (escrow) C2C para Chile. Retiene el pago del comprador y lo libera al vendedor solo cuando se confirma la entrega. Funciona sobre cualquier canal de contacto externo (Yapo, Facebook, WhatsApp) sin ser un marketplace.

## Documentación de arquitectura

Toda la especificación del sistema está en `SafePay/Docs/`. Consultar siempre antes de tomar decisiones estructurales:

| Archivo | Contenido |
|---|---|
| `01-concepto-producto-v1.md` | Flujos de negocio, estados de transacción, modelo de cobro |
| `02-arquitectura-backend-v1.md` | Módulos NestJS, endpoints, máquina de estados, AdminModule |
| `03-arquitectura-mobile-v1.md` | Estructura Expo Router, pantallas, Zustand stores |
| `04-integraciones-v1.md` | Mercado Pago (OAuth + Split Payments), couriers, Twilio, FCM |
| `05-modelo-datos-v1.md` | Esquema PostgreSQL completo — 8 tablas, 13 enums |
| `06-flujo-disputas-v1.md` | Plazos, criterios de resolución, cron jobs, notificaciones |
| `07-guia-despliegue-v1.md` | Docker, GitHub Actions, AWS ECS/RDS/S3, checklist prod |

## Stack

**Backend:** NestJS + TypeScript + TypeORM + PostgreSQL 15
**Mobile:** React Native + Expo Router v6 + Zustand + React Query + Axios
**Pagos:** Mercado Pago Marketplace API (Split Payments)
**Infra:** AWS ECS Fargate + RDS + S3 + Secrets Manager · Docker · GitHub Actions

## Convenciones obligatorias

- Nombres de tablas y campos en `snake_case`
- Clases y módulos en `PascalCase`
- Todos los montos en CLP como enteros (sin decimales)
- UUIDs generados con `gen_random_uuid()`
- Timestamps siempre en UTC
- No crear nuevos enums sin revisar `05-modelo-datos-v1.md` — los existentes están definidos ahí

## Arquitectura backend — módulos NestJS

El backend se organiza en 9 módulos con jerarquía clara:

- **`AuthModule`** (core): registro, login, OTP SMS via Twilio, JWT (access 15min + refresh 30d en HTTP-only cookie)
- **`UsersModule`** (core): perfil, validación RUT, conexión OAuth MP del vendedor (`/users/mp/connect` → `/users/mp/callback`)
- **`TransactionsModule`** (principal): ciclo de vida completo, máquina de 10 estados
- **`PaymentsModule`** (principal): checkout MP, webhook HMAC-SHA256, retención/liberación/reembolso
- **`FilesModule`** (soporte): upload a S3, URLs firmadas (expiración 1h, privadas)
- **`ShippingModule`** (soporte): tracking Chilexpress (polling 2h) + BlueExpress (webhook + polling)
- **`DisputesModule`** (crítico): apertura, respuesta, resolución, cron jobs automáticos
- **`NotificationsModule`** (soporte): push FCM + SMS, historial en DB
- **`AdminModule`** (backoffice): endpoints `/admin/*` protegidos con `RolesGuard` rol `admin`; en MVP el moderador opera via Postman con JWT admin

## Máquina de estados — transacciones

```
PROPUESTA → CONFIRMADA → PAGADO → EN_TRÁNSITO → ENTREGADO → COMPLETADO
                                                    ↓
                                               EN_DISPUTA → COMPLETADO
                                                          → REEMBOLSADO
PROPUESTA → EXPIRADO   (cron, 24h sin respuesta)
PAGADO    → CANCELADO  (antes del despacho)
```

Los fallos de courier **no cambian `tx_status`** — se registran en `shipments.status = 'failed'` y generan notificación `TX_SHIPPING_ALERT`. La transacción permanece en `EN_TRÁNSITO`.

## Seguridad — puntos clave

- Webhooks MP y couriers: validar firma HMAC-SHA256 antes de procesar; rechazar con HTTP 401 si no coincide
- `mp_access_token` del vendedor: cifrado AES-256 en DB
- S3: URLs firmadas, nunca públicas, solo accesibles para usuarios de la transacción
- Rate limiting: 100 req/min por IP general, 5 intentos en rutas auth (`@nestjs/throttler`)
- Rol admin: asignado directamente en DB (`UPDATE users SET role = 'admin' WHERE id = '...'`)

## Mecánica del split de fee en Mercado Pago

SafePay siempre envía un único `marketplace_fee` a MP. El "split" solo afecta el `unit_price`:
- `fee_payer = 'buyer'` → `unit_price = amount + fee`
- `fee_payer = 'seller'` → `unit_price = amount`
- `fee_payer = 'split'` → `unit_price = amount + Math.ceil(fee / 2)`

El vendedor absorbe su mitad vía descuento en el pago neto; no hay dos operaciones en MP.

## Arquitectura mobile — navegación Expo Router

```
app/
├── (auth)/          → público: login, register, verify-otp
├── (app)/           → requiere auth: home, profile, transactions/*, disputes/*
└── tx/[slug].tsx    → deeplink público safepay.cl/tx/:slug
```

El pago desde `TxLinkScreen` es 100% anónimo (checkout MP via WebView). Tras pagar, SafePay solicita registro con `PostPayRegister`. Confirmar recepción, abrir disputa e ingresar tracking sí requieren auth.

## Estilos mobile

Los estilos se implementan con `StyleSheet.create()` nativo de React Native. **No usar NativeWind ni Tailwind** — el proyecto no tiene NativeWind instalado. Colores centralizados en `mobile/constants/colors.ts`.

## Variables de entorno

Ver `.env.example` en la raíz del backend. En producción los secretos se gestionan via AWS Secrets Manager — nunca hardcodear. Variables críticas: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MP_APP_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `TWILIO_SERVICE_SID`, `AWS_S3_BUCKET`, `FIREBASE_KEY`.
