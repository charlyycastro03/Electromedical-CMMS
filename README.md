# Electromedical CMMS

Sistema de Gestión de Mantenimiento para Equipos Biomédicos (CMMS).

## Características

- Gestión de equipos médicos
- Programación de mantenimientos preventivos y correctivos
- Sistema de tickets para reportar fallas
- Help Desk público accesible vía QR
- Dashboard con indicadores
- Gestión de usuarios con roles (admin, usuario, cliente)

## Tecnologías

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (Supabase)
- **Autenticación:** Sesiones con express-session + bcryptjs
- **Frontend:** SPA (Single Page Application)
- **Hosting:** Vercel

## Demo

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@electromedical.com | Admin2026 |
| Usuario | carlos@electromedical.com | User2026 |
| Cliente | hospital@cliente.com | Cliente2026 |

## Despliegue en Vercel

### 1. Configurar base de datos PostgreSQL (Supabase)

Ejecuta el contenido de `sql/schema.sql` en el **SQL Editor** de Supabase para crear las tablas y los datos de prueba.

### 2. Variables de entorno en Vercel

Agrega esta variable en **Vercel Dashboard > Settings > Environment Variables**:

```
DATABASE_URL=postgresql://postgres:Electromedical-CMMS@db.lwhaqmifmdmnwbobjlsn.supabase.co:5432/postgres
```

### 3. Conectar repositorio

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Conecta tu repositorio de GitHub
2. Vercel detectará automáticamente la configuración
3. Agrega la variable `DATABASE_URL`
4. La app estará lista en minutos

## Ejecución local

```bash
npm install
npm start
```

La aplicación estará disponible en `http://localhost:3000`.

Para desarrollo local necesitas la variable `DATABASE_URL` apuntando a tu base de datos PostgreSQL.
