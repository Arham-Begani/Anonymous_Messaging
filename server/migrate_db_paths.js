const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'chat_users.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT id, content FROM messages WHERE content LIKE '/uploads/%'", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        rows.forEach(row => {
            // Check if content already has an extension
            if (!path.extname(row.content)) {
                const newContent = row.content + '.png';
                db.run("UPDATE messages SET content = ? WHERE id = ?", [newContent, row.id], (err) => {
                    if (err) console.error(err);
                    else console.log(`Updated msg ${row.id}: ${row.content} -> ${newContent}`);
                });
            }
        });
    });
});
