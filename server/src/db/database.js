// Check if we should use PostgreSQL or SQLite
if (process.env.DATABASE_URL) {
    // Use PostgreSQL in production
    console.log('🐘 Using PostgreSQL database');
    module.exports = require('./database-pg');
} else {
    // Use SQLite for local development
    console.log('📦 Using SQLite database');
    
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const bcrypt = require('bcryptjs');

    // Kreiraj konekciju sa bazom
    const db = new sqlite3.Database(path.join(__dirname, '../../database.sqlite'), (err) => {
        if (err) {
            console.error('Greška pri povezivanju sa bazom:', err);
        } else {
            console.log('Uspešno povezano sa SQLite bazom podataka');
        }
    });

    // Inicijalizuj tabele
    const initDatabase = () => {
        // Korisnici (zaposleni)
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ime TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        `);

        // Klijenti
        db.run(`
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ime TEXT NOT NULL,
                telefon TEXT NOT NULL,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Usluge
        db.run(`
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                naziv TEXT NOT NULL,
                trajanje INTEGER NOT NULL,
                cena INTEGER NOT NULL,
                is_group BOOLEAN DEFAULT 0,
                max_participants INTEGER DEFAULT 1
            )
        `);

        // Termini
        db.run(`
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                naziv_termina TEXT NOT NULL,
                service_id INTEGER,
                user_id INTEGER,
                datum_vreme DATETIME NOT NULL,
                status TEXT DEFAULT 'scheduled',
                placeno BOOLEAN DEFAULT 0,
                max_ucesnika INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_id) REFERENCES services(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Veza između termina i klijenata
        db.run(`
            CREATE TABLE IF NOT EXISTS appointment_clients (
                appointment_id INTEGER,
                client_id INTEGER,
                PRIMARY KEY (appointment_id, client_id),
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        `);

        // SMS log
        db.run(`
            CREATE TABLE IF NOT EXISTS sms_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER,
                tip_poruke TEXT,
                poslato DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'sent',
                FOREIGN KEY (appointment_id) REFERENCES appointments(id)
            )
        `, (err) => {
            if (err) {
                console.error('Greška pri kreiranju tabela:', err);
            } else {
                // Dodaj početne podatke nakon što su sve tabele kreirane
                setTimeout(seedDatabase, 1000);
            }
        });
    };

// Dodaj početne podatke
const seedDatabase = async () => {
    // Proveri da li već postoje korisnici
    db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
        if (err) {
            console.error('Greška pri proveri korisnika:', err);
            return;
        }
        
        if (!row || row.count === 0) {
            // Hashuj lozinke
            const hashedPassword1 = await bcrypt.hash('dragana123', 10);
            const hashedPassword2 = await bcrypt.hash('snezana123', 10);

            // Dodaj zaposlene
            db.run("INSERT INTO users (ime, username, password) VALUES (?, ?, ?)", 
                ['Dragana Obradović', 'dragana', hashedPassword1], (err) => {
                    if (err) console.error('Greška pri dodavanju korisnika Dragana:', err);
                });
            db.run("INSERT INTO users (ime, username, password) VALUES (?, ?, ?)", 
                ['Snežana Stamenković', 'snezana', hashedPassword2], (err) => {
                    if (err) console.error('Greška pri dodavanju korisnika Snežana:', err);
                });
            
            console.log('Dodati početni korisnici');
        }
    });

    // Proveri da li već postoje usluge
    db.get("SELECT COUNT(*) as count FROM services", (err, row) => {
        if (err) {
            console.error('Greška pri proveri usluga:', err);
            return;
        }
        
        if (!row || row.count === 0) {
            // Dodaj usluge
            const services = [
                ['Manikir', 30, 1500, 0, 1],
                ['Pedikir', 45, 2000, 0, 1],
                ['Masaža relaks', 60, 3000, 0, 1],
                ['Masaža medicinska', 45, 2500, 0, 1],
                ['Tretman lica', 60, 3500, 0, 1],
                ['Depilacija', 30, 1800, 0, 1],
                ['Grupni trening', 45, 800, 1, 8],
                ['Yoga', 60, 1000, 1, 10],
                ['Pilates', 45, 900, 1, 6]
            ];

            const stmt = db.prepare("INSERT INTO services (naziv, trajanje, cena, is_group, max_participants) VALUES (?, ?, ?, ?, ?)");
            services.forEach(service => {
                stmt.run(service, (err) => {
                    if (err) console.error('Greška pri dodavanju usluge:', err);
                });
            });
            stmt.finalize();
            
            console.log('Dodate početne usluge');
        }
    });
};

// Pomoćne funkcije za rad sa bazom
const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const getOne = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const getAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

    module.exports = {
        db,
        initDatabase,
        runQuery,
        getOne,
        getAll
    };
} 