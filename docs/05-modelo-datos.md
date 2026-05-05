# SafePay — Modelo de Datos

**Base de datos:** PostgreSQL · TypeORM · 8 tablas · 8 enums  
**Versión:** 1.0 · **Fecha:** Mayo 2026 · **Tipo:** Documento técnico interno

---

## 01. Diagrama Entidad-Relación (simplificado)

```
users ──────────────────────────────────────────────────────────────┐
  │ (initiator_id)                                                   │
  │ (counterpart_id)                                                 │
  ▼                                                                  │
transactions ──── payments (1:1)                                     │
  │                                                                  │
  ├──── transaction_files (N:1) ◄── uploaded_by (FK → users) ───────┘
  ├──── shipments (1:1)
  ├──── disputes (1:1) ◄── opened_by (FK → users)
  ├──── notifications (N:1) ◄── user_id (FK → users)
  └──── ratings (N:1) ◄── rated_by / rated_user (FK → users)
```

---

## 02. Relaciones entre Tablas

| Tabla origen | Tipo | Tabla destino | Campo FK | Descripción |
|---|---|---|---|---|
| transactions | N:1 | users | initiator_id | Usuario que creó la transacción |
| transactions | N:1 | users | counterpart_id | Usuario contraparte |
| payments | 1:1 | transactions | transaction_id | Cada transacción tiene un único pago |
| transaction_files | N:1 | transactions | transaction_id | Múltiples fotos por transacción |
| transaction_files | N:1 | users | uploaded_by | Quién subió la foto |
| shipments | 1:1 | transactions | transaction_id | Solo en modalidad courier |
| disputes | 1:1 | transactions | transaction_id | Máximo una disputa por transacción |
| disputes | N:1 | users | opened_by | Quién abrió la disputa |
| notifications | N:1 | users | user_id | Notificaciones de un usuario |
| notifications | N:1 | transactions | transaction_id | Notificación referida a una transacción |
| ratings | N:1 | transactions | transaction_id | Calificación al completar |
| ratings | N:1 | users | rated_by / rated_user | Quién califica y a quién |

---

## 03. Definición de Tablas

### `users`
Usuarios registrados. Vendedores y compradores comparten la misma tabla.

| Campo | Tipo | Constraints | Descripción |
|---|---|---|---|
| id | UUID | PK, NN | `gen_random_uuid()` |
| full_name | VARCHAR(100) | NN | Min 3 chars, solo letras y espacios |
| phone | VARCHAR(15) | UQ, NN | Formato E.164. Ej: +56912345678 |
| email | VARCHAR(255) | UQ | Opcional. Lowercase al guardar. |
| rut | VARCHAR(12) | UQ | Formato XX.XXX.XXX-X. Validado mod 11. |
| phone_verified | BOOLEAN | NN | Default: false |
| rut_verified | BOOLEAN | NN | Default: false. Para KYC futuro. |
| mp_access_token | TEXT | | Token OAuth MP del vendedor. Cifrado AES-256. |
| device_token | TEXT | | Token FCM. Se actualiza en cada login. |
| rating | DECIMAL(2,1) | | Promedio de ratings. Rango 1.0–5.0. |
| total_tx | INTEGER | | Contador de transacciones completadas. |
| role | user_role ENUM | NN | `user` \| `admin`. Default: `user`. |
| created_at | TIMESTAMP | NN | Default: NOW() UTC |
| updated_at | TIMESTAMP | NN | Auto-actualizado por TypeORM |

### `transactions`
Tabla central. Registra el ciclo de vida completo de cada operación.

| Campo | Tipo | Constraints | Descripción |
|---|---|---|---|
| id | UUID | PK | `gen_random_uuid()` |
| initiator_id | UUID | FK, NN | FK → users |
| counterpart_id | UUID | FK | FK → users. Se asigna al aceptar el link. |
| initiator_role | tx_role ENUM | NN | seller \| buyer |
| modality | tx_modality ENUM | NN | shipping \| presential |
| status | tx_status ENUM | NN, IDX | Default: PROPUESTA |
| amount | INTEGER | NN | En CLP. Min: 1000, Max: 2000000. |
| fee | INTEGER | NN | Comisión de plataforma fija por tramo. |
| fee_payer | fee_payer ENUM | NN | seller \| buyer \| split |
| slug | VARCHAR(12) | UQ, NN | ID corto para link público. Ej: tx-a3k9m2 |
| description | TEXT | NN | Min 10, Max 500 chars. |
| accepted_at | TIMESTAMP | | Cuándo la contraparte aceptó. Base legal. |
| auto_release_at | TIMESTAMP | | Timer de liberación automática (ENTREGADO + 48 hrs). |
| expires_at | TIMESTAMP | | Expiración de PROPUESTA. Default: +24 hrs. |
| created_at | TIMESTAMP | NN | UTC |

### `payments`
Registro del pago. Trazabilidad financiera completa.

| Campo | Tipo | Constraints | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| transaction_id | UUID | FK, UQ | 1:1 con transactions |
| mp_payment_id | VARCHAR(50) | UQ | ID del pago en Mercado Pago |
| mp_preference_id | TEXT | | ID de la preferencia de checkout |
| status | payment_status ENUM | NN | pending \| held \| released \| refunded |
| amount_total | INTEGER | NN | Total pagado por el comprador |
| amount_fee_mp | INTEGER | | Comisión cobrada por Mercado Pago |
| amount_fee_platform | INTEGER | | Comisión SafePay retenida |
| amount_seller | INTEGER | | Monto neto para el vendedor |
| released_at | TIMESTAMP | | Cuándo se liberaron los fondos |
| created_at | TIMESTAMP | NN | Al recibir webhook de MP |

### `transaction_files`
Imágenes de publicación y recepción.

| Campo | Tipo | Constraints | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| transaction_id | UUID | FK, IDX | |
| uploaded_by | UUID | FK | |
| type | file_type ENUM | IDX | publication \| reception |
| s3_key | TEXT | NN | Clave del objeto en S3 |
| mime_type | VARCHAR(50) | | image/jpeg, image/png, etc. |
| size_bytes | INTEGER | | Tamaño del archivo |
| created_at | TIMESTAMP | NN | |

### `shipments`
Información de envío por courier.

| Campo | Tipo | Constraints | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| transaction_id | UUID | FK | |
| courier | courier_type ENUM | NN | chilexpress \| bluexpress \| starken |
| tracking_number | VARCHAR(50) | NN | Número de seguimiento |
| status | shipment_status ENUM | IDX | pending \| in_transit \| delivered \| failed \| lost |
| raw_status | VARCHAR(100) | | Estado original del courier |
| last_checked_at | TIMESTAMP | | Último polling exitoso |
| delivered_at | TIMESTAMP | | Cuándo fue entregado |
| created_at | TIMESTAMP | NN | |

### `disputes`
Registro de disputas por transacción.

| Campo | Tipo | Constraints | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| transaction_id | UUID | FK, UQ | Máximo 1 disputa por Tx |
| opened_by | UUID | FK | |
| reason | dispute_reason ENUM | NN | |
| description | TEXT | | Min 10 chars para motivo "other" |
| status | dispute_status ENUM | IDX | open \| responded \| resolved |
| resolution | dispute_resolution ENUM | | buyer \| seller \| split |
| resolution_note | TEXT | | Justificación del moderador |
| respond_before | TIMESTAMP | | Plazo para respuesta del vendedor |
| resolved_at | TIMESTAMP | | |
| created_at | TIMESTAMP | NN | |

### `notifications`
Historial de notificaciones.

| Campo | Tipo | Constraints | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK, IDX | |
| transaction_id | UUID | FK | |
| type | notification_type ENUM | IDX | |
| title | VARCHAR(100) | | |
| body | TEXT | | |
| read | BOOLEAN | IDX | Default: false |
| created_at | TIMESTAMP | NN | |

### `ratings`
Calificaciones tras completar transacciones.

| Campo | Tipo | Constraints | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| transaction_id | UUID | FK | |
| rated_by | UUID | FK | Quién califica |
| rated_user | UUID | FK | A quién se califica |
| score | SMALLINT | NN | Rango 1–5 |
| comment | TEXT | | Opcional |
| created_at | TIMESTAMP | NN | |

---

## 04. Tipos Enum Definidos

### `tx_status`
```
PROPUESTA    → Esperando aceptación de la contraparte
CONFIRMADA   → Contraparte aceptó. Pago habilitado.
PAGADO       → Fondos retenidos en MP.
EN_TRANSITO  → Paquete en camino. (Permanece aquí aunque haya fallo de entrega)
ENTREGADO    → Courier confirmó entrega exitosa.
EN_DISPUTA   → Problema reportado. Pago congelado.
COMPLETADO   → Pago liberado al vendedor.
CANCELADO    → Cancelado antes del despacho.
REEMBOLSADO  → Disputa resuelta a favor del comprador.
EXPIRADO     → Sin respuesta en el plazo definido.
```

> Los fallos de entrega del courier **no cambian el estado de la transacción**. Se registran en `shipments.status = 'failed'` y generan una notificación `TX_SHIPPING_ALERT` a ambas partes. La transacción permanece en `EN_TRÁNSITO` hasta que el vendedor ingrese un nuevo tracking o el comprador abra una disputa.

### `tx_role`
```
seller  → El iniciador es el vendedor
buyer   → El iniciador es el comprador
```

### `user_role`
```
user   → Comprador o vendedor estándar (default)
admin  → Moderador SafePay con acceso a AdminModule
```

### `tx_modality`
```
shipping    → Envío con courier
presential  → Encuentro en persona
```

### `fee_payer`
```
seller  → Vendedor absorbe la comisión
buyer   → Comprador paga la comisión
split   → Fee dividido 50/50
```

### `payment_status`
```
pending   → Checkout abierto, sin pagar
held      → Fondos retenidos en MP
released  → Liberado al vendedor
refunded  → Devuelto al comprador
```

### `file_type`
```
publication  → Foto del vendedor antes de enviar
reception    → Foto del comprador al recibir
```

### `courier_type`
```
chilexpress  → Chilexpress (MVP)
bluexpress   → BlueExpress (MVP)
```

> Starken queda excluido del MVP. Se agregará como valor al enum en una migración futura cuando haya demanda real. Agregar un courier es un cambio menor: nuevo valor en el enum, nueva clase de tracking service, y registro en la factory de `ShippingModule`.

### `shipment_status`
```
pending     → Tracking registrado, sin consultar aún
in_transit  → En camino
delivered   → Entregado exitosamente
failed      → Intento fallido (genera TX_SHIPPING_ALERT, Tx permanece EN_TRÁNSITO)
lost        → Paquete perdido (genera TX_SHIPPING_ALERT + recomendación de disputa)
```

### `dispute_reason`
```
not_received      → No recibí el producto
not_as_described  → Diferente a lo publicado
damaged           → Llegó dañado
incomplete        → Producto incompleto
other             → Otro motivo (requiere descripción)
```

### `dispute_status`
```
open       → Recién abierta
responded  → Vendedor respondió
resolved   → Resuelta por moderación
```

### `notification_type`
```
TX_ACCEPTED        → Propuesta aceptada
TX_PAID            → Pago recibido
TX_SHIPPED         → Producto despachado
TX_DELIVERED       → Producto entregado
TX_COMPLETED       → Pago liberado
TX_DISPUTED        → Disputa abierta
TX_EXPIRING        → Aviso timer 48 hrs
TX_SHIPPING_ALERT  → Fallo de entrega del courier (Tx permanece EN_TRÁNSITO)
```

---

## 05. Índices y Optimización

| Tabla | Columna(s) | Tipo | Justificación |
|---|---|---|---|
| users | phone | UNIQUE | Búsqueda al login y verificación OTP |
| users | rut | UNIQUE | Validación de identidad única |
| transactions | slug | UNIQUE | Lookup por link público — query más frecuente |
| transactions | status | INDEX | Filtro de transacciones activas en home |
| transactions | initiator_id, status | INDEX compuesto | Mis transacciones activas |
| transactions | counterpart_id, status | INDEX compuesto | Transacciones donde soy contraparte |
| transactions | expires_at | INDEX | Cron job de expiración de propuestas |
| transactions | auto_release_at | INDEX | Cron job de liberación automática |
| payments | mp_payment_id | UNIQUE | Lookup al recibir webhook de MP |
| payments | transaction_id | UNIQUE | Garantiza 1:1 entre pago y transacción |
| shipments | status | INDEX | Cron job consulta solo EN_TRANSITO |
| transaction_files | transaction_id, type | INDEX compuesto | Fotos de publicación o recepción de una Tx |
| notifications | user_id, read | INDEX compuesto | Conteo de no leídas para el badge |
| disputes | transaction_id | UNIQUE | Garantiza máximo una disputa por Tx |

> Los índices compuestos deben declararse en orden de mayor selectividad primero. Revisar `EXPLAIN ANALYZE` al escalar para detectar índices faltantes.
