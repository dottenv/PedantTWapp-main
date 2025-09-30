import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const TEMPLATE_FILE = path.join(DATA_DIR, 'db.template.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

export function initializeData() {
    console.log('[INIT] Data initialization started');
    
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('[INIT] Created data directory');
    }
    
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        console.log('[INIT] Created uploads directory');
    }
    
    if (!fs.existsSync(DB_FILE)) {
        if (fs.existsSync(TEMPLATE_FILE)) {
            fs.copyFileSync(TEMPLATE_FILE, DB_FILE);
            console.log('[INIT] Database created from template');
        } else {
            const defaultData = {
                users: [],
                sessions: [],
                orders: [],
                services: [],
                serviceEmployees: [],
                hiringQueue: []
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
            console.log('[INIT] Database created with default structure');
        }
    } else {
        console.log('[INIT] Database already exists');
    }
    
    console.log('[INIT] Data initialization completed');
}

// Запуск при прямом вызове
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeData();
}