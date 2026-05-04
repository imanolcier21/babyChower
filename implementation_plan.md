# 🍯 Baby Shower Winnie Pooh — Plan de Implementación (v2)

## Descripción

Aplicación web **dinámica** con base de datos para el baby shower. Cada invitado recibe un **link único** (vía WhatsApp) que le permite confirmar asistencia solo con el número de personas que tú le asignaste. La página corre desde tu computadora y es accesible desde internet mediante **port forwarding** en tu router — sin VPN, sin apps adicionales.

---

## Acceso Externo vía Port Forwarding

> [!IMPORTANT]
> Esta es la solución más limpia para acceso externo. Solo requiere configurar tu router UNA VEZ.

### Cómo funciona
```
Internet
   │
   │  (tu IP pública, ej: 201.45.X.X)
   ▼
Tu Router  ──► Puerto abierto 3000  ──► Tu PC (192.168.1.X:3000)
                                              │
                                         Servidor Node.js
```

### Pasos para configurar (solo una vez)
1. Entrar al panel de tu router: `http://192.168.1.1` (o `192.168.0.1`)
2. Buscar la sección **"Port Forwarding"** o **"Reenvío de puertos"**
3. Crear regla: Puerto externo `3000` → IP de tu PC → Puerto interno `3000`
4. Obtener tu IP pública en [https://whatismyip.com](https://whatismyip.com)
5. El link que compartes con invitados: `http://TU.IP.PÚBLICA:3000`

> [!TIP]
> Si tu IP pública cambia frecuentemente (pasa con algunos proveedores), podemos configurar **Duck DNS** (gratis) para tener un link fijo tipo `http://babychower.duckdns.org:3000`. ¿Lo quieres?

---

## Sistema de Invitados

### Flujo del invitado
```
Tú envías WhatsApp con link único
        │
        ▼
Invitado abre: http://TU.IP:3000/invite/abc123xyz
        │
        ▼
Ve página personalizada con su nombre y cuántos lugares tiene
        │
        ▼
Selecciona cuántos van (máx = lo que tú asignaste)
        │
        ▼
Confirma → se guarda en BD → tú ves la actualización en tiempo real
```

### Reglas de negocio
- Cada invitado tiene un **token único** (link irrepetible)
- Solo puede confirmar **entre 1 y su cuota máxima** asignada
- Si intenta confirmar más → el sistema lo bloquea automáticamente
- Puede cambiar su confirmación antes de una fecha límite
- Si ya confirmó, el link muestra su respuesta actual

---

## Panel de Administrador (solo tú)

Accesible en: `http://localhost:3000/admin` (protegido con contraseña)

| Función | Descripción |
|---|---|
| ➕ Agregar invitado | Nombre, teléfono, cuota de personas |
| 📋 Ver lista completa | Quién confirmó, cuántos vienen, quién no ha respondido |
| 📊 Contador en tiempo real | Total confirmados vs. total invitados |
| 🔗 Generar link | Link único para copiar y pegar en WhatsApp |
| ✏️ Editar invitado | Cambiar cuota o datos |
| ❌ Cancelar invitación | Marcar como cancelada |

---

## Base de Datos

Usaremos **SQLite** — es un archivo `.db` en tu computadora, sin instalar nada extra.

### Tabla `guests`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER | ID único |
| `name` | TEXT | Nombre del invitado |
| `phone` | TEXT | Número WhatsApp |
| `max_guests` | INTEGER | Cuota máxima asignada por ti |
| `token` | TEXT | Token único del link |
| `confirmed` | INTEGER | Cuántos confirmaron (null = no respondió) |
| `confirmed_at` | DATETIME | Fecha de confirmación |
| `notes` | TEXT | Notas opcionales |

---

## Diseño — Temática Winnie Pooh 🍯

- **Paleta de colores:** Amarillo miel (#F5C842), naranja suave (#E8955A), verde bosque (#7EAD6E), crema (#FFF8E7)
- **Tipografía:** Fuente redondeada y cálida (Google Fonts)
- **Elementos decorativos:** Panales de abeja, flores, siluetas de Winnie y sus amigos
- **Animaciones:** Flotar suave de elementos, efectos de miel, confetti al confirmar
- **Imágenes:** Generadas con IA o assets de Winnie Pooh (te preguntaré tus preferencias)

### Secciones de la página principal
| Sección | Descripción |
|---|---|
| 🍯 Hero animado | "¡Bienvenido al Baby Shower de [Nombre]!" con fecha |
| 📅 Detalles del evento | Fecha, hora, lugar |
| 👶 Mensaje especial | Texto personalizado sobre el bebé |
| 🎁 Lista de regalos | Opcional — lo que necesitan |
| ✅ Mi Confirmación | Formulario RSVP (solo accesible con link único) |

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Backend** | Node.js + Express |
| **Base de datos** | SQLite (via `better-sqlite3`) |
| **Frontend** | HTML + CSS + JavaScript vanilla |
| **Autenticación invitados** | Token UUID en URL |
| **Admin** | Ruta protegida con contraseña simple |

---

## Estructura de Archivos

```
babyChower/
├── server.js           # Servidor Express + rutas API
├── database.js         # Lógica de BD SQLite
├── package.json
├── data/
│   └── babychower.db   # Base de datos SQLite (se crea automático)
└── public/
    ├── index.html      # Página de inicio / hero
    ├── invite.html     # Página de RSVP del invitado
    ├── admin.html      # Panel de administrador
    ├── css/
    │   └── style.css
    ├── js/
    │   └── main.js
    └── images/
```

---

## Open Questions

> [!IMPORTANT]
> Necesito estos datos para poder construir todo:

1. **Nombre del bebé y/o de la mamá** (para personalizar la página)
2. **Fecha, hora y lugar** del baby shower
3. **¿Quieres Duck DNS?** (link fijo tipo `babychower.duckdns.org` en lugar de IP que puede cambiar)
4. **¿Tienes imágenes** para la galería / portada? (embarazo, ecografía, etc.)
5. **¿Quieres sección de lista de regalos?**
6. **¿Niño o niña?** (para ajustar colores secundarios)
7. **¿Tienes Node.js instalado?** (puedo verificarlo ahora mismo)
8. **¿Quieres que la página principal sea pública** (visible sin link único) o solo accesible con el link?

---

## Verification Plan

- ✅ Probar RSVP con varios tokens distintos
- ✅ Verificar que el límite de personas se respeta
- ✅ Verificar panel admin desde `localhost`
- ✅ Probar acceso desde celular en red WiFi
- ✅ Probar acceso externo tras configurar port forwarding
