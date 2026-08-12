# Jannat POS — ERP система для небольших магазинов

## Технологии
- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: Next.js + TailwindCSS

## Деплой

### Backend → Render.com
- Root Directory: `backend`
- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npx prisma migrate deploy && npm run start:prod`
- Environment Variables: см. `backend/.env.example`

### Frontend → Vercel.com
- Root Directory: `frontend`
- Build Command: `npm run build`
- Environment Variables: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`

### Database → Neon.tech
- Создать проект → скопировать `DATABASE_URL` → вставить в Render
