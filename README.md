# Comisiones Tecni - Sistema de Registro y Consulta de Entregas

Aplicación web para registro y consulta de entregas con autenticación Supabase Auth, desarrollada con Next.js, TypeScript y Tailwind CSS.

## Características

- ✅ Autenticación con Supabase Auth (login y registro)
- ✅ Registro de entregas por usuario autenticado
- ✅ Consulta personal de entregas con filtros por fecha
- ✅ Panel de administrador con consulta de todas las entregas
- ✅ Cálculo de totales por usuario y total general
- ✅ Exportación de datos a CSV
- ✅ Interfaz responsive y moderna
- ✅ Seguridad con Row Level Security (RLS)

## Requisitos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase (gratis)

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Configura las variables de entorno:

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
NEXT_PUBLIC_ADMIN_EMAILS=admin@ejemplo.com,otro@ejemplo.com
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**Nota importante sobre SUPABASE_SERVICE_ROLE_KEY:**
- Esta clave solo debe usarse en el servidor (rutas de API)
- NUNCA debe exponerse en el cliente
- Se obtiene desde Supabase Dashboard > Settings > API > service_role key
- Es necesaria para que los administradores puedan consultar todas las entregas

3. Configura la base de datos en Supabase:

- Ve a tu proyecto en Supabase
- Abre el SQL Editor
- Ejecuta el script `setup_database.sql` que se encuentra en la raíz del proyecto

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Configuración de Administradores

Los administradores se definen mediante la variable de entorno `NEXT_PUBLIC_ADMIN_EMAILS`. 

Ejemplo:
```env
NEXT_PUBLIC_ADMIN_EMAILS=admin@ejemplo.com,gerente@ejemplo.com
```

Los emails deben estar separados por comas. Solo los usuarios con estos emails tendrán acceso al panel de administrador.

## Estructura del Proyecto

```
ComisionesTecni/
├── app/
│   ├── api/
│   │   └── entregas/
│   │       ├── route.ts          # API para CRUD de entregas
│   │       └── admin/
│   │           └── route.ts      # API para consultas de administrador
│   ├── admin/
│   │   └── page.tsx              # Página de administrador
│   ├── mis-entregas/
│   │   └── page.tsx              # Página de consulta personal
│   ├── registro/
│   │   └── page.tsx              # Página de registro de entregas
│   ├── layout.tsx                # Layout principal
│   ├── page.tsx                  # Página de login
│   └── globals.css               # Estilos globales
├── components/
│   └── ProtegerRuta.tsx          # Componente de protección de rutas
├── lib/
│   ├── auth.ts                   # Funciones de autenticación
│   └── database.ts               # Funciones de base de datos
├── types/
│   └── entrega.ts                # Tipos TypeScript
├── setup_database.sql            # Script SQL para configurar la BD
└── package.json
```

## Funcionalidades

### Autenticación (RF1)
- Login y registro por correo y contraseña
- Validación de sesión activa
- Redirección automática al login cuando no hay sesión
- Diferenciación entre usuarios estándar y administradores

### Registro de Entregas (RF2)
- Campos: Fecha del domicilio, Número de factura, Valor
- Validación de campos obligatorios
- Validación de formato numérico
- Asociación automática al usuario autenticado

### Consulta Personal (RF3)
- Vista de todas las entregas del usuario
- Filtros por rango de fechas
- Cálculo de totales
- Tabla ordenable

### Panel de Administrador (RF3)
- Consulta de todas las entregas del sistema
- Filtro obligatorio por rango de fechas
- Totales por usuario
- Total general
- Exportación a CSV

## Seguridad

- Row Level Security (RLS) habilitado en Supabase
- Los usuarios solo pueden ver y crear sus propias entregas
- Los administradores acceden a todas las entregas mediante el servicio admin
- Validación de datos en cliente y servidor
- Protección de rutas con verificación de autenticación

## Despliegue en Vercel

1. Conecta tu repositorio a Vercel
2. Vercel detectará automáticamente Next.js
3. Configura las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_EMAILS`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo en servidor)
4. El despliegue se realizará automáticamente

## Notas Importantes

- La variable `SUPABASE_SERVICE_ROLE_KEY` solo debe configurarse en Vercel como variable de entorno del servidor (no como variable pública)
- Los administradores se definen manualmente mediante la variable `NEXT_PUBLIC_ADMIN_EMAILS`
- La base de datos debe configurarse ejecutando el script SQL antes de usar la aplicación

## Licencia

Este proyecto es privado y de uso interno.
