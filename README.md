# PickCrane Backend

API + WebSocket server para PickCrane. Maneja:
- Registro de usuarios con tres roles: `CLIENTE`, `GRUERO` y `ADMIN` (este último solo por seed, ver abajo)
- Certificación del gruero (subida de foto de grúa, licencia, certificado médico, RCV)
- Solicitudes dirigidas: el cliente elige un gruero específico (no hay pool abierto)
- Tarifa real por distancia (mínimo 20km cobrables) — ver `src/shared/lib/pricing.ts`
- Pago por Efectivo (con vuelto como saldo a favor) o Pago Móvil (verificado por un admin antes de activar el servicio)
- Ubicación en tiempo real vía Socket.IO (reemplaza cualquier simulación del frontend)

## Requisitos
- Node.js 20+
- MySQL (local o en la nube, ej. PlanetScale/Railway — gratis para empezar)

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tu DATABASE_URL real, un JWT_SECRET propio, y tus datos
# reales de Pago Móvil (PAGO_MOVIL_BANCO, PAGO_MOVIL_TELEFONO, PAGO_MOVIL_CEDULA)

npx prisma migrate dev --name init
npm run dev
```

El servidor levanta en `http://localhost:4000`.

## Ciclo de vida de un Servicio

```
PENDIENTE_PAGO → SOLICITADO → ASIGNADO → EN_CAMINO → LLEGADA → EN_TRASLADO → COMPLETADO
                                                                            ↘ CANCELADO (en cualquier punto)
```

- **PENDIENTE_PAGO**: solo aplica a Pago Móvil. El cliente ya declaró su número de referencia; el gruero elegido todavía NO se entera de nada hasta que un admin confirme el pago.
- **SOLICITADO**: el gruero elegido ya puede ver la solicitud (y la recibe al instante por Socket.IO). Para Efectivo, se llega aquí directo al crear el servicio.
- **ASIGNADO → EN_CAMINO → LLEGADA → EN_TRASLADO → COMPLETADO**: el gruero controla estas transiciones.
- Al llegar a **COMPLETADO** con método **EFECTIVO**, el backend automáticamente: confirma el pago, calcula la comisión de la plataforma (1.5% de la tarifa) y, si hubo vuelto, lo acredita como `saldoAFavor` en la cuenta del cliente. No hace falta ningún endpoint extra para "declarar" el efectivo — pasa solo al marcar `COMPLETADO`.

## Endpoints

### Auth
- `POST /auth/register` — body con `rol: "CLIENTE" | "GRUERO"`.
  - Si `rol: "CLIENTE"`: `{ email, password, nombre, telefono?, rol }`
  - Si `rol: "GRUERO"`: `{ email, password, nombre, telefono?, rol, tipoGrua, placa, direccion, latitud, longitud }`
  - Devuelve `{ token, usuario }` (usuario incluye `saldoAFavor`)
- `POST /auth/login` — `{ email, password }` → `{ token, usuario }`

### Gruero (rol GRUERO)
- `GET /gruero/perfil` — perfil + documentos subidos
- `POST /gruero/documentos` — multipart/form-data con `archivo` (file) y `tipo` (`FOTO_GRUA` | `LICENCIA` | `CERTIFICADO_MEDICO` | `RCV`). Al completar los 4 tipos, pasa a `EN_REVISION`.
- `PATCH /gruero/activo` — `{ activo: boolean, lat?, lng? }`. Solo permite activarse si `estadoCertificacion === "APROBADO"`.

### Grueros — para el cliente (rol CLIENTE)
- `GET /grueros/activos` — lista los grueros `activo: true` y `estadoCertificacion: APROBADO`, con su foto de grúa, para que el cliente elija a cuál dirigir la solicitud.

### Servicio (cualquier rol autenticado, según la ruta)
- `POST /servicio` — solo CLIENTE. Body:
  ```
  {
    grueroPerfilId,           // obligatorio: el gruero que el cliente eligió
    origenLat, origenLng, origenDireccion,
    destinoLat, destinoLng, destinoDireccion,
    distanciaKm?, duracionMin?,
    metodoPago: "EFECTIVO" | "PAGO_MOVIL",
    montoEntregado?,          // obligatorio si EFECTIVO (para calcular el vuelto)
    referenciaPago?           // obligatorio si PAGO_MOVIL (referencia de la transferencia ya hecha)
  }
  ```
  La tarifa NUNCA se recibe del cliente — siempre se calcula server-side con `calcularTarifa(distanciaKm)`.
- `GET /servicio/mis-servicios` — historial propio (cliente ve los suyos, gruero ve los que le asignaron).
- `GET /servicio/disponibles` — solo GRUERO. Solicitudes en estado `SOLICITADO` dirigidas a él.
- `GET /servicio/:id` — detalle, solo si eres el cliente o el gruero de ese servicio.
- `POST /servicio/:id/aceptar` — solo el GRUERO al que fue dirigido. Pasa a `ASIGNADO`.
- `PATCH /servicio/:id/estado` — `{ estado: "EN_CAMINO" | "LLEGADA" | "EN_TRASLADO" | "COMPLETADO" | "CANCELADO" }`. Las primeras cuatro solo las marca el gruero asignado; `CANCELADO` lo puede marcar cualquiera de las dos partes.

Cada cambio de estado emite `servicio:actualizado` por Socket.IO a la sala `servicio:<id>`. Cuando una solicitud pasa a `SOLICITADO` (efectivo al crearse, o pago móvil recién aprobado), también se emite `servicio:nuevo` a la sala personal `gruero:<usuarioId>` del gruero elegido, para que le llegue al instante sin depender de refrescar.

### Pago móvil — datos de la cuenta de la app (cualquier rol autenticado)
- `GET /pago/datos-pago-movil` — `{ banco, telefono, cedulaORif }`, tomados de tu `.env`.

### Admin (rol ADMIN)
- `GET /admin/grueros?estado=EN_REVISION` — lista grueros por estado de certificación.
- `GET /admin/grueros/:id` — detalle de un gruero puntual.
- `PATCH /admin/grueros/:id/certificacion` — `{ estado: "APROBADO" | "RECHAZADO" }`.
- `GET /admin/pagos` — pagos móviles con referencia declarada, pendientes de verificar (devuelve el `Pago` con su `servicio` anidado, incluyendo cliente y gruero).
- `PATCH /admin/pagos/:id/confirmar` — `{ aprobar: boolean }`. **`:id` es el id del Pago**, no del servicio. Si se aprueba, el servicio pasa a `SOLICITADO` y recién ahí se notifica al gruero; si se rechaza, el servicio pasa a `CANCELADO`.

No existe un endpoint público para crear usuarios ADMIN — se crean solo desde el servidor con el script de seed.

## Crear el usuario administrador (seed)

```bash
# opcional: define tu propio email/password antes de correr el seed
# (si no los defines, usa admin@pickcrane.com / admin123456 por defecto)
export ADMIN_EMAIL="tu-email@ejemplo.com"
export ADMIN_PASSWORD="una-contraseña-segura"

npx prisma db seed
```

Puedes correrlo de nuevo cuando quieras para cambiar la contraseña del admin (hace upsert por email).

## Tarifa real por distancia

`src/shared/lib/pricing.ts` calcula `max(distanciaKm, 20) * 1.25` USD — es decir, un piso de 20km cobrables (para no subcotizar trayectos cortos, ya que hay costos fijos de salida) y $1.25 por km, basado en referencias de mercado de grúas en Venezuela. Ajusta `PRECIO_POR_KM_USD` y `DISTANCIA_MINIMA_COBRABLE_KM` ahí mismo según tu mercado real — es la única fuente de verdad, tanto para lo que el cliente ve como estimado como para lo que realmente se cobra.

## Ubicación en tiempo real (Socket.IO)
Conexión con `auth: { token }` (el mismo JWT del login). Cada gruero se une automáticamente a su sala personal `gruero:<usuarioId>` al conectarse.

- Cliente hace `socket.emit('servicio:seguir', servicioId)` al confirmar un servicio
- Gruero hace `socket.emit('ubicacion:enviar', { servicioId, lat, lng, bearing })` cada pocos segundos (usando `navigator.geolocation.watchPosition`)
- Cliente escucha `socket.on('ubicacion:actualizada', ({ lat, lng, bearing }) => ...)` y mueve el marcador real
- Gruero escucha `socket.on('servicio:nuevo', (servicio) => ...)` para enterarse al instante de una solicitud dirigida a él

## Pendiente / próximos pasos
- El vuelto se acredita como `saldoAFavor` pero todavía no hay un endpoint para "canjearlo" automáticamente como descuento en un servicio futuro — hoy es solo informativo.
- Los uploads se guardan en disco local (`src/uploads`) — para producción conviene migrar a S3/Cloudinary.
