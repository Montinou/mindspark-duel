# Configuración de Cloudflare R2 para MindSpark Duel

## ✅ Completado

1. **Bucket R2 creado**: `mindspark-duel-cards`
2. **Base de datos NeonDB**: Esquema completo con 5 tablas
3. **API Routes**: Implementadas para cards, users, y user-cards
4. **Card Generator**: Actualizado para persistir en base de datos

## 🔑 Pasos Pendientes para Completar la Configuración

### 1. Obtener Credenciales de API de R2

Necesitas crear credenciales de acceso API en Cloudflare:

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navega a **R2** → **Overview**
3. Click en **Manage R2 API Tokens**
4. Click en **Create API Token**
5. Configura:
   - **Token name**: `mindspark-duel-access`
   - **Permissions**: Object Read & Write
   - **Bucket**: `mindspark-duel-cards`
6. Copia el **Access Key ID** y **Secret Access Key**

### 2. Configurar URL Pública del Bucket

Para que las imágenes sean accesibles públicamente:

1. En el dashboard de R2, selecciona el bucket `mindspark-duel-cards`
2. Ve a **Settings** → **Public Access**
3. Habilita **Allow public access**
4. Configura un dominio personalizado o usa el dominio R2 público
5. Copia la URL pública (formato: `https://pub-YOUR_ID.r2.dev`)

### 3. Actualizar Variables de Entorno

Edita el archivo `.env.local` y reemplaza estos valores:

```bash
R2_ACCESS_KEY_ID="TU_ACCESS_KEY_AQUI"
R2_SECRET_ACCESS_KEY="TU_SECRET_KEY_AQUI"
R2_PUBLIC_URL="https://pub-YOUR_ID.r2.dev"
```

## 📊 Estructura de Base de Datos Creada

### Tablas

1. **users** - Usuarios del juego
   - id, name, email, created_at, updated_at

2. **cards** - Catálogo de cartas
   - id, name, description, cost, power, defense, element, problem_category, image_url, created_by_id, created_at

3. **user_cards** - Relación muchos a muchos (usuarios poseen cartas)
   - id, user_id, card_id, acquired_at

4. **problems** - Problemas educativos de cada carta
   - id, card_id, question, options, correct_answer, difficulty, created_at

5. **game_sessions** - Historial de partidas
   - id, player_id, enemy_id, is_ai_opponent, winner_id, turns_count, started_at, ended_at

## 🚀 API Endpoints Disponibles

### Cards
- `GET /api/cards` - Obtener todas las cartas
- `GET /api/cards?userId={id}` - Obtener cartas de un usuario específico
- `POST /api/cards` - Crear una nueva carta
- `POST /api/cards/upload` - Subir imagen a R2

### Users
- `GET /api/users?email={email}` - Obtener usuario por email
- `POST /api/users` - Crear nuevo usuario

### User Cards
- `POST /api/user-cards` - Asignar carta a usuario
- `DELETE /api/user-cards?userId={id}&cardId={id}` - Remover carta de usuario

## 🧪 Probar la Configuración

Una vez que hayas actualizado las credenciales de R2:

```bash
# Verificar que la base de datos está funcionando
npm run db:studio

# Iniciar el servidor de desarrollo
npm run dev
```

## 📝 Comandos Útiles

```bash
# Ver base de datos en navegador
npm run db:studio

# Generar nuevas migraciones después de cambios en schema
npm run db:generate

# Aplicar cambios al schema (desarrollo)
npm run db:push -- --force

# Listar buckets R2
wrangler r2 bucket list

# Ver objetos en el bucket
wrangler r2 object list mindspark-duel-cards
```

## 🔐 Configuración CORS

La configuración CORS del bucket puede hacerse desde el dashboard de Cloudflare:

1. Ve a R2 → `mindspark-duel-cards` → Settings
2. Scroll a **CORS Policy**
3. Agrega esta configuración:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## 📖 Próximos Pasos

1. Crear componente de UI para subir imágenes de cartas personalizadas
2. Implementar sistema de autenticación de usuarios
3. Agregar lógica para asignar automáticamente cartas generadas al usuario
4. Crear dashboard de administración de cartas
