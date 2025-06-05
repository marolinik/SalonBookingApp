# Deployment na Render

## Priprema za produkciju

Aplikacija je spremna za deployment na Render sa PostgreSQL bazom podataka.

## Koraci za deployment

### 1. Kreiranje Render naloga
- Idite na [render.com](https://render.com) i napravite nalog
- Povežite vaš GitHub nalog

### 2. Fork ili push projekta na GitHub
- Pushujte ovaj projekat na vaš GitHub repository

### 3. Deployment preko Render Dashboard

#### Opcija A: Korišćenje render.yaml (preporučeno)
1. U Render dashboard, kliknite "New" → "Blueprint"
2. Povežite vaš GitHub repository
3. Render će automatski prepoznati `render.yaml` fajl
4. Kliknite "Apply" da kreirate sve servise

#### Opcija B: Manuelno kreiranje servisa
1. Kreirajte PostgreSQL bazu:
   - New → PostgreSQL
   - Name: helios-db
   - Database: helios
   - User: helios

2. Kreirajte Web Service:
   - New → Web Service
   - Povežite GitHub repo
   - Settings:
     - Build Command: `cd server && npm install`
     - Start Command: `cd server && node src/app.js`
     - Publish Directory: `client`

### 4. Environment varijable

Dodajte sledeće environment varijable u Render:

```env
NODE_ENV=production
JWT_SECRET=<generišite siguran random string>
PORT=10000

# Automatski se dodaje kada povežete bazu:
DATABASE_URL=<automatski popunjeno>

# Opciono za SMS:
SMS_API_KEY=<vaš SMS API ključ>
SMS_API_URL=https://api.smsagent.rs/v1/sms/bulk
```

### 5. Custom domen (opciono)
- U Settings → Custom Domain
- Dodajte vaš domen i pratite DNS instrukcije

## Lokalni development

Za lokalni development, kreirajte `server/.env` fajl:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key
```

## Struktura projekta

```
helios/
├── client/          # Frontend (statički fajlovi)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── server/          # Backend
│   ├── src/
│   │   ├── app.js
│   │   ├── db/
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── render.yaml      # Render konfiguracija
└── README.md
```

## Korisnici

Default korisnici (biće kreirani automatski):
- Username: `dragana`, Password: `dragana123`
- Username: `snezana`, Password: `snezana123`

## Napomene

- Aplikacija automatski prebacuje između SQLite (development) i PostgreSQL (production)
- SMS notifikacije rade u test modu dok ne konfigurišete SMS_API_KEY
- Dnevni podsetnici se šalju u 18:00h 