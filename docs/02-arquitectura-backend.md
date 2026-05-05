# SafePay — Arquitectura del Backend

**Stack:** NestJS · PostgreSQL · REST API · Mercado Pago  
**Versión:** 1.0 · **Fecha:** Mayo 2026 · **Tipo:** Documento técnico interno

---

## 01. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | NestJS | TypeScript nativo, arquitectura modular, inyección de dependencias |
| Base de datos | PostgreSQL + TypeORM | Robusto para transacciones financieras, soporte JSON y enums |
| Autenticación | JWT + OTP SMS | Access token 15min + Refresh token 30 días |
| Pagos | Mercado Pago API | Split payments, retención de fondos, sin licencia CMF propia |
| Storage | AWS S3 / Cloudflare R2 | Imágenes de publicación y recepción con URLs firmadas |
| Notificaciones | FCM + Twilio | Firebase para push, Twilio para SMS de verificación |

---

## 02. Módulos del Sistema

### AuthModule — `core`
Registro, login, verificación OTP por SMS y gestión de tokens JWT.

```
POST /auth/register
POST /auth/login
POST /auth/verify-otp
POST /auth/refresh
POST /auth/logout
```

### UsersModule — `core`
Gestión de perfil de usuario, validación de RUT, registro de identidad básica y conexión de cuenta Mercado Pago del vendedor.

```
GET    /users/me
PATCH  /users/me
POST   /users/validate-rut
GET    /users/:id/reputation

# Conexión cuenta Mercado Pago (OAuth vendedor)
GET    /users/mp/connect       → genera URL de autorización OAuth MP
GET    /users/mp/callback      → recibe code, obtiene access_token, lo guarda cifrado
DELETE /users/mp/disconnect    → revoca y elimina el token MP del vendedor
GET    /users/mp/status        → verifica si la cuenta MP está conectada
```

**Flujo OAuth vendedor en la app:** La pantalla `ProfileScreen` muestra el estado de conexión y un botón "Conectar cuenta Mercado Pago". Al pulsarlo, la app abre un WebView con la URL generada por `/users/mp/connect`. Tras la autorización en MP, el callback guarda el `access_token` cifrado en `users.mp_access_token`.

### TransactionsModule — `principal`
Núcleo del sistema. Gestión completa del ciclo de vida de una transacción y sus estados.

```
POST  /transactions
GET   /transactions/:id
POST  /transactions/:id/accept
POST  /transactions/:id/cancel
GET   /transactions/my
```

### PaymentsModule — `principal`
Integración con Mercado Pago. Retención, liberación de fondos y webhook de eventos.

```
POST /payments/initiate
POST /payments/release/:id
POST /payments/refund/:id
POST /payments/webhook
```

### FilesModule — `soporte`
Upload y gestión de imágenes para registro de publicación y recepción del producto.

```
POST   /files/upload
GET    /files/:id/url
DELETE /files/:id
```

### ShippingModule — `soporte`
Integración con APIs de couriers. Seguimiento automático de envíos por número de tracking.

```
POST /shipping/track
GET  /shipping/:txId/status
POST /shipping/webhook
```

### DisputesModule — `crítico`
Gestión del flujo de disputas. Registro de evidencia, plazos de respuesta y resolución.

```
POST /disputes/:txId/open
POST /disputes/:id/respond
GET  /disputes/:id
POST /disputes/:id/resolve
```

### NotificationsModule — `soporte`
Envío de notificaciones push (FCM) y SMS. Disparadas automáticamente por cambios de estado.

```
POST  /notifications/register-device
GET   /notifications/my
PATCH /notifications/:id/read
```

### AdminModule — `backoffice`
Módulo de administración interna. Acceso restringido a usuarios con rol `admin`. Gestiona la resolución de disputas escaladas y tiene visibilidad total del sistema.

**Roles del sistema:**

| Rol | Descripción | Acceso |
|---|---|---|
| `user` | Comprador o vendedor estándar | Solo sus propias transacciones |
| `admin` | Moderador SafePay | Todas las transacciones y disputas |

**Endpoints admin** (requieren `RolesGuard` con rol `admin`):

```
# Disputas
GET  /admin/disputes                  → lista disputas abiertas y en moderación
GET  /admin/disputes/:id              → detalle completo con evidencia fotográfica
POST /admin/disputes/:id/resolve      → emite fallo con nota de moderador
     body: { resolution: 'buyer'|'seller'|'split', note: string, splitAmount?: number }

# Transacciones
GET  /admin/transactions              → todas las transacciones (con filtros)
GET  /admin/transactions/:id          → vista completa de una transacción
POST /admin/transactions/:id/force-status → cambio manual de estado (casos edge)

# Usuarios
GET  /admin/users                     → lista de usuarios registrados
GET  /admin/users/:id                 → detalle de usuario con historial
POST /admin/users/:id/ban             → bloquear usuario por fraude
```

**Operación en el MVP:**

El moderador opera directamente via estos endpoints usando una herramienta como Postman o Insomnia, autenticado con un token JWT de rol `admin`. No existe panel web en el MVP.

**Deuda técnica documentada:** Panel web admin con las siguientes vistas mínimas:
- Lista de disputas activas ordenadas por urgencia (tiempo restante)
- Vista de detalle con visor de imágenes comparativo (publicación vs recepción)
- Botón de resolución con campo de nota obligatoria

**Creación del primer usuario admin:**

```bash
# Ejecutar directamente en DB — solo una vez al lanzar
UPDATE users SET role = 'admin' WHERE id = 'UUID_DEL_MODERADOR';
```

Para esto, agregar el campo `role` a la tabla `users`:

```
users.role   → ENUM('user', 'admin')   DEFAULT: 'user'
```

---

## 03. Máquina de Estados — Transacción

```
PROPUESTA → CONFIRMADA → PAGADO → EN_TRÁNSITO → ENTREGADO → COMPLETADO
                                                     ↓
                                                EN_DISPUTA → COMPLETADO
                                                           → REEMBOLSADO
PROPUESTA → EXPIRADO (sin respuesta en 24 hrs)
PAGADO    → CANCELADO (antes del despacho)
```

| Estado | Descripción | Trigger |
|---|---|---|
| `PROPUESTA` | Esperando aceptación de la contraparte | Creación |
| `CONFIRMADA` | Contraparte aceptó. Pago habilitado. | `/accept` |
| `PAGADO` | Fondos retenidos en MP. Vendedor notificado. | Webhook MP |
| `EN_TRÁNSITO` | Tracking ingresado. Monitoreo activo. | `POST /track` |
| `ENTREGADO` | Courier confirmó entrega. Timer 48 hrs. | Webhook courier |
| `EN_DISPUTA` | Pago congelado hasta resolución. | `POST /open` |
| `COMPLETADO` | Pago liberado al vendedor. | Confirmación / Timer 48h |
| `CANCELADO` | Devolución automática al comprador. | `/cancel` |
| `REEMBOLSADO` | Disputa resuelta a favor del comprador. | Resolución disputa |
| `EXPIRADO` | Sin respuesta en el plazo definido. | Cron job |

---

## 04. Seguridad y Autenticación

| Aspecto | Implementación |
|---|---|
| JWT Tokens | Access 15min + Refresh 30 días en HTTP-only cookie |
| Guards NestJS | `JwtAuthGuard` en endpoints protegidos, `RolesGuard` con roles `user` y `admin` |
| Webhook Validation | Verificación HMAC-SHA256 en webhooks de MP y couriers |
| S3 URLs firmadas | Nunca públicas. Expiración 1 hora, solo para usuarios de la transacción |
| Rate Limiting | 100 req/min por IP, 5 intentos en rutas de auth (`@nestjs/throttler`) |
| Datos sensibles | RUT hasheado, tokens MP cifrados AES-256, secretos en variables de entorno |

---

## 05. Variables de Entorno

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safepay_db
DB_USER=***
DB_PASS=***

# Autenticación
JWT_SECRET=***
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=***
JWT_REFRESH_EXPIRES=30d

# Mercado Pago
MP_APP_ID=***
MP_CLIENT_SECRET=***
MP_WEBHOOK_SECRET=***
MP_MARKETPLACE_FEE=990

# Servicios externos
TWILIO_SID=***
TWILIO_TOKEN=***
TWILIO_SERVICE_SID=***
AWS_S3_BUCKET=safepay-files
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
FIREBASE_KEY=***

# App
NODE_ENV=development
API_URL=http://localhost:3000
PORT=3000
```

> **Nunca incluir valores reales en el repositorio.** Usar `.env.example` con claves vacías. En producción, gestionar secretos via AWS Secrets Manager.

---

## 06. Integraciones Externas

| Servicio | Rol | Prioridad |
|---|---|---|
| Mercado Pago API | Retención y liberación de fondos (Split Payments) | Crítico |
| Chilexpress API | Tracking automático de envíos (polling 2 hrs) | Alta |
| BlueExpress API | Tracking automático de envíos (webhooks + polling) | Alta |
| Twilio Verify | OTP por SMS al registro de usuarios | Media |
| Firebase FCM | Push notifications por cambio de estado | Media |
| AWS S3 | Almacenamiento de imágenes de transacciones | Media |
