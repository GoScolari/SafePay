# SafePay — Arquitectura App Móvil

**Stack:** React Native · Expo · iOS + Android · Zustand  
**Versión:** 1.1 · **Fecha:** Mayo 2026 · **Tipo:** Documento técnico interno  
**Estado:** Sincronizado con implementación real (mobile/ en `dev-gonzalo`)

---

## 01. Stack Tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | React Native + Expo ~54 | Un código para iOS y Android. SDK acelera el desarrollo. |
| Navegación | Expo Router ~6.x | Basada en sistema de archivos. Deep linking nativo. |
| Estado global | Zustand ^5.x | Sin boilerplate. `auth.store` persiste con AsyncStorage. |
| HTTP Client | Axios ^1.x + React Query ^5.x | Axios para llamadas. React Query para caché y sincronización. |
| UI Components | StyleSheet nativo + react-native-paper ^5.x | Estilos inline con StyleSheet. Paper para componentes base. |
| Pagos | WebView (`react-native-webview`) | Checkout Mercado Pago via WebView. No requiere SDK nativo. |
| Notificaciones | expo-notifications ~0.32.x | Push FCM. Token registrado en backend al iniciar sesión. |
| Almacenamiento seguro | expo-secure-store ~15.x | Refresh token en keychain iOS / keystore Android. |
| Cámara / Galería | expo-image-picker ~17.x | Selección y captura de fotos de evidencia. |
| Portapapeles | expo-clipboard ~8.x | Copiar link de transacción al compartir. |
| Navegadores externos | expo-web-browser ~15.x | OAuth Mercado Pago en browser externo. |

> **NativeWind**: No se usa en esta implementación. El estilo se maneja con `StyleSheet.create()` nativo por performance y simplicidad.

---

## 02. Estructura de Carpetas Real

```
mobile/
├── app/
│   ├── (auth)/                    # Grupo público — sin autenticación
│   │   ├── _layout.tsx            # Stack navigator; redirige a (app) si ya auth
│   │   ├── login.tsx              # Input teléfono → POST /auth/login
│   │   ├── register.tsx           # Input nombre + teléfono → POST /auth/register
│   │   └── verify-otp.tsx         # Input 6 dígitos → POST /auth/verify-otp → guarda tokens
│   ├── (app)/                     # Grupo protegido — requiere auth
│   │   ├── _layout.tsx            # Tab Navigator (Inicio/Alertas/Perfil) + badge no leídas
│   │   ├── index.tsx              # Home: GET /transactions/my, pull-to-refresh, FAB crear
│   │   ├── transactions/
│   │   │   ├── new.tsx            # Formulario 3 pasos: rol+modal → monto+desc → feePayer
│   │   │   ├── [id].tsx           # Detalle completo + acciones condicionales por estado/rol
│   │   │   ├── pay.tsx            # POST /payments/initiate → WebView o modo simulado
│   │   │   ├── photos.tsx         # expo-image-picker → POST /files/upload multipart
│   │   │   └── tracking.tsx       # POST /shipping/track + GET /shipping/:txId/status
│   │   ├── disputes/
│   │   │   ├── [id].tsx           # Detalle disputa + respuesta vendedor
│   │   │   └── new.tsx            # Modal abrir disputa → POST /disputes/:txId/open
│   │   ├── notifications/
│   │   │   └── index.tsx          # GET /notifications/my + marcar leída
│   │   └── profile/
│   │       └── index.tsx          # Datos usuario + estado MP + conectar/logout
│   ├── tx/
│   │   └── [slug].tsx             # Deep link público sin auth — GET /transactions/public/:slug
│   ├── _layout.tsx                # Root layout: QueryClientProvider, PaperProvider, SafeAreaProvider
│   └── index.tsx                  # Redirect → (auth)/login o (app) según isAuthenticated
├── components/
│   ├── ActionButton.tsx           # Botón polimórfico: primary/danger/outline, loading state
│   ├── FeePreview.tsx             # Desglose fee en tiempo real (monto → fee → total/neto)
│   ├── StatusStepper.tsx          # Timeline visual de 6 estados; estados especiales con emoji
│   └── TransactionCard.tsx        # Card de listado: estado badge, monto CLP, rol, contraparte
├── hooks/
│   ├── useAuth.ts                 # login(), register(), verifyOtp(), logout() + estado de error
│   ├── useDispute.ts              # useDispute(id) — detalle + respond(); useOpenDispute() — open()
│   ├── useFiles.ts                # uploadFile(), getFileUrl(), deleteFile() — multipart + S3 firmado
│   ├── useNotifications.ts        # fetch + markRead + registro device token FCM automático
│   └── useTransaction.ts          # detalle React Query + accept(), cancel(), releasePayment(), copyLink()
├── stores/
│   ├── auth.store.ts              # user, accessToken, isAuthenticated — persiste AsyncStorage
│   ├── notification.store.ts      # notifications[], unreadCount, deviceToken — solo memoria
│   └── transaction.store.ts       # transactions[], activeTransaction — solo memoria
├── lib/
│   ├── api.ts                     # Instancia Axios: baseURL desde EXPO_PUBLIC_API_URL,
│   │                              #   interceptor inject JWT, interceptor 401 → refresh automático
│   ├── queryClient.ts             # React Query client: staleTime 30s, retry 1
│   └── utils.ts                   # formatCLP(), formatDate(), calculateFee() (tramos CLP)
├── constants/
│   ├── colors.ts                  # Paleta centralizada (primary, danger, surface, border, etc.)
│   └── txStatus.ts                # TxStatus type, TX_STATUS_LABEL/COLOR/FLOW (10 estados)
├── app.json                       # name: SafePay, scheme: safepay, bundleId: cl.safepay.app
├── package.json
└── .env                           # EXPO_PUBLIC_API_URL=http://<IP_LOCAL>:3000/api/v1
```

> **Importante sobre `.env` en dispositivos físicos:** `localhost` apunta al propio dispositivo Android, NO a la PC de desarrollo. Usar la IP local de la PC (ej. `192.168.1.x`) al testear con Expo Go.

---

## 03. Estructura de Navegación

### Stack Auth — público
| Archivo | Descripción | Auth |
|---|---|---|
| `(auth)/login.tsx` | Input teléfono, envía OTP | público |
| `(auth)/register.tsx` | Input nombre + teléfono | público |
| `(auth)/verify-otp.tsx` | Input 6 dígitos, submit → guarda tokens | público |

### Tab Principal — requiere auth
| Tab | Archivo | Descripción |
|---|---|---|
| Inicio 🏠 | `(app)/index.tsx` | Lista de transacciones del usuario |
| Alertas 🔔 | `(app)/notifications/index.tsx` | Notificaciones con badge de no leídas |
| Perfil 👤 | `(app)/profile/index.tsx` | Datos usuario, estado MP, logout |

### Rutas internas (sin tab, `href: null`)
| Archivo | Descripción |
|---|---|
| `transactions/new.tsx` | Crear transacción (3 pasos) |
| `transactions/[id].tsx` | Detalle con acciones condicionales |
| `transactions/pay.tsx` | WebView de pago Mercado Pago |
| `transactions/photos.tsx` | Subida de fotos de evidencia |
| `transactions/tracking.tsx` | Registro y estado de envío |
| `disputes/[id].tsx` | Detalle de disputa + respuesta vendedor |
| `disputes/new.tsx` | Abrir nueva disputa |

### Deep Link Público — mixto
| Archivo | URL | Auth |
|---|---|---|
| `tx/[slug].tsx` | `safepay.cl/tx/:slug` | público |

**Tabla de acciones en `tx/[slug].tsx`:**

| Acción | ¿Requiere cuenta? | Notas |
|---|---|---|
| Ver resumen del producto | ❌ No | Siempre visible |
| Ver desglose de costos | ❌ No | Siempre visible |
| **Pagar (checkout MP)** | ❌ No | Pago anónimo via WebView |
| Ver estado de la tx tras pagar | ✅ Sí | Redirige a `(auth)/register` post-pago |
| Confirmar recepción / abrir disputa | ✅ Sí | Requiere ser el comprador autenticado |

---

## 04. Flujo de Pantallas — Casos Principales

### Flujo A · Vendedor inicia · Con envío
```
Login → Crear Tx (vendedor, shipping) → Copiar link
→ [comprador paga via deep link] → Registrar tracking → Comprador confirma → Completado
```

### Flujo B · Comprador inicia · Con envío
```
Login → Crear Tx (comprador, shipping) → Compartir link
→ [vendedor acepta] → Ir a pagar → Tracking → Confirmar → Completado
```

### Flujo C · Presencial · Cualquier iniciador
```
Login → Crear Tx (presencial) → Contraparte acepta → Ir a pagar
→ Encuentro presencial → Confirmar conforme → Pago liberado
```

### Flujo D · Disputa
```
Estado ENTREGADO → Abrir disputa (motivo + descripción)
→ Vendedor responde (48h) → Administrador resuelve → Reembolso / Liberación
```

---

## 05. Pantallas Clave — Detalle

### HomeScreen (`(app)/index.tsx`)
Lista de transacciones con `GET /transactions/my`. Pull-to-refresh, empty state, FAB navega a `transactions/new`.

### TxDetailScreen (`transactions/[id].tsx`)
Pantalla central. Muestra `StatusStepper` + info completa. Acciones condicionales según estado × rol:

| Estado | Rol | Acciones |
|---|---|---|
| PROPUESTA | Iniciador | Copiar link · Cancelar |
| PROPUESTA | Contraparte | Aceptar · Rechazar |
| CONFIRMADA | Cualquiera | Ir a pagar |
| PAGADO | Vendedor | Registrar envío · Cancelar |
| PAGADO | Comprador | Cancelar |
| EN_TRÁNSITO | Cualquiera | Ver estado del envío |
| ENTREGADO | Comprador | Confirmar conforme · Abrir disputa |
| ENTREGADO | Vendedor | Info: esperando confirmación |
| EN_DISPUTA | Cualquiera | Ver disputa |
| COMPLETADO/CANCELADO/etc. | — | Solo lectura |

### TxPublicScreen (`tx/[slug].tsx`)
Vista pública sin auth. Llama `GET /transactions/public/:slug`. Muestra resumen, monto total comprador, botón "Pagar con Mercado Pago". Post-pago exitoso redirige a `(auth)/register` si no autenticado.

### DisputeScreen (`disputes/[id].tsx`)
Muestra razón, descripción, respuesta del vendedor, resolución y nota. Si el usuario es el vendedor y `status === 'open'`, muestra textarea para responder → `POST /disputes/:id/respond`.

---

## 06. Estado Global — Zustand Stores

### `auth.store.ts` — persiste en AsyncStorage
```typescript
{
  user: { id, phone, fullName, role, phoneVerified } | null
  accessToken: string | null          // también en globalThis.__accessToken
  isAuthenticated: boolean
  setTokens(access, refresh): void    // guarda en memoria + SecureStore
  clearAuth(): void                   // limpia todo
}
```

### `transaction.store.ts` — solo memoria
```typescript
{
  transactions: Transaction[]
  activeTransaction: Transaction | null
  setTransactions(txs): void
  setActive(tx): void
  updateStatus(id, status): void
}
```

### `notification.store.ts` — solo memoria
```typescript
{
  notifications: AppNotification[]
  unreadCount: number                 // computed al setNotifications
  deviceToken: string | null
  setNotifications(list): void
  markAsRead(id): void
  setDeviceToken(token): void
}
```

---

## 07. Autenticación y API

### Flujo de tokens
- `accessToken` (JWT 15min): guardado en memoria (`globalThis.__accessToken`) y en `auth.store`
- `refreshToken` (30d): guardado en `expo-secure-store` (keychain iOS / keystore Android)
- Interceptor en `lib/api.ts`: inyecta `Authorization: Bearer {token}` en cada request
- Interceptor 401: llama `POST /auth/refresh` automáticamente, reintenta el request original

### OTP en desarrollo
Con `TWILIO_SID` vacío en el backend, `sendOtp()` y `checkOtp()` retornan sin validar. Cualquier código de 6 dígitos es aceptado en modo dev.

---

## 08. Librerías Principales (versiones reales)

| Librería | Versión instalada | Uso |
|---|---|---|
| `expo` | ~54.0.33 | SDK base |
| `expo-router` | ~6.0.23 | Navegación file-based + deep linking |
| `zustand` | ^5.0.13 | Estado global con middleware de persistencia |
| `@tanstack/react-query` | ^5.100.9 | Caché de servidor y revalidación automática |
| `axios` | ^1.16.0 | HTTP client con interceptores JWT |
| `expo-camera` | ~17.0.10 | Cámara nativa |
| `expo-image-picker` | ~17.0.11 | Selección de imágenes desde galería |
| `expo-notifications` | ~0.32.17 | Push notifications FCM |
| `expo-secure-store` | ~15.0.8 | Refresh token seguro |
| `expo-clipboard` | ~8.0.8 | Copiar links al portapapeles |
| `expo-web-browser` | ~15.0.11 | OAuth Mercado Pago en browser externo |
| `react-native-webview` | ~14.x | WebView para checkout MP |
| `react-native-paper` | ^5.15.1 | Componentes UI base |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persistencia auth store |

---

## 09. Configuración (`app.json`)

```json
{
  "name": "SafePay",
  "slug": "safepay",
  "scheme": "safepay",
  "bundleIdentifier": "cl.safepay.app",
  "plugins": [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    ["expo-notifications", { "icon": "./assets/icon.png", "color": "#2563EB" }],
    ["expo-image-picker", { "photosPermission": "SafePay necesita acceso para adjuntar fotos de evidencia." }]
  ]
}
```

> **Push notifications en desarrollo:** El registro del device token FCM puede fallar en Expo Go sin un `projectId` de EAS configurado. Esto es no-bloqueante — la app continúa funcionando sin notificaciones push hasta configurar EAS.

> **Mercado Pago:** En modo desarrollo el backend devuelve `checkoutUrl: null`. La pantalla `pay.tsx` detecta esto y muestra una pantalla de "pago simulado" con botones para simular éxito o fallo.
