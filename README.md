# 🚀 GHL Performance Billing System

Backend automatizado para la gestión de cobro por desempeño, integrando el CRM de **GoHighLevel** con la **Marketing API de Meta** y persistencia de datos en **Supabase**.

## 🛠️ Stack Tecnológico
- **Runtime:** Node.js (v18+)
- **Hosting:** Vercel (Serverless Functions)
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** OAuth 2.0 (GHL) & System User Tokens (Meta)

---

## ⚙️ Configuración de Variables de Entorno (Vercel)

Para que el sistema funcione, debes configurar las siguientes variables en el panel de **Vercel > Settings > Environment Variables**:

### 1. GoHighLevel (App Marketplace)
- `CLIENT_ID`: Client ID de tu App en GHL.
- `CLIENT_SECRET`: Client Secret de tu App en GHL.
- `COMPANY_ID`: El ID de tu Agencia (Company ID).

### 2. Meta Ads (Marketing API)
- `META_SYSTEM_USER_TOKEN`: Token de acceso permanente del System User.
- `META_AGENCY_PORTFOLIO_ID`: ID de tu Business Portfolio de agencia.

### 3. Base de Datos (Supabase)
- `DATABASE_URL`: URL del proyecto de Supabase.
- `DATABASE_SERVICE_KEY`: Service Role Key (para bypass de RLS).

### 4. Seguridad Interna
- `CUSTOM_AUTH_KEY`: Un token estático definido por ti (ej. `mi_clave_secreta_123`) para validar los webhooks entrantes de GHL.

---

## 🚦 Endpoints de la API


| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `/api/ghl/callback` | `GET` | URL de redirección para la autorización inicial OAuth. |
| `/api/ghl/subaccount-setup` | `POST` | Registra el cliente en DB y actualiza Custom Values. |
| `/api/ad-platforms/ad-spend` | `GET` | Calcula el gasto total atribuible (Meta) para un `location_id`. |
| `/api/ad-platforms/sync-all` | `POST` | Cron Job diario que sincroniza campañas nuevas de la agencia. |

---

## 🔄 Flujo de Trabajo (Workflows)

1. **Autorización Inicial:** Visita `https://tu-dominio.vercel.app` para vincular tu agencia.
2. **Onboarding:** Configura un Webhook en GHL que dispare a `/api/ghl/subaccount-setup` al crear una subcuenta.
3. **Cálculo de Ciclo:** Cada 28 días, GHL consulta `/api/ad-platforms/ad-spend` para obtener el gasto y realizar el cálculo de la cuota de desempeño.

---

## 📅 Mantenimiento (Cron Jobs)
El archivo `vercel.json` ya incluye la configuración para que el polling de campañas se ejecute automáticamente a las **00:00 UTC**.

---
*Desarrollado para automatización de agencias SaaS.*
