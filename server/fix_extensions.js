const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');
const files = fs.readdirSync(uploadDir);

files.forEach(file => {
    if (!file.includes('.')) {
        const oldPath = path.join(uploadDir, file);
        const newPath = path.join(uploadDir, file + '.png');
        // Simple heuristic: rename to .png if no extension. 
        // Browsers are good at sniffing actual type if extension is at least present/plausible.
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed ${file} to ${file}.png`);
    }
});
console.log('Done fixing extensions.');
