# Helios - Salon Booking System

Sistem za zakazivanje termina za salon Helios sa podrškom za dva zaposlena.

## 🚀 Karakteristike

- 📅 **Kalendarski prikaz** - Dan i nedelja
- 👥 **Upravljanje klijentima** - CRUD operacije sa pretragom
- 💅 **Upravljanje uslugama** - Pojedinačne i grupne usluge
- 📱 **SMS notifikacije** - Potvrde i podsetnici
- 🔐 **Autentifikacija** - JWT based
- 📱 **PWA podrška** - Radi offline na mobilnim uređajima
- 🎨 **Responsive dizajn** - Optimizovan za sve uređaje

## 🛠️ Tehnologije

### Backend
- Node.js + Express
- SQLite (development) / PostgreSQL (production)
- JWT autentifikacija
- node-cron za automatske taskove
- bcryptjs za hash lozinki

### Frontend
- Vanilla JavaScript (bez framework-a)
- Responsive CSS
- PWA manifest

## 🏃‍♂️ Pokretanje lokalno

1. Klonirajte repository:
```bash
git clone <repository-url>
cd helios
```

2. Instalirajte dependencies:
```bash
cd server
npm install
```

3. Kreirajte `.env` fajl u `server/` folderu:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
```

4. Pokrenite server:
```bash
npm start
```

5. Otvorite browser na `http://localhost:3000`

## 👤 Default korisnici

- **Dragana**: username: `dragana`, password: `dragana123`
- **Snežana**: username: `snezana`, password: `snezana123`

## 📱 SMS Notifikacije

Sistem podržava SMS notifikacije koje rade u dva režima:

- **Test režim** (default): SMS-ovi se loguju u konzolu
- **Produkcijski režim**: Koristi SMS Agent RS API

Za produkciju dodajte u `.env`:
```env
NODE_ENV=production
SMS_API_KEY=your-sms-api-key
SMS_API_URL=https://api.smsagent.rs/v1/sms/bulk
```

## 🚀 Deployment na Render

Vidite [DEPLOY.md](./DEPLOY.md) za detaljne instrukcije.

## 📂 Struktura projekta

```
helios/
├── client/              # Frontend
│   ├── index.html       # Glavna HTML stranica
│   ├── css/            # Stilovi
│   ├── js/             # JavaScript fajlovi
│   └── assets/         # Slike i ikone
├── server/             # Backend
│   ├── src/
│   │   ├── app.js      # Express server
│   │   ├── db/         # Database konfiguracija
│   │   ├── routes/     # API rute
│   │   ├── services/   # Biznis logika
│   │   └── middleware/ # Auth middleware
│   └── package.json
├── render.yaml         # Render deployment config
└── README.md
```

## 📋 API Endpoints

### Auth
- `POST /api/auth/login` - Prijava
- `GET /api/auth/verify` - Verifikacija tokena

### Appointments
- `GET /api/appointments` - Lista termina
- `GET /api/appointments/:id` - Jedan termin
- `POST /api/appointments` - Novi termin
- `PUT /api/appointments/:id` - Ažuriranje
- `DELETE /api/appointments/:id` - Brisanje

### Clients
- `GET /api/clients` - Lista klijenata
- `GET /api/clients/:id` - Jedan klijent
- `POST /api/clients` - Novi klijent
- `PUT /api/clients/:id` - Ažuriranje
- `DELETE /api/clients/:id` - Brisanje
- `GET /api/clients/stats/overview` - Statistike

### Services
- `GET /api/services` - Lista usluga
- `GET /api/services/:id` - Jedna usluga
- `POST /api/services` - Nova usluga
- `PUT /api/services/:id` - Ažuriranje
- `DELETE /api/services/:id` - Brisanje

## 🔧 Environment varijable

| Varijabla | Opis | Default |
|-----------|------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| DATABASE_URL | PostgreSQL URL | - |
| JWT_SECRET | Secret za JWT | - |
| SMS_API_KEY | SMS API ključ | - |
| SMS_API_URL | SMS API URL | - |

## 📝 License

MIT 