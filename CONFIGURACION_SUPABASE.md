# Configuración de Supabase para Recuperación de Contraseña

## Problema: "Token de recuperación inválido o expirado"

Si recibes este error al intentar restablecer tu contraseña, es probable que la URL de redirección no esté configurada correctamente en Supabase.

## Solución: Configurar URLs Permitidas en Supabase

### Paso 1: Acceder a la Configuración de Autenticación

1. Inicia sesión en tu [Dashboard de Supabase](https://app.supabase.com)
2. Selecciona tu proyecto
3. En el menú lateral izquierdo, haz clic en **"Authentication"**
4. Haz clic en la pestaña **"URL Configuration"**

### Paso 2: Configurar Site URL

En el campo **"Site URL"**, ingresa la URL base de tu aplicación:

- **Producción**: `https://comision-tecni.vercel.app`
- **Desarrollo local**: `http://localhost:3000`

### Paso 3: Agregar URLs de Redirección Permitidas

En la sección **"Redirect URLs"**, haz clic en **"Add URL"** y agrega las siguientes URLs:

#### Para Producción:
```
https://comision-tecni.vercel.app/reset-password
https://comision-tecni.vercel.app/**
```

#### Para Desarrollo Local:
```
http://localhost:3000/reset-password
http://localhost:3000/**
```

#### Usando Wildcards (Recomendado para Vercel):
Si tu aplicación está en Vercel y puede tener múltiples URLs (preview deployments), puedes usar wildcards:

```
https://*.vercel.app/**
https://comision-tecni.vercel.app/**
```

**Nota**: El wildcard `**` permite cualquier ruta bajo ese dominio.

### Paso 4: Guardar Cambios

1. Haz clic en **"Save"** para guardar los cambios
2. Espera unos segundos para que los cambios se apliquen

### Paso 5: Verificar la Configuración

Después de configurar las URLs:

1. Solicita un nuevo enlace de recuperación de contraseña
2. Haz clic en el enlace que recibes por correo
3. Deberías ser redirigido a `/reset-password` con los tokens en el hash de la URL
4. El formulario debería aparecer correctamente

## Formato del Enlace de Recuperación

Supabase envía un enlace con este formato:

```
https://tu-proyecto.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=https://comision-tecni.vercel.app/reset-password
```

Cuando haces clic en este enlace:
1. Supabase verifica el token en su servidor
2. Supabase redirige a `redirect_to` con los tokens en el hash: `#access_token=...&refresh_token=...&type=recovery`
3. La aplicación procesa estos tokens y permite cambiar la contraseña

## Solución de Problemas

### Error: "Token inválido o expirado"

**Causas posibles:**
1. La URL de redirección no está en la lista de URLs permitidas
2. El token ha expirado (los tokens de recuperación expiran después de 1 hora por defecto)
3. El token ya fue usado

**Solución:**
1. Verifica que la URL esté en la lista de URLs permitidas en Supabase
2. Solicita un nuevo enlace de recuperación
3. Asegúrate de usar el enlace dentro de 1 hora

### El enlace redirige pero no aparece el formulario

**Causa:** Los tokens no están llegando en el hash de la URL

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca mensajes que empiecen con `[ResetPassword]`
3. Verifica que la URL tenga el hash `#access_token=...`
4. Si no hay hash, verifica la configuración de URLs permitidas en Supabase

## Referencias

- [Documentación de Supabase sobre Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Documentación de Supabase sobre Password Reset](https://supabase.com/docs/guides/auth/auth-password-reset)

