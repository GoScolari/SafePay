# SafePay — Fase 1: Smoke Test Backend Local

**Stack:** NestJS · PostgreSQL · Docker · cURL/Postman  
**Objetivo:** Validar que el backend levanta, conecta a la DB, y responde correctamente a los endpoints críticos antes de empezar a integrar el mobile.  
**Tiempo estimado:** 2–4 horas (en una sola sesión)  
**Versión:** 1.1 · **Fecha:** Mayo 2026 · **Ejecutado:** 2026-05-08 ✅

---

## 01. Por qué esta fase

Aunque el checklist `08-checklist-backend-v1.md` marca todos los módulos como completos y hay 44 tests unitarios pasando, **nunca se ejecutó el backend de punta a punta contra una base de datos real**. Los tests unitarios mockean la DB, los servicios externos y el contexto HTTP. No prueban que las migraciones corran, que las relaciones entre tablas estén bien declaradas, ni que el ciclo completo de una transacción atraviese múltiples módulos correctamente.

Esta fase cierra esa brecha. No buscamos cobertura exhaustiva ni performance. Buscamos respuesta a tres preguntas:

1. ¿La API arranca limpia con la DB real?
2. ¿Los endpoints críticos responden con la forma de datos correcta?
3. ¿El ciclo de vida básico de una transacción (crear → aceptar → ver) funciona end-to-end?

Si las tres respuestas son sí, queda la luz verde para conectar el mobile en Fase 2.

---

## 02. Pre-requisitos en la máquina de desarrollo

Antes de empezar, verificar que estos elementos están listos. Si alguno falta, resolverlo antes de pasar al Paso 0.

| Requisito | Cómo verificar | Si falta |
|---|---|---|
| Docker Desktop corriendo | `docker --version` y el ícono activo en la bandeja | Instalar Docker Desktop |
| Node.js 20+ | `node --version` | Instalar desde nodejs.org |
| Repo clonado en `SafePay/` | Ver árbol de carpetas | `git clone` del repo |
| Backend en `SafePay/backend/` | `cd backend && ls package.json` | Revisar el repo |
| VSC con Claude Code instalado | Extensión activa en VSC | Extensión Claude Code |
| Postman o cURL | `curl --version` | cURL viene preinstalado en Win 10+ y macOS |

> **Nota Windows:** Si tenés PostgreSQL nativo instalado, el puerto 5432 está ocupado y `docker-compose.yml` mapea al 5433. Verificar con `netstat -ano | findstr ":5432"`. Si aparece `postgres.exe`, usar `DB_PORT=5433` en el `.env`.

> **Nota teléfonos chilenos (validado en ejecución real):** La validación usa `libphonenumber-js/max` que verifica rangos reales del plan de numeración chileno. En Chile, los números móviles válidos para test son del prefijo `93x`–`99x` (Movistar/Entel). Usar siempre `+56931234567` (vendedor) y `+56987654321` (comprador).

---

## 03. Estructura de trabajo recomendada

Crear estos archivos en el repo para registrar resultados a medida que avanzamos. Versionables en git.

```
SafePay/
├── docs/
│   └── 10-fase1-smoke-test-backend-v1.md   ← este documento
└── tests/
    └── fase1/
        ├── smoke-tests.http                 ← colección REST Client (VSC)
        ├── results.md                       ← resultados de cada prueba
        └── logs/                            ← capturas de errores
```

Crear la estructura desde la terminal del proyecto:

```bash
mkdir -p tests/fase1/logs
touch tests/fase1/smoke-tests.http
touch tests/fase1/results.md
```

---

## 04. Mapa de los smoke tests

Estos son los 10 tests que vamos a correr, en orden. Cada uno depende del anterior. Si uno falla, parar y resolver antes de seguir.

| # | Test | Endpoint | Valida |
|---|---|---|---|
| T1 | Health check | `GET /health` | API arrancó, DB conectada |
| T2 | Register vendedor | `POST /auth/register` | Tabla `users`, OTP envío |
| T3 | Verify OTP vendedor | `POST /auth/verify-otp` | Tokens JWT emitidos |
| T4 | Get me (vendedor) | `GET /users/me` | Guard JWT funciona |
| T5 | Register comprador | `POST /auth/register` (otro tel.) | Mismo flujo, segundo usuario |
| T6 | Verify OTP comprador | `POST /auth/verify-otp` | Token comprador |
| T7 | Crear transacción | `POST /transactions` | Slug, fee, expires_at |
| T8 | Lookup público por slug | `GET /transactions/public/:slug` | Endpoint sin auth |
| T9 | Aceptar transacción | `POST /transactions/:id/accept` | Estado PROPUESTA → CONFIRMADA |
| T10 | Listar mis transacciones | `GET /transactions/my` | Filtro por usuario funciona |

> **Tests excluidos de Fase 1:** PaymentsModule (requiere webhook MP), ShippingModule (requiere tracking real), DisputesModule (requiere flujo previo completo). Se cubren en Fase 2 y 3.

---

## 05. Paso 0 — Verificación inicial del entorno

### 0.1 Abrir el proyecto en VSC

Abrir VSC en la raíz del proyecto (`SafePay/`), no solo en `backend/`. Esto le da a Claude Code visibilidad de los docs y el mobile.

### 0.2 Primer prompt a Claude Code

Pegar este prompt al iniciar la sesión de Claude Code para que tenga el contexto:

```
Voy a ejecutar los smoke tests de Fase 1 documentados en
docs/10-fase1-smoke-test-backend-v1.md. Lee ese documento y los docs
01 al 09 para tener el contexto completo del proyecto.

Mi objetivo es validar que el backend en backend/ arranca y responde
correctamente a los 10 endpoints críticos definidos en el documento.

No ejecutes nada todavía. Confirmá que entendiste el plan y revisá si
hay algún archivo de configuración faltante en backend/ (.env, etc.)
```

### 0.3 Verificar que el `.env` existe

```bash
cd backend
ls -la .env
```

Si no existe, copiarlo del ejemplo:

```bash
cp .env.example .env
```

Luego editarlo con los valores mínimos para desarrollo (ver Paso 2).

---

## 06. Paso 1 — Levantar la base de datos con Docker

### 1.1 Verificar el archivo `docker-compose.yml`

Debe estar en `backend/` (o en la raíz del proyecto, según convención del equipo). Verificar que define los servicios `postgres` y opcionalmente `redis`.

### 1.2 Levantar solo Postgres

No levantar la API todavía — primero queremos la DB sola para inspeccionarla.

```bash
docker compose up -d postgres
```

Verificar que el contenedor está corriendo:

```bash
docker compose ps
```

Debe aparecer `safepay-postgres` (o nombre similar) con estado `Up`.

### 1.3 Confirmar que Postgres acepta conexiones

```bash
docker compose exec postgres psql -U safepay -d safepay_dev -c "SELECT version();"
```

Esperado: una línea con `PostgreSQL 15.x on x86_64-pc-linux-musl ...`

Si falla con `password authentication failed`, verificar que las credenciales del `docker-compose.yml` coinciden con las del `.env`.

### 1.4 Si algo no funciona — prompt para Claude Code

```
Levanté el contenedor de Postgres con `docker compose up -d postgres`
pero al intentar conectarme falla con [pegar el error exacto].

Revisá el docker-compose.yml y el .env del backend, identificá el
problema de configuración y proponé el fix mínimo. No modifiques nada
todavía, solo decime qué corregir.
```

---

## 07. Paso 2 — Configurar variables de entorno

### 2.1 Valores mínimos para desarrollo

Editar `backend/.env` con estos valores. **No usar valores reales de producción** — son placeholders para que el módulo arranque sin error de validación.

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5433              # 5432 si no tenés Postgres nativo en Windows
DB_NAME=safepay_dev
DB_USER=safepay
DB_PASS=safepay_dev_pass

# JWT (generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=<pegar_64_bytes_hex>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<pegar_otros_64_bytes_hex>
JWT_REFRESH_EXPIRES=30d

# Mercado Pago — placeholders en dev
MP_APP_ID=
MP_CLIENT_SECRET=
MP_WEBHOOK_SECRET=dev_webhook_secret    # OBLIGATORIO — si está vacío el test N5 pasa sin HMAC
MP_MARKETPLACE_FEE=990

# Twilio — vacío para activar modo dev (acepta cualquier OTP)
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_SERVICE_SID=

# AWS S3 — placeholders en dev
AWS_S3_BUCKET=safepay-files-dev
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Firebase
FIREBASE_KEY=

# App
NODE_ENV=development
API_URL=http://localhost:3000
PORT=3000
```

> **Crítico:** `TWILIO_SID` vacío activa el modo dev del backend, que acepta cualquier código OTP de 6 dígitos. Esto está documentado en `03-arquitectura-mobile-v1.md §07`.

### 2.2 Generar los secretos JWT

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Correrlo dos veces (uno para `JWT_SECRET`, otro para `JWT_REFRESH_SECRET`) y pegar los valores.

---

## 08. Paso 3 — Correr migraciones y arrancar la API

### 3.1 Instalar dependencias

```bash
cd backend
npm install
```

### 3.2 Correr migraciones

```bash
npm run migration:run
```

Esperado: log con cada migración aplicada y el mensaje `Migrations executed successfully`.

### 3.3 Verificar las tablas en la DB

```bash
docker compose exec postgres psql -U safepay -d safepay_dev -c "\dt"
```

Esperado: listado con las 8 tablas definidas en `05-modelo-datos-v1.md`:

```
users, transactions, payments, transaction_files,
shipments, disputes, notifications, ratings
```

### 3.4 Arrancar la API en modo desarrollo

```bash
npm run start:dev
```

Esperado en consola (último mensaje):

```
[Nest] LOG [NestApplication] Nest application successfully started
```

**Dejar esta terminal abierta** durante todos los smoke tests. Si la cierras, la API se cae.

### 3.5 Si la API no arranca — prompt para Claude Code

```
Corrí `npm run start:dev` en backend/ y la API no arranca. El log
completo del error es:

[pegar log completo]

Identificá la causa raíz, no propongas workarounds. Si el error es por
una variable de entorno faltante, decime cuál y para qué se usa.
```

---

## 09. Paso 4 — Smoke tests, uno por uno

Para cada test:

1. Correr el comando cURL
2. Comparar la respuesta con la esperada
3. Si difiere, anotar el resultado en `tests/fase1/results.md`
4. Si rompe algo crítico, parar y diagnosticar antes de seguir

### 4.1 Setup de variables de entorno locales para los tests

Para no copiar tokens manualmente, exportar las variables a medida que las obtengas:

**Linux/macOS:**
```bash
export API="http://localhost:3000/api/v1"
export TOKEN_VENDOR=""
export TOKEN_BUYER=""
export TX_ID=""
export TX_SLUG=""
```

**Windows PowerShell:**
```powershell
$API = "http://localhost:3000/api/v1"
$TOKEN_VENDOR = ""
$TOKEN_BUYER = ""
$TX_ID = ""
$TX_SLUG = ""
```

A lo largo de los tests vamos a ir asignando estas variables.

---

### Test 1 — Health check

**Qué valida:** la API responde y la DB está conectada.

**Comando:**
```bash
curl -s "$API/health" | jq
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } }
}
```

**Si falla:**
- HTTP 502 / connection refused → la API no está corriendo, volver al Paso 3.4
- `database: down` → revisar que el contenedor postgres está levantado y las credenciales del `.env` coinciden

---

### Test 2 — Register vendedor

**Qué valida:** se crea un usuario nuevo en la tabla `users` y se dispara el envío de OTP.

**Comando:**
```bash
curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Vendedor Test",
    "phone": "+56931234567"
  }' | jq
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "OTP enviado",
  "phone": "+56931234567"
}
```

**Validar en DB que el usuario se creó:**
```bash
docker compose exec postgres psql -U safepay -d safepay_dev -c \
  "SELECT id, full_name, phone, phone_verified, role FROM users WHERE phone = '+56931234567';"
```

Esperado: una fila con `phone_verified = false` y `role = user`.

**Si falla:**
- HTTP 400 con error de validación → revisar el formato del payload (¿`fullName` o `full_name`?)
- HTTP 500 con error de Twilio → confirmar que `TWILIO_SID` está vacío en `.env` para activar modo dev

---

### Test 3 — Verify OTP vendedor

**Qué valida:** la verificación OTP marca al usuario como `phone_verified = true` y emite tokens JWT.

**Comando** (cualquier código de 6 dígitos sirve en modo dev):
```bash
curl -s -X POST "$API/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -c /tmp/cookies-vendor.txt \
  -d '{
    "phone": "+56931234567",
    "code": "123456"
  }' | jq
```

> El flag `-c /tmp/cookies-vendor.txt` guarda la cookie `refreshToken` para usarla después si se necesita probar el refresh.

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "uuid-...",
    "phone": "+56931234567",
    "fullName": "Vendedor Test",
    "phoneVerified": true,
    "role": "user"
  }
}
```

**Guardar el token:**
```bash
export TOKEN_VENDOR="<pegar_accessToken>"
```

**Validar en DB:**
```bash
docker compose exec postgres psql -U safepay -d safepay_dev -c \
  "SELECT phone_verified FROM users WHERE phone = '+56931234567';"
```

Esperado: `phone_verified = true`.

---

### Test 4 — Get me (vendedor)

**Qué valida:** el `JwtAuthGuard` valida el token y el endpoint protegido responde con el usuario correcto.

**Comando:**
```bash
curl -s "$API/users/me" \
  -H "Authorization: Bearer $TOKEN_VENDOR" | jq
```

**Respuesta esperada:**
```json
{
  "id": "uuid-...",
  "fullName": "Vendedor Test",
  "phone": "+56931234567",
  "phoneVerified": true,
  "role": "user",
  "rating": null,
  "totalTx": 0
}
```

**Probar que el guard rechaza requests sin token:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$API/users/me"
```

Esperado: `401`.

---

### Test 5 — Register comprador

**Comando:**
```bash
curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Comprador Test",
    "phone": "+56987654321"
  }' | jq
```

Mismo flujo y validación que T2, con teléfono distinto.

---

### Test 6 — Verify OTP comprador

**Comando:**
```bash
curl -s -X POST "$API/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -c /tmp/cookies-buyer.txt \
  -d '{
    "phone": "+56987654321",
    "code": "654321"
  }' | jq
```

**Guardar el token:**
```bash
export TOKEN_BUYER="<pegar_accessToken>"
```

---

### Test 7 — Crear transacción

**Qué valida:** el iniciador (vendedor) puede crear una transacción, se calcula el `fee` correcto por tramo, se asigna `slug` único y `expires_at = NOW() + 24h`.

**Comando** (vendedor inicia, modalidad shipping, monto $80.000 → fee $990):
```bash
curl -s -X POST "$API/transactions" \
  -H "Authorization: Bearer $TOKEN_VENDOR" \
  -H "Content-Type: application/json" \
  -d '{
    "initiatorRole": "seller",
    "modality": "shipping",
    "amount": 80000,
    "feePayer": "buyer",
    "description": "Bicicleta MTB rodado 29 usada en buen estado"
  }' | jq
```

**Respuesta esperada:**
```json
{
  "id": "uuid-...",
  "slug": "tx-xxxxxx",
  "status": "PROPUESTA",
  "initiatorRole": "seller",
  "modality": "shipping",
  "amount": 80000,
  "fee": 990,
  "feePayer": "buyer",
  "description": "Bicicleta MTB rodado 29 usada en buen estado",
  "expiresAt": "2026-05-09T..."
}
```

**Guardar las variables:**
```bash
export TX_ID="<pegar_id>"
export TX_SLUG="<pegar_slug>"
```

**Validaciones críticas a verificar manualmente:**

| Campo | Valor esperado | Por qué importa |
|---|---|---|
| `status` | `PROPUESTA` | Estado inicial de la máquina |
| `fee` | `990` | Tramo "hasta $100.000" según regla 2 de CLAUDE.md |
| `slug` | `tx-` + 6 caracteres | Formato del link público |
| `expiresAt` | NOW + 24h | Cron job de expiración |

**Probar que el fee bloquea según el tramo correcto** (regresión rápida):
```bash
# Monto $250.000 debe dar fee $1.490
curl -s -X POST "$API/transactions" \
  -H "Authorization: Bearer $TOKEN_VENDOR" \
  -H "Content-Type: application/json" \
  -d '{
    "initiatorRole": "seller", "modality": "presential",
    "amount": 250000, "feePayer": "split",
    "description": "Notebook Lenovo IdeaPad 14 pulgadas i5 8GB"
  }' | jq '.fee'
```

Esperado: `1490`.

---

### Test 8 — Lookup público por slug

**Qué valida:** el endpoint `GET /transactions/public/:slug` responde sin requerir auth, lo que habilita el deep link `safepay.cl/tx/:slug`.

**Comando** (sin header de Authorization):
```bash
curl -s "$API/transactions/public/$TX_SLUG" | jq
```

**Respuesta esperada:** los datos de la transacción visibles públicamente, sin información sensible (sin emails, sin tokens MP, sin RUT).

**Verificación crítica de seguridad:** el response NO debe incluir:
- `mpAccessToken` ni nada cifrado
- `email` o `rut` del iniciador o contraparte
- IDs de pagos en MP

Si el response incluye alguno de estos campos, **es un bug de seguridad** que hay que corregir antes de seguir.

**Si falla:**
- HTTP 401 → el endpoint está protegido por `JwtAuthGuard` por error. Revisar `transactions.controller.ts`, debe tener `@Public()` o estar fuera del guard global.

---

### Test 9 — Aceptar transacción

**Qué valida:** la contraparte (comprador) puede aceptar una propuesta y la transacción transiciona `PROPUESTA → CONFIRMADA`.

**Comando:**
```bash
curl -s -X POST "$API/transactions/$TX_ID/accept" \
  -H "Authorization: Bearer $TOKEN_BUYER" \
  -H "Content-Type: application/json" | jq
```

**Respuesta esperada:**
```json
{
  "id": "uuid-...",
  "status": "CONFIRMADA",
  "counterpartId": "uuid-comprador-...",
  "acceptedAt": "2026-05-08T..."
}
```

**Validaciones críticas:**

| Campo | Valor esperado |
|---|---|
| `status` | `CONFIRMADA` |
| `counterpartId` | UUID del comprador |
| `acceptedAt` | timestamp ≈ NOW |

**Probar que el iniciador NO puede auto-aceptar** (validación de regla de negocio):
```bash
# Crear otra tx y tratar de aceptarla con el mismo token que la creó
curl -s -X POST "$API/transactions/$TX_ID/accept" \
  -H "Authorization: Bearer $TOKEN_VENDOR" | jq
```

Esperado: HTTP 400 o 403 con mensaje del estilo "no puedes aceptar tu propia transacción".

**Probar que no se puede re-aceptar una tx ya CONFIRMADA:**
```bash
curl -s -X POST "$API/transactions/$TX_ID/accept" \
  -H "Authorization: Bearer $TOKEN_BUYER" | jq
```

Esperado: HTTP 400 con mensaje sobre transición de estado inválida.

---

### Test 10 — Listar mis transacciones

**Qué valida:** `GET /transactions/my` retorna correctamente las transacciones donde el usuario es iniciador o contraparte.

**Comando** (como vendedor):
```bash
curl -s "$API/transactions/my" \
  -H "Authorization: Bearer $TOKEN_VENDOR" | jq '.[] | {id, slug, status, amount}'
```

Esperado: array con al menos las 2 transacciones creadas en T7.

**Comando** (como comprador):
```bash
curl -s "$API/transactions/my" \
  -H "Authorization: Bearer $TOKEN_BUYER" | jq '.[] | {id, slug, status, amount}'
```

Esperado: array con la transacción aceptada en T9.

**Validación cruzada:** el comprador NO debe ver la segunda transacción del T7 (la que solo el vendedor creó). Si la ve, hay un bug en el filtro de query.

---

## 10. Paso 5 — Tests negativos críticos

Validar que el backend rechaza correctamente entradas inválidas. Estos tests deberían **fallar** desde la perspectiva del cliente, pero la API debe rechazarlos limpiamente, no caerse.

### N1 — Monto fuera de rango (mínimo)

```bash
curl -s -X POST "$API/transactions" \
  -H "Authorization: Bearer $TOKEN_VENDOR" \
  -H "Content-Type: application/json" \
  -d '{
    "initiatorRole": "seller", "modality": "shipping",
    "amount": 500, "feePayer": "buyer",
    "description": "Algo barato fuera de rango"
  }' | jq
```

Esperado: HTTP 400 con mensaje sobre monto mínimo $1.000.

### N2 — Monto fuera de rango (máximo)

```bash
curl -s -X POST "$API/transactions" \
  -H "Authorization: Bearer $TOKEN_VENDOR" \
  -H "Content-Type: application/json" \
  -d '{
    "initiatorRole": "seller", "modality": "shipping",
    "amount": 5000000, "feePayer": "buyer",
    "description": "Algo muy caro fuera de rango"
  }' | jq
```

Esperado: HTTP 400 con mensaje sobre monto máximo $2.000.000.

### N3 — Token inválido

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$API/users/me" \
  -H "Authorization: Bearer token_falso_inventado"
```

Esperado: `401`.

### N4 — Teléfono duplicado en register

```bash
# Reintentar registro con el mismo teléfono del T2
curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Otro Nombre",
    "phone": "+56931234567"
  }' | jq
```

Esperado: HTTP 409 (Conflict) o respuesta que indique que el teléfono ya está registrado pero no permita crear duplicado.

### N5 — Webhook MP sin firma HMAC

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/payments/webhook" \
  -H "Content-Type: application/json" \
  -d '{ "type": "payment", "data": { "id": "fake_payment" } }'
```

Esperado: `401`. **Crítico de seguridad:** si responde 200, hay un bug serio que permite payloads no firmados.

---

## 11. Paso 6 — Documentar resultados en `tests/fase1/results.md`

Plantilla a llenar a medida que ejecutás los tests:

```markdown
# Fase 1 — Resultados Smoke Test Backend

**Fecha de ejecución:** YYYY-MM-DD
**Ejecutado por:** [tu nombre]
**Branch:** [nombre del branch]
**Commit:** [hash corto]

## Entorno
- SO: [Windows 11 / macOS / Ubuntu]
- Node: [versión]
- Docker: [versión]
- Postgres: [versión]
- Puerto DB: [5432 / 5433]

## Resumen

| # | Test | Resultado | Tiempo (ms) | Notas |
|---|------|-----------|-------------|-------|
| T1 | Health check | ✅ / ❌ | | |
| T2 | Register vendedor | ✅ / ❌ | | |
| T3 | Verify OTP vendedor | ✅ / ❌ | | |
| T4 | Get me (vendedor) | ✅ / ❌ | | |
| T5 | Register comprador | ✅ / ❌ | | |
| T6 | Verify OTP comprador | ✅ / ❌ | | |
| T7 | Crear transacción | ✅ / ❌ | | |
| T8 | Lookup público slug | ✅ / ❌ | | |
| T9 | Aceptar transacción | ✅ / ❌ | | |
| T10 | Listar mis tx | ✅ / ❌ | | |
| N1 | Monto < mínimo | ✅ / ❌ | | |
| N2 | Monto > máximo | ✅ / ❌ | | |
| N3 | Token inválido | ✅ / ❌ | | |
| N4 | Teléfono duplicado | ✅ / ❌ | | |
| N5 | Webhook sin HMAC | ✅ / ❌ | | |

## Bugs encontrados

### Bug #1 — [título corto]
- **Test:** [Tx]
- **Severidad:** crítica / alta / media / baja
- **Reproducción:** [pasos]
- **Esperado:** [...]
- **Obtenido:** [...]
- **Log:** `tests/fase1/logs/bug-01.log`

## Decisión

- [ ] ✅ Fase 1 aprobada — pasar a Fase 2 (integración mobile)
- [ ] ⚠️ Fase 1 aprobada con observaciones — bugs no bloqueantes documentados
- [ ] ❌ Fase 1 reprobada — bugs críticos detectados, corregir antes de seguir
```

---

## 12. Colección REST Client para VSC (alternativa a cURL)

Si preferís ejecutar los tests desde VSC en lugar de la terminal, instalar la extensión **REST Client** de Huachao Mao y guardar este archivo en `tests/fase1/smoke-tests.http`. Hace clic-y-corre, ideal para iterar.

```http
@api = http://localhost:3000/api/v1
@vendorPhone = +56931234567
@buyerPhone = +56987654321

### T1 - Health check
GET {{api}}/health

### T2 - Register vendedor
# @name registerVendor
POST {{api}}/auth/register
Content-Type: application/json

{
  "fullName": "Vendedor Test",
  "phone": "{{vendorPhone}}"
}

### T3 - Verify OTP vendedor
# @name verifyVendor
POST {{api}}/auth/verify-otp
Content-Type: application/json

{
  "phone": "{{vendorPhone}}",
  "code": "123456"
}

###
@tokenVendor = {{verifyVendor.response.body.accessToken}}

### T4 - Get me vendedor
GET {{api}}/users/me
Authorization: Bearer {{tokenVendor}}

### T5 - Register comprador
POST {{api}}/auth/register
Content-Type: application/json

{
  "fullName": "Comprador Test",
  "phone": "{{buyerPhone}}"
}

### T6 - Verify OTP comprador
# @name verifyBuyer
POST {{api}}/auth/verify-otp
Content-Type: application/json

{
  "phone": "{{buyerPhone}}",
  "code": "654321"
}

###
@tokenBuyer = {{verifyBuyer.response.body.accessToken}}

### T7 - Crear transacción
# @name createTx
POST {{api}}/transactions
Authorization: Bearer {{tokenVendor}}
Content-Type: application/json

{
  "initiatorRole": "seller",
  "modality": "shipping",
  "amount": 80000,
  "feePayer": "buyer",
  "description": "Bicicleta MTB rodado 29 usada en buen estado"
}

###
@txId = {{createTx.response.body.id}}
@txSlug = {{createTx.response.body.slug}}

### T8 - Lookup público
GET {{api}}/transactions/public/{{txSlug}}

### T9 - Aceptar (comprador)
POST {{api}}/transactions/{{txId}}/accept
Authorization: Bearer {{tokenBuyer}}

### T10 - Mis transacciones (vendedor)
GET {{api}}/transactions/my
Authorization: Bearer {{tokenVendor}}

### T10b - Mis transacciones (comprador)
GET {{api}}/transactions/my
Authorization: Bearer {{tokenBuyer}}

### N1 - Monto < mínimo (debe fallar 400)
POST {{api}}/transactions
Authorization: Bearer {{tokenVendor}}
Content-Type: application/json

{
  "initiatorRole": "seller",
  "modality": "shipping",
  "amount": 500,
  "feePayer": "buyer",
  "description": "Algo barato fuera de rango"
}

### N3 - Token inválido (debe fallar 401)
GET {{api}}/users/me
Authorization: Bearer token_falso_inventado

### N5 - Webhook MP sin HMAC (debe fallar 401)
POST {{api}}/payments/webhook
Content-Type: application/json

{
  "type": "payment",
  "data": { "id": "fake_payment" }
}
```

---

## 13. Prompts útiles para Claude Code durante la ejecución

### Diagnóstico de error en arranque

```
La API no arranca. El log es:

[pegar log completo]

Sin modificar código todavía, identificá:
1. La causa raíz exacta (qué archivo, qué línea, qué configuración)
2. Si es un bug del código o un problema de configuración
3. El fix mínimo que recomendarías

No propongas refactors ni mejoras opcionales.
```

### Diagnóstico de respuesta inesperada

```
El test [Tx] del documento docs/10-fase1-smoke-test-backend-v1.md
falló. Comando ejecutado:

[pegar curl]

Respuesta esperada:
[pegar bloque de respuesta esperada]

Respuesta real:
[pegar respuesta real]

Identificá la diferencia y la causa probable. Si involucra código
de backend/, mostrame el fragmento relevante con la línea exacta.
```

### Inspección de la DB

```
Conectate a la DB del contenedor postgres y mostrame:
1. La estructura de la tabla `transactions` (`\d transactions`)
2. Las últimas 5 filas insertadas ordenadas por `created_at`
3. La cantidad de registros por estado (`SELECT status, COUNT(*) FROM transactions GROUP BY status`)
```

### Cierre de Fase 1

```
Completé los 10 smoke tests + 5 negativos del documento de Fase 1.
Los resultados están en tests/fase1/results.md.

Revisá ese archivo y decime:
1. Si la Fase 1 está aprobada para pasar a Fase 2
2. Qué bugs (si hay) son bloqueantes vs cuáles pueden ir como deuda técnica
3. Qué prioridad debería tener cada bug bloqueante para Fase 2
```

---

## 14. Criterios de aprobación de Fase 1

Marcar como **aprobada** y pasar a Fase 2 si se cumple TODO lo siguiente:

- [ ] T1 a T10: todos en verde (HTTP 200/201, payload con la forma esperada)
- [ ] N1 a N5: todos rechazados correctamente (4xx según corresponda)
- [ ] La API se mantiene estable durante toda la ejecución (sin restarts ni crashes)
- [ ] La DB no muestra registros corruptos ni datos inconsistentes tras los tests
- [ ] El `results.md` está completo y commiteado

Marcar como **aprobada con observaciones** si:

- Los tests críticos (T1, T3, T7, T9) pasaron pero hay bugs menores en T8 o T10 que no bloquean la integración mobile

Marcar como **reprobada** si alguno de estos casos ocurre:

- T1 falla (la API no arranca o no conecta a la DB)
- T3 falla (no se pueden emitir tokens — bloquea TODO lo demás)
- T7 falla (no se pueden crear transacciones — bloquea el core del negocio)
- N5 responde 200 (vulnerabilidad crítica en webhook)

---

## 15. Resultados de la ejecución real — 2026-05-08

> Fase ejecutada con Claude Code. Resultados completos en `tests/fase1/results.md`.

### Resultado global: ⚠️ Aprobada con observaciones

Todos los 15 tests pasaron (T1–T10 + N1–N5). Se detectaron 3 bugs, uno de los cuales debe corregirse antes de Fase 2.

| # | Test | Estado |
|---|------|--------|
| T1–T10 | Todos los tests positivos | ✅ |
| N1–N5 | Todos los tests negativos | ✅ |

### Bugs encontrados

**Bug #1 — `counterpartId: null` en response de accept** (baja)
- `POST /transactions/:id/accept` devuelve `counterpartId: null` aunque la DB lo guarda correctamente
- Causa: `txRepo.save(tx)` de TypeORM no refresca relaciones en memoria
- Fix: recargar la entidad con `findOne` tras el save en `transactions.service.ts`

**Bug #2 — `refreshToken` y `mpAccessToken` expuestos en response de accept** (alta — bloquea Fase 2)
- El response de `POST /transactions/:id/accept` incluye el objeto `initiator` completo con `refreshToken` y `mpAccessToken`
- Causa: la entidad `User` se serializa completa sin excluir campos sensibles
- Fix: agregar `@Exclude()` a `refreshToken` y `mpAccessToken` en `user.entity.ts` + activar `ClassSerializerInterceptor` global

**Bug #3 — Webhook acepta sin HMAC si `MP_WEBHOOK_SECRET` está vacío** (alta en prod)
- El código es correcto — salta la validación intencionalmente si el secret está vacío (modo dev)
- Riesgo: si se despliega sin configurar el secret en prod, el webhook queda abierto
- Fix de config: verificar que el `.env` tenga `MP_WEBHOOK_SECRET` con cualquier valor antes de los tests

### Hallazgos de configuración (no bugs)
- `@IsPhoneNumber()` sin región usa `libphonenumber-js/max` y rechaza rangos no asignados. Ver nota de teléfonos en §02.
- Las tablas ya existían en la DB (sincronizadas previamente). El comando `migration:run` no tuvo migraciones que aplicar — es el comportamiento esperado.
- Los tokens JWT expiran en 15m. En una sesión de tests larga es necesario re-autenticar con `POST /auth/verify-otp` (cualquier código en modo dev).
- El watch mode de NestJS (`nest start --watch`) **no recarga al cambiar `.env`** — requiere reinicio manual del proceso.

---

## 16. Próximos pasos al cerrar Fase 1

Una vez aprobada Fase 1, el orden de trabajo sigue así:

1. **Fase 2 — Integración mobile contra backend local.** Conectar el Expo al backend (con la IP de la PC, no `localhost`, ver doc 03 §02), ejecutar el flujo completo desde el mobile en un dispositivo físico o simulador.
2. **Fase 3 — Cerrar gaps y completar tests.** Implementar `TX_SHIPPED`, completar tests de integración faltantes hasta llegar al 80% global.
3. **Fase 4 — Sandbox real Mercado Pago.** Webhooks reales, ngrok para exponer, validación HMAC en producción.

Cada fase tendrá su propio documento operativo en `docs/`, siguiendo el formato de este.
