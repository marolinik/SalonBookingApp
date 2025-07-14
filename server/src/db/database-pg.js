const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database schema
async function initDatabase() {
    try {
        console.log('📊 Inicijalizujem PostgreSQL bazu...');
        
        // Kreiraj tabele
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                ime VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'employee',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                ime VARCHAR(255) NOT NULL,
                telefon VARCHAR(20) NOT NULL,
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(telefon)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                naziv VARCHAR(255) NOT NULL,
                trajanje INT NOT NULL,
                cena DECIMAL(10,2) NOT NULL,
                is_group BOOLEAN DEFAULT FALSE,
                max_participants INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                naziv_termina VARCHAR(255),
                service_id INT REFERENCES services(id),
                user_id INT REFERENCES users(id),
                datum_vreme TIMESTAMP NOT NULL,
                status VARCHAR(50) DEFAULT 'scheduled',
                napomena TEXT,
                placeno BOOLEAN DEFAULT FALSE,
                max_ucesnika INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointment_clients (
                appointment_id INT REFERENCES appointments(id) ON DELETE CASCADE,
                client_id INT REFERENCES clients(id),
                PRIMARY KEY (appointment_id, client_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sms_log (
                id SERIAL PRIMARY KEY,
                appointment_id INT REFERENCES appointments(id),
                tip_poruke VARCHAR(50),
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Proveri da li postoje korisnici, ako ne, dodaj default
        const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(usersResult.rows[0].count);
        
        if (userCount === 0) {
            console.log('📝 Kreiram default korisnike...');
            const bcrypt = require('bcryptjs');
            
            await pool.query(
                'INSERT INTO users (username, password, ime) VALUES ($1, $2, $3)',
                ['dragana', bcrypt.hashSync('dragana123', 10), 'Dragana Obradović']
            );
            console.log('✅ Kreiran korisnik: dragana');
            
            await pool.query(
                'INSERT INTO users (username, password, ime) VALUES ($1, $2, $3)',
                ['snezana', bcrypt.hashSync('snezana123', 10), 'Snežana Stamenković']
            );
            console.log('✅ Kreiran korisnik: snezana');
            
            // Verifikuj da su korisnici kreirani
            const checkUsers = await pool.query('SELECT username, ime FROM users');
            console.log('📋 Kreirani korisnici:', checkUsers.rows);
        }

        // Dodaj default usluge ako ne postoje
        const servicesResult = await pool.query('SELECT COUNT(*) as count FROM services');
        const serviceCount = parseInt(servicesResult.rows[0].count);
        
        if (serviceCount === 0) {
            console.log('💅 Kreiram default usluge...');
            
            const defaultServices = [
                ['Manikir', 30, 1500, false, 1],
                ['Pedikir', 45, 2000, false, 1],
                ['Manikir + Pedikir', 75, 3000, false, 1],
                ['Gel lak', 60, 2500, false, 1],
                ['Depilacija - noge', 30, 1800, false, 1],
                ['Depilacija - ruke', 20, 1000, false, 1],
                ['Masaža relaks', 60, 3500, false, 1],
                ['Masaža medicinska', 45, 3000, false, 1],
                ['Tretman lica', 60, 4000, false, 1],
                ['Pilates - grupni', 60, 1200, true, 8],
                ['Yoga - grupni', 60, 1200, true, 10]
            ];
            
            for (const service of defaultServices) {
                await pool.query(
                    'INSERT INTO services (naziv, trajanje, cena, is_group, max_participants) VALUES ($1, $2, $3, $4, $5)',
                    service
                );
            }
        }
        
        console.log('✅ Baza podataka je spremna!');
    } catch (error) {
        console.error('❌ Greška pri inicijalizaciji baze:', error);
        throw error;
    }
}

// Database helper functions
// Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertQuery(query, params) {
    let pgQuery = query;
    let paramIndex = 1;
    
    // Replace ? with $1, $2, etc.
    while (pgQuery.includes('?')) {
        pgQuery = pgQuery.replace('?', '$' + paramIndex);
        paramIndex++;
    }
    
    return pgQuery;
}

async function getAll(query, params = []) {
    try {
        const pgQuery = convertQuery(query, params);
        const result = await pool.query(pgQuery, params);
        return result.rows;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

async function getOne(query, params = []) {
    try {
        const pgQuery = convertQuery(query, params);
        const result = await pool.query(pgQuery, params);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

async function runQuery(query, params = []) {
    try {
        let pgQuery = convertQuery(query, params);
        
        // Add RETURNING id if it's an INSERT without RETURNING
        // BUT skip for appointment_clients table which doesn't have id column
        const skipReturning = pgQuery.toLowerCase().includes('appointment_clients');
        
        if (pgQuery.toLowerCase().includes('insert') && 
            !pgQuery.toLowerCase().includes('returning') &&
            !skipReturning) {
            pgQuery += ' RETURNING id';
        }
        
        const result = await pool.query(pgQuery, params);
        
        // Za INSERT queries sa RETURNING
        if (pgQuery.toLowerCase().includes('insert') && 
            !skipReturning && 
            result.rows.length > 0) {
            return { id: result.rows[0].id, ...result.rows[0] };
        }
        
        return { 
            rowCount: result.rowCount,
            rows: result.rows,
            changes: result.rowCount
        };
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

module.exports = {
    initDatabase,
    getAll,
    getOne,
    runQuery
}; 