const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chat_v3.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to DB');
});

const adminHash = '240be518fabd2724ddb6f04eeb1da5967448d7e8331c08c8fa822809f74c720a9';

db.all("SELECT * FROM access_tokens", [], (err, rows) => {
    if (err) throw err;
    console.log("--- ALL TOKENS ---");
    rows.forEach(r => {
        console.log(`ID: ${r.id}, Role: ${r.role}`);
        console.log(`Hash in DB:  '${r.token_hash}'`);
        console.log(`Target Hash: '${adminHash}'`);
        console.log(`Match?       ${r.token_hash === adminHash}`);
        console.log(`Length: DB=${r.token_hash.length}, Target=${adminHash.length}`);
    });
});

db.get("SELECT * FROM access_tokens WHERE token_hash = ?", [adminHash], (err, row) => {
    console.log("--- DIRECT QUERY TEST ---");
    console.log("Found:", row);
});
