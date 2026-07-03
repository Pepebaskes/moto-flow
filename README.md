# MotoFlow

MVP responsive para gestion de taller de motocicletas con React, Vite, TypeScript, Tailwind CSS, React Router, Zustand, React Hook Form, Zod y Supabase.

## Instalacion

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env` y agrega tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_SUPABASE_STORAGE_BUCKET=evidencias
VITE_PUBLIC_APP_URL=http://localhost:5173
VITE_WHATSAPP_PROVIDER=
```

Si no agregas credenciales, MotoFlow funciona en modo mock con datos de ejemplo persistidos en `localStorage`.

## Correr el proyecto

```bash
npm run dev
```

Luego abre la URL que muestre Vite, normalmente `http://localhost:5173`.

## Compilar

```bash
npm run build
```

## Ejecutar el schema en Supabase

1. Crea un proyecto en Supabase.
2. Entra a `SQL Editor`.
3. Copia el contenido de `supabase/schema.sql`.
4. Ejecuta el script.
5. Crea un bucket de Storage llamado `evidencias` o cambia `VITE_SUPABASE_STORAGE_BUCKET`.
6. En `Authentication > Providers`, deja habilitado Email.
7. Reinicia Vite despues de crear o cambiar `.env`.

El schema crea las tablas `talleres`, `perfiles`, `clientes`, `motocicletas`, `ordenes_trabajo`, `evidencias` y `movimientos_orden`, con RLS basico por taller.

Para agregar la capa de notificaciones en una base existente, ejecuta tambien:

```text
supabase/migrations/add_customer_notifications.sql
```

Si ya habias creado `notificaciones_cliente` antes de conectar avisos desde bitacoras/trabajos, ejecuta:

```text
supabase/migrations/add_work_update_notifications.sql
```

Para agregar los gastos manuales del modulo de Balance en una base existente, ejecuta:

```text
supabase/migrations/add_balance_expenses.sql
```

## Accesos de prueba

No hay registro publico de usuarios. El panel del taller sólo permite entrar con usuarios internos.

```text
Admin
usuario: admin
contraseña: 123

Mecanico
usuario: mecanico
contraseña: 123
```

El cliente no necesita cuenta. En la pantalla inicial, del lado derecho, puede buscar por placas, nombre o numero de serie.

## Guardado real en Supabase

Cuando `.env` tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, MotoFlow guarda en Supabase usando el taller demo cerrado por el login interno de la app.

1. Ejecuta `supabase/schema.sql`.
2. Crea el bucket `evidencias`.
3. Configura `.env`.
4. Reinicia Vite.
5. Entra con `admin/123` o `mecanico/123`.

Sin `.env`, la app funciona en modo local con `localStorage`.

## Notificaciones automaticas al cliente

Cuando una orden de trabajo cambia de estado correctamente, MotoFlow prepara una notificacion para el cliente asociado. Tambien genera una notificacion cuando se agrega una bitacora visible para el cliente desde Trabajos activos. El sistema valida que el cliente tenga telefono, que acepte notificaciones y que no se haya notificado antes ese mismo movimiento.

La notificacion se guarda en la tabla `notificaciones_cliente` con canal `whatsapp`. Si `VITE_WHATSAPP_PROVIDER` esta vacio, MotoFlow registra la notificacion como simulada y escribe el aviso en consola. Si `VITE_WHATSAPP_PROVIDER=twilio`, MotoFlow invoca la Edge Function `send-whatsapp-notification`, que envia el mensaje desde Supabase usando secretos privados.

Variables publicas de la app:

```env
VITE_WHATSAPP_PROVIDER=twilio
VITE_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

`VITE_PUBLIC_APP_URL` se usa para construir el enlace del portal del cliente dentro del mensaje.

Nunca pongas `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID` ni `SUPABASE_SERVICE_ROLE_KEY` en Vercel ni en variables `VITE_`. Esos datos van como secretos de Supabase Edge Functions.

### Conectar WhatsApp con Twilio

1. Crea una cuenta en Twilio.
2. En Twilio, entra a `Messaging > Try it out > Send a WhatsApp message`.
3. Activa el WhatsApp Sandbox y une tu telefono al sandbox con el codigo que Twilio te indique.
4. Copia estos datos de Twilio:
   - `Account SID`
   - `Auth Token`
   - numero emisor del sandbox, normalmente parecido a `whatsapp:+14155238886`
5. Instala Supabase CLI si no lo tienes:

```bash
npm install -g supabase
```

6. Inicia sesion y vincula el proyecto:

```bash
supabase login
supabase link --project-ref lkzasfbwybwxmswibudj
```

7. Guarda los secretos en Supabase:

```bash
supabase secrets set WHATSAPP_PROVIDER=twilio
supabase secrets set TWILIO_ACCOUNT_SID=tu_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=tu_auth_token
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

8. Despliega la funcion:

```bash
supabase functions deploy send-whatsapp-notification
```

9. En Vercel y en tu `.env` local agrega:

```env
VITE_WHATSAPP_PROVIDER=twilio
VITE_PUBLIC_APP_URL=https://moto-flow.vercel.app
```

10. Haz redeploy en Vercel.
11. Cambia el estado de una orden. Si el cliente tiene telefono y acepta notificaciones, se crea el registro en `notificaciones_cliente` y la Edge Function intenta enviar el WhatsApp.

## Rutas principales

- `/` Dashboard
- `/clientes` Clientes
- `/motocicletas` Motocicletas
- `/bitacoras` Trabajos activos por moto
- `/cotizaciones` Cotizaciones
- `/balance` Balance mensual del taller
- `/consulta` Portal publico del cliente
- `/consulta/:codigo` Consulta por placas, nombre o numero de serie

## Balance mensual

El modulo de Balance calcula ingresos desde los costos registrados en trabajos/bitacoras y permite capturar gastos manuales del taller, como gasolina, luz, renta, comida, herramientas, refacciones u otros gastos.

El resumen mensual muestra ingresos, refacciones, gastos y utilidad neta. Tambien incluye una comparacion visual de los ultimos meses para detectar si el taller va mejor o peor que el mes anterior.

## Flujo recomendado del taller

1. Registra el cliente en `/clientes`.
2. Registra su motocicleta en `/motocicletas` con placas, kilometraje y datos de identificacion.
3. Al guardar la moto, MotoFlow crea automaticamente su ingreso al taller, con fecha y hora.
4. En `/bitacoras`, el mecanico abre el trabajo activo y registra diagnostico, prioridad, proceso, salida, cotizacion o nota.
5. Cada entrada puede marcarse como visible para el cliente y puede sumar costo a la cotizacion acumulada.
6. El cliente consulta el progreso en `/consulta` escribiendo sus placas, nombre o numero de serie.
7. El detalle de cada motocicleta muestra su historial acumulado.
