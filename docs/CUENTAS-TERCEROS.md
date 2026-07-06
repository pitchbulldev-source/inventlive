# Cuentas de terceros — InventLive

Crear en este orden. Con las 🔴 + Wompi ya se puede lanzar un piloto.

## 🔴 Imprescindibles
| Servicio | URL | Para qué | Claves que necesito |
|---|---|---|---|
| **Supabase Cloud** | supabase.com | DB productiva (hoy es local) | Project URL, anon key, service_role key |
| **Vercel** | vercel.com | Hosting del Next.js | (conectar GitHub) |
| **LiveKit Cloud** | cloud.livekit.io | Video en vivo real | API Key, API Secret, WS URL |

## 🟠 Monetización (LATAM)
| Servicio | URL | Para qué | Claves |
|---|---|---|---|
| **Wompi** | comercios.wompi.co | Comprar fichas (PSE/Nequi/tarjeta COP) | llave pública, privada, secret de eventos |
| **Stripe + Connect** | stripe.com | Payout a hosts (internacional) | API keys + activar Connect |

## 🟡 Compliance / moderación (antes de abrir al público)
| Servicio | URL | Para qué |
|---|---|---|
| **Truora** | truora.com | KYC/AML de hosts (SARLAFT) |
| **Hive AI** | hivemoderation.com | Moderación de contenido en vivo |

## 🟢 Recomendadas
| Servicio | URL | Para qué |
|---|---|---|
| **Sentry** | sentry.io | Errores + monitoreo |
| **Resend** | resend.com | Emails transaccionales |

> Regla: no expongas nunca `service_role`, `API Secret` de LiveKit, ni la llave privada de
> Wompi/Stripe en el cliente. Todas van como env vars server-side.
