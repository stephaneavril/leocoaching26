# LEO Coaching (New) – sin HeyGen

Sistema mínimo con:
- Avatar estático (imagen)
- Autenticación moderna con **cookies HttpOnly** (Access+Refresh)
- Evaluación por reglas vía `/api/eval` (fácil de cambiar a IA sin romper el front)

## Cómo correr

```bash
pnpm i   # o npm i / yarn
cp .env.example .env.local
pnpm dev # o npm run dev
```

Login demo:
- **Email:** `demo@virtual.mx`
- **Password:** `demo123` (o cambia `DEMO_PASS` en `.env.local`)

Rutas:
- `/login`
- `/interactive-session` (protegida)
- `/api/auth/login` | `/api/auth/refresh` | `/api/auth/logout`
- `/api/eval`

## Migrar a IA
En `app/api/eval/route.ts` agrega un flag de entorno `EVAL_MODE=ai` y llama a tu LLM preferido; retorna **el mismo JSON** `{ scores, feedback, mode }`.

## Producción
- Usa `JWT_SECRET` robusto.
- Activa HTTPS para `Secure` cookies.
- Reemplaza `findUserByEmail` con tu DB real (usuarios con contraseñas **hasheadas** `bcrypt`).
