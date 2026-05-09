# SafePay — Documentación de Integraciones Externas

**Integraciones:** Mercado Pago · Chilexpress · BlueExpress · Twilio · Firebase FCM  
**Versión:** 1.0 · **Fecha:** Mayo 2026 · **Tipo:** Documento técnico interno

---

## Resumen de Integraciones

| Servicio | Rol | Prioridad |
|---|---|---|
| Mercado Pago | Retención y liberación de fondos via Split Payments marketplace | Crítico |
| Couriers | Chilexpress y BlueExpress. Tracking automático de envíos. | Alta |
| Twilio | Envío de SMS para verificación OTP al registro de usuarios. | Media |
| Firebase FCM | Push notifications a la app en cada cambio de estado. | Media |

---

## 01. Mercado Pago — Split Payments

### Configuración de cuenta

| Parámetro | Valor |
|---|---|
| Tipo de cuenta | Marketplace (Split Payments) |
| Autenticación vendedor | OAuth 2.0 |
| Ambiente pruebas | `api.mercadopago.com/sandbox` |
| Ambiente producción | `api.mercadopago.com` |
| Moneda | CLP (Peso chileno) |
| Comisión MP estimada | ~3.19% + IVA (débito/crédito) |

### Credenciales requeridas

| Variable | Descripción |
|---|---|
| `MP_APP_ID` | ID de la app marketplace |
| `MP_CLIENT_SECRET` | Clave secreta de la app |
| `ACCESS_TOKEN` | Token de plataforma (SafePay) |
| `VENDOR_ACCESS_TOKEN` | Token del vendedor (obtenido via OAuth) |
| `MP_WEBHOOK_SECRET` | Para validar firma HMAC en webhooks |

### Flujo OAuth — Conexión de cuenta vendedor

```
Vendedor en ProfileScreen
  → Pulsa "Conectar cuenta Mercado Pago"
  → App llama GET /users/mp/connect
  → Backend genera URL de autorización MP y la devuelve
  → App abre WebView con la URL OAuth de MP
  → Vendedor autoriza en MP
  → MP redirige a /users/mp/callback?code=XXX
  → Backend intercambia code por access_token
  → access_token se cifra con AES-256 y se guarda en users.mp_access_token
  → App muestra estado "Cuenta MP conectada ✓"
```

> El `access_token` del vendedor es **necesario** para que el backend pueda crear preferencias de pago y recibir los fondos en su cuenta al momento de la liberación. Sin él, el vendedor no puede operar como tal en SafePay.

### Flujo completo — Retención y liberación de fondos

**1. Creación del checkout**
```
Tx CONFIRMADA
  → POST /checkout/preferences  (con marketplace_fee)
  → MP devuelve init_point (URL de checkout)
  → App abre checkout MP
```

**2. Pago realizado**
```
Comprador paga en MP
  → MP dispara webhook a /payments/webhook
  → Validar firma HMAC
  → Tx → PAGADO (fondos retenidos en MP)
  → Notificar vendedor
```

**3. Liberación de fondos**
```
Comprador confirma recepción
  → POST /v1/advanced_payments/:id/disbursements/release
  → MP transfiere a cuenta del vendedor
  → Tx → COMPLETADO
```

**4. Reembolso (si hay disputa)**
```
Disputa resuelta a favor del comprador
  → POST /v1/payments/:id/refunds
  → Tx → REEMBOLSADO
```

### Endpoints Mercado Pago utilizados

| Método | Endpoint | Uso | Cuándo |
|---|---|---|---|
| POST | `/oauth/token` | Obtener token del vendedor | Registro vendedor |
| POST | `/checkout/preferences` | Crear preferencia con marketplace_fee | Tx CONFIRMADA |
| GET | `/v1/payments/:id` | Consultar estado de un pago | Verificación webhook |
| POST | `/v1/advanced_payments/:id/disbursements/release` | Liberar fondos retenidos | Confirmación comprador |
| POST | `/v1/payments/:id/refunds` | Reembolso al comprador | Disputa resuelta |

### Ejemplo — Crear preferencia de pago

```typescript
// payments.service.ts
async createPreference(tx: Transaction): Promise<string> {
  // El unit_price incluye la parte del fee que paga el comprador (si aplica)
  // fee_payer = 'buyer'  → unit_price = amount + fee
  // fee_payer = 'seller' → unit_price = amount
  // fee_payer = 'split'  → unit_price = amount + Math.ceil(fee / 2)
  const buyerFee = this.calculateBuyerFee(tx.fee, tx.feePayer);

  const preference = {
    items: [{
      title: tx.description,
      quantity: 1,
      currency_id: 'CLP',
      unit_price: tx.amount + buyerFee,
    }],
    marketplace_fee: tx.fee, // SafePay siempre cobra el fee total via marketplace_fee
    back_urls: {
      success: `safepay://tx/${tx.slug}/success`,
      failure: `safepay://tx/${tx.slug}/failure`,
    },
    notification_url: `${process.env.API_URL}/payments/webhook`,
    metadata: { transaction_id: tx.id },
  };

  const response = await mpClient.post('/checkout/preferences', preference, {
    headers: { Authorization: `Bearer ${vendor.mpAccessToken}` },
  });

  return response.data.init_point;
}

// El split es una convención de precio en la UI — MP siempre descuenta
// el marketplace_fee completo al vendedor. La "división" se refleja en
// cuánto paga el comprador, no en una operación MP separada.
private calculateBuyerFee(fee: number, feePayer: FeePayer): number {
  if (feePayer === 'buyer') return fee;
  if (feePayer === 'split') return Math.ceil(fee / 2);
  return 0; // seller asume todo
}
```

**Mecánica técnica del split en Mercado Pago:**

SafePay siempre envía un único `marketplace_fee` por el total del fee ($990). No hay dos preferencias separadas. El split solo afecta el `unit_price` que ve y paga el comprador:

```
fee_payer = 'split', fee = $990:
  → unit_price enviado a MP = amount + $495  (comprador paga su mitad)
  → marketplace_fee = $990                    (SafePay cobra el total)
  → MP descuenta $990 del pago neto al vendedor
  → El vendedor ya "pagó" su mitad ($495) vía descuento en su pago neto
```

El resultado neto es correcto: cada parte absorbió $495, pero la mecánica es un solo cobro a MP, no dos transacciones.

**Desglose visible para el comprador según fee_payer:**

```
fee_payer = 'seller':
  Producto:         $80.000
  Costo servicio:   $0 (asumido por vendedor)
  Total a pagar:    $80.000

fee_payer = 'buyer':
  Producto:         $80.000
  Costo servicio:   $990
  Total a pagar:    $80.990

fee_payer = 'split':
  Producto:         $80.000
  Tu parte (50%):   $495
  Total a pagar:    $80.495
  (El vendedor asume los otros $495 vía descuento en su pago neto)
```

### Eventos Webhook Mercado Pago

| Evento | Descripción | Acción SafePay |
|---|---|---|
| `payment.created` | Pago iniciado | Log, sin acción |
| `payment.approved` | Pago aprobado y fondos retenidos | Tx → PAGADO + notificar |
| `payment.rejected` | Pago rechazado | Tx → CONFIRMADA + notificar |
| `payment.refunded` | Reembolso procesado | Tx → REEMBOLSADO |
| `merchant_order.updated` | Actualización de orden marketplace | Sincronizar estado |

> **Importante:** Todos los webhooks deben validarse con firma HMAC-SHA256 usando el `MP_WEBHOOK_SECRET`. Si la firma no coincide, rechazar con HTTP 401 inmediatamente sin procesar el evento.

---

## 02. Couriers — Tracking Automático

### Chilexpress

| Parámetro | Valor |
|---|---|
| API base | `api.chilexpress.cl/v1` |
| Autenticación | API Key (header) |
| Tracking endpoint | `GET /tracking/:ots` |
| Formato número | OTS (código orden) |
| Webhooks nativos | No disponibles |
| Estrategia | Polling cada 2 hrs (cron job) |

### BlueExpress

| Parámetro | Valor |
|---|---|
| API base | `api.blue.cl/api/v1` |
| Autenticación | Bearer Token (OAuth) |
| Tracking endpoint | `GET /tracking/:code` |
| Webhooks nativos | Disponibles (beta) |
| Estrategia | Webhook + polling como fallback |

### Flujo de seguimiento automático

```
Tx PAGADO
  → Vendedor ingresa tracking
  → POST /shipping/track
  → Tx → EN_TRÁNSITO

Cron job cada 2 hrs (solo envíos EN_TRÁNSITO)
  → GET courier/tracking/:code
  → Mapear estado al estado interno SafePay
  → ¿Entregado?
    SÍ → Tx → ENTREGADO → Notificar comprador → Timer 48 hrs → Auto-liberar
    NO → Continuar monitoreando
```

### Mapeo de estados

| Estado courier | Estado shipment interno | Efecto en transacción | Notificación |
|---|---|---|---|
| Chilexpress: "EN CAMINO" | `in_transit` | Tx permanece `EN_TRÁNSITO` | Ninguna |
| Chilexpress: "ENTREGADO" | `delivered` | Tx → `ENTREGADO` | Push a comprador |
| Chilexpress: "NO ENTREGADO" | `failed` | Tx permanece `EN_TRÁNSITO` | Push a ambos (`TX_SHIPPING_ALERT`) |
| BlueExpress: "in_transit" | `in_transit` | Tx permanece `EN_TRÁNSITO` | Ninguna |
| BlueExpress: "delivered" | `delivered` | Tx → `ENTREGADO` | Push a comprador |
| BlueExpress: "failed" | `failed` | Tx permanece `EN_TRÁNSITO` | Push a ambos (`TX_SHIPPING_ALERT`) |

> `ALERTA` no es un estado de `tx_status`. Es un evento de `shipments` que genera una notificación de tipo `TX_SHIPPING_ALERT` sin cambiar el estado de la transacción. La resolución queda en manos del vendedor (reintentar el envío con nuevo tracking) o del comprador (abrir disputa).

### Ejemplo — Servicio de tracking unificado

```typescript
// shipping.service.ts
async checkTracking(shipment: Shipment): Promise<TrackingResult> {
  const result = shipment.courier === 'chilexpress'
    ? await this.chilexpress.track(shipment.trackingNumber)
    : await this.bluexpress.track(shipment.trackingNumber);

  const status = this.mapToInternalStatus(result.rawStatus, shipment.courier);

  if (status === 'ENTREGADO' && shipment.status !== 'ENTREGADO') {
    await this.transactionsService.updateStatus(shipment.transactionId, 'ENTREGADO');
    await this.notificationsService.notifyDelivered(shipment.transactionId);
    await this.scheduleAutoRelease(shipment.transactionId); // timer 48 hrs
  }

  return { status, rawStatus: result.rawStatus, updatedAt: new Date() };
}
```

> El cron job consulta solo envíos en estado `EN_TRÁNSITO`. Una vez marcado `ENTREGADO` o `ALERTA`, deja de consultarse para no consumir cuota de API.

---

## 03. Twilio — Verificación OTP por SMS

### Configuración

| Parámetro | Valor |
|---|---|
| Servicio | Twilio Verify API |
| Endpoint | `api.twilio.com/v2/verify` |
| Código | 6 dígitos numéricos |
| TTL | 5 minutos |
| Max intentos | 3 por número / 24 hrs |
| Costo por SMS | ~USD 0.0079 |

### Flujo de verificación OTP

```
1. Usuario ingresa teléfono
2. POST /auth/send-otp → Twilio Verify
3. Usuario recibe SMS con código de 6 dígitos
4. Ingresa código en la app
5. POST /auth/verify-otp → Twilio
6. Aprobado → phone_verified = true
7. Backend emite JWT de sesión
```

### Ejemplo — Envío y verificación OTP

```typescript
// auth.service.ts

// Enviar OTP
async sendOtp(phone: string): Promise<void> {
  await twilioClient.verify.v2
    .services(process.env.TWILIO_SERVICE_SID)
    .verifications.create({ to: phone, channel: 'sms' });
}

// Verificar OTP
async verifyOtp(phone: string, code: string): Promise<boolean> {
  const result = await twilioClient.verify.v2
    .services(process.env.TWILIO_SERVICE_SID)
    .verificationChecks.create({ to: phone, code });

  return result.status === 'approved';
}
```

---

## 04. Firebase FCM — Push Notifications

### Configuración

| Parámetro | Valor |
|---|---|
| SDK backend | `firebase-admin` |
| SDK mobile | `expo-notifications` |
| Costo | Gratuito |
| Plataformas | iOS + Android |
| Token de registro | Al hacer login en la app |

### Eventos que disparan push

| Evento | Destinatario |
|---|---|
| Tx aceptada | Ambas partes |
| Pago recibido | Vendedor |
| Tracking ingresado | Comprador |
| Paquete entregado | Comprador |
| Disputa abierta | Vendedor |
| Pago liberado | Vendedor |
| Timer 48 hrs (aviso) | Comprador |

### Ejemplo — Envío de push notification

```typescript
// notifications.service.ts
async sendPush(userId: string, payload: NotificationPayload): Promise<void> {
  const user = await this.usersService.findById(userId);
  if (!user?.deviceToken) return;

  await admin.messaging().send({
    token: user.deviceToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      transactionId: payload.transactionId,
      type: payload.type, // 'TX_PAID' | 'TX_DELIVERED' | 'TX_DISPUTED' | etc.
    },
    apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    android: { priority: 'high' },
  });

  await this.saveToInbox(userId, payload); // persistir en tabla notifications
}
```

> Cada notificación push se persiste en la tabla `notifications` del backend, permitiendo al usuario ver su historial aunque el dispositivo estuviera offline al momento del evento.
