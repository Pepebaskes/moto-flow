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

## Rutas principales

- `/` Dashboard
- `/clientes` Clientes
- `/motocicletas` Motocicletas
- `/bitacoras` Trabajos activos por moto
- `/cotizaciones` Cotizaciones
- `/consulta` Portal publico del cliente
- `/consulta/:codigo` Consulta por placas, nombre o numero de serie

## Flujo recomendado del taller

1. Registra el cliente en `/clientes`.
2. Registra su motocicleta en `/motocicletas` con placas, kilometraje y datos de identificacion.
3. Al guardar la moto, MotoFlow crea automaticamente su ingreso al taller, con fecha y hora.
4. En `/bitacoras`, el mecanico abre el trabajo activo y registra diagnostico, prioridad, proceso, salida, cotizacion o nota.
5. Cada entrada puede marcarse como visible para el cliente y puede sumar costo a la cotizacion acumulada.
6. El cliente consulta el progreso en `/consulta` escribiendo sus placas, nombre o numero de serie.
7. El detalle de cada motocicleta muestra su historial acumulado.
