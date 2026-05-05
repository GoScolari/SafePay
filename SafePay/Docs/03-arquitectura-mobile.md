# SafePay — Arquitectura App Móvil

**Stack:** React Native · Expo · iOS + Android · Zustand  
**Versión:** 1.0 · **Fecha:** Mayo 2026 · **Tipo:** Documento técnico interno

---

## 01. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | React Native + Expo | Un código para iOS y Android. SDK acelera el desarrollo. |
| Navegación | Expo Router | Basada en sistema de archivos. Deep linking nativo para links de transacción. |
| Estado global | Zustand | Simple, sin boilerplate. Persistencia con AsyncStorage para sesión. |
| HTTP Client | Axios + React Query | Axios para llamadas. React Query para caché y sincronización. |
| UI Components | NativeWind + RN Paper | Tailwind en RN + componentes accesibles base. |
| Pagos | MP SDK + WebView | SDK oficial de Mercado Pago para checkout. |

---

## 02. Estructura de Carpetas

```
safepay-app/
├── app/                          # Rutas Expo Router
│   ├── (auth)/                   # Stack público
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── verify-otp.tsx
│   ├── (app)/                    # Requiere autenticación
│   │   ├── index.tsx             # Home — mis transacciones
│   │   ├── profile.tsx
│   │   ├── transactions/
│   │   │   ├── new.tsx
│   │   │   ├── [id].tsx          # Detalle de transacción
│   │   │   ├── photos.tsx
│   │   │   ├── tracking.tsx
│   │   │   └── confirm.tsx
│   │   └── disputes/
│   │       └── [id].tsx
│   ├── tx/                       # Link público (deeplink)
│   │   └── [slug].tsx            # safepay.cl/tx/:slug
│   └── _layout.tsx
├── components/
│   ├── ui/                       # Componentes genéricos
│   ├── transactions/
│   ├── payments/
│   └── disputes/
├── hooks/
│   ├── useAuth.ts
│   ├── useTransaction.ts
│   └── usePayment.ts
├── store/                        # Zustand stores
│   ├── auth.store.ts
│   ├── transaction.store.ts
│   └── notification.store.ts
├── services/                     # Llamadas a la API
│   ├── api.ts                    # Instancia Axios
│   ├── auth.service.ts
│   ├── transaction.service.ts
│   └── payment.service.ts
├── constants/
│   ├── colors.ts
│   └── tx-states.ts
├── types/
│   ├── transaction.types.ts
│   └── user.types.ts
├── app.json
├── package.json
└── .env
```

> **Expo Router** usa el sistema de archivos como rutas. Los grupos `(auth)` y `(app)` organizan sin afectar la URL. El archivo `[slug].tsx` captura el link de transacción como deeplink.

---

## 03. Estructura de Navegación

### Stack Auth — público
| Pantalla | Descripción | Auth |
|---|---|---|
| `LoginScreen` | Inicio de sesión | público |
| `RegisterScreen` | Registro de usuario | público |
| `VerifyOtpScreen` | Verificación SMS | público |

### Tab Principal — requiere auth
| Pantalla | Descripción |
|---|---|
| `HomeScreen` | Lista de transacciones activas e historial |
| `NewTxScreen` | Crear nueva transacción |
| `NotificationsScreen` | Centro de notificaciones |
| `ProfileScreen` | Perfil y ajustes |

### Stack Transacción — requiere auth
| Pantalla | Descripción |
|---|---|
| `TxDetailScreen` | Detalle + estado actual (cambia por rol y estado) |
| `TxPhotosScreen` | Subir fotos de publicación o recepción |
| `TxConfirmScreen` | Confirmar recepción conforme |
| `TxTrackingScreen` | Seguimiento del courier |

### Deep Link Público — mixto
| Pantalla | URL | Auth |
|---|---|---|
| `TxLinkScreen` | `safepay.cl/tx/[slug]` | público |
| `→ PayScreen` | Checkout Mercado Pago | **sin login — pago anónimo permitido** |
| `→ PostPayRegister` | Registro/login post-pago | solicitado tras pago para gestionar Tx |
| `→ AcceptScreen` | Aceptar propuesta | requiere auth |
| `DisputeScreen` | Abrir / responder disputa | requiere auth |

**Tabla de acciones en `TxLinkScreen` — anónimas vs autenticadas:**

| Acción | ¿Requiere cuenta SafePay? | Notas |
|---|---|---|
| Ver resumen del producto | ❌ No | Siempre visible |
| Ver perfil y rating del vendedor | ❌ No | Siempre visible |
| Ver desglose de costos | ❌ No | Siempre visible |
| **Pagar (checkout MP)** | ❌ No | Pago 100% anónimo via MP |
| Ver estado de la Tx tras pagar | ✅ Sí | Solicita registro post-pago |
| Confirmar recepción del producto | ✅ Sí | Requiere ser el comprador autenticado |
| Abrir disputa | ✅ Sí | Requiere ser el comprador autenticado |
| Aceptar propuesta (si inicia comprador) | ✅ Sí | Requiere ser el vendedor autenticado |
| Ingresar número de tracking | ✅ Sí | Requiere ser el vendedor autenticado |

> El comprador puede pagar sin cuenta SafePay. Sin embargo, para confirmar, disputar o seguir el estado de la transacción **necesita registrarse**. SafePay solicita el registro inmediatamente después de completar el pago en MP con el mensaje: *"Tu pago fue recibido. Crea una cuenta para confirmar la recepción y proteger tu compra."*

---

## 04. Flujo de Pantallas — Casos Principales

### Flujo A · Vendedor inicia · Con envío
```
Login → NewTx → Fotos publicación → Link generado
→ [comprador paga] → Tracking → Completado
```

### Flujo B · Comprador inicia · Con envío
```
Login → NewTx → Link generado
→ [vendedor acepta + sube fotos] → Pago → Tracking → Completado
```

### Flujo C · Presencial · Cualquier iniciador
```
Login → NewTx presencial → Fotos publicación → Pago retenido
→ Encuentro → Confirmar → Liberar
```

### Flujo D · Disputa
```
Entregado → Abrir disputa → Subir evidencia
→ Respuesta vendedor → Resolución → Reembolso / Liberar
```

---

## 05. Pantallas Clave — Detalle

### HomeScreen
Lista de transacciones activas e historial. Filtro por estado y rol.
- Lista transacciones activas con badge de estado por color
- Historial de completados
- FAB → crear nueva transacción

### NewTxScreen
Formulario para crear una nueva transacción.
- Toggle vendedor / comprador
- Toggle envío / presencial
- Input monto + descripción
- Selector quién paga el fee
- Preview desglose de costos en tiempo real
- Generar link para compartir

### TxLinkScreen
Vista pública del link. Accesible sin cuenta.
- Resumen del producto
- Desglose de costos claro
- Perfil del vendedor (nombre + rating)
- CTA → Pagar ahora (**no requiere cuenta SafePay**)
- Tras pagar: SafePay solicita crear cuenta o iniciar sesión para confirmar/disputar recepción

### TxDetailScreen
Vista principal de transacción activa. Cambia según estado y rol.
- Timeline de estados
- Acciones disponibles según rol + estado actual
- Fotos de publicación
- Info de tracking (si aplica)
- Botón confirmar / disputar

### TxPhotosScreen
Subida de fotos del producto.
- Cámara nativa (expo-camera)
- Galería de selección (expo-image-picker)
- Preview antes de subir
- Mínimo 1, máximo 5 fotos
- Indicador de progreso de upload

### DisputeScreen
Apertura y seguimiento de disputa.
- Selector de motivo (5 opciones)
- Campo descripción obligatorio
- Adjuntar fotos de evidencia
- Vista respuesta de la contraparte
- Estado de resolución

---

## 06. Estado Global — Zustand Stores

### auth.store.ts — persiste en AsyncStorage
```typescript
{
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login(): action
  logout(): action
  refreshToken(): action
}
```

### transaction.store.ts — solo memoria
```typescript
{
  transactions: Transaction[]
  activeTransaction: Transaction | null
  isLoading: boolean
  setActive(): action
  updateStatus(): action
  addTransaction(): action
}
```

### notification.store.ts — solo memoria
```typescript
{
  notifications: Notification[]
  unreadCount: number
  deviceToken: string | null
  markAsRead(): action
  setDeviceToken(): action
}
```

---

## 07. Librerías Principales

| Librería | Versión | Uso |
|---|---|---|
| `expo-router` | ~3.x | Navegación file-based + deep linking |
| `zustand` | ^4.x | Estado global con middleware de persistencia |
| `@tanstack/react-query` | ^5.x | Caché de servidor y revalidación automática |
| `axios` | ^1.x | HTTP client con interceptores JWT |
| `expo-camera` | ~14.x | Cámara nativa para registro fotográfico |
| `expo-image-picker` | ~15.x | Selección de imágenes desde galería |
| `expo-notifications` | ~0.28.x | Push notifications con FCM |
| `expo-secure-store` | ~13.x | Refresh token en keychain iOS / keystore Android |
| `react-native-paper` | ^5.x | Componentes UI accesibles base |

> **Importante:** El SDK de Mercado Pago para React Native requiere configuración adicional en `ios/` y `android/`. Se recomienda usar **Expo Development Build** (no Expo Go) una vez integrado el SDK nativo de MP.
