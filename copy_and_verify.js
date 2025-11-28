const fs = require('fs');
const path = require('path');

const srcDir = '/Users/agustinmontoya/.gemini/antigravity/brain/78cdc80a-5658-49ad-b030-70cc2cb4da13/';
const dstDir = '/Users/agustinmontoya/Projectos/MVPs/juego-cartas-educativo/mindspark-duel/public/assets/decks/';

const files = [
    { src: 'technomancer_epic_box_1764234646053.png', dst: 'technomancer-box.png' },
    { src: 'nature_epic_box_1764234660611.png', dst: 'grove-guardians-box.png' },
    { src: 'arcane_epic_box_1764234805234.png', dst: 'arcane-scholars-box.png' }
];

let log = [];

try {
    if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
        log.push(`Created directory ${dstDir}`);
    }

    files.forEach(file => {
        const srcPath = path.join(srcDir, file.src);
        const dstPath = path.join(dstDir, file.dst);
        
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, dstPath);
            log.push(`Copied ${srcPath} to ${dstPath}`);
        } else {
            log.push(`Source file not found: ${srcPath}`);
        }
    });

    log.push("Destination contents:");
    log.push(JSON.stringify(fs.readdirSync(dstDir)));

} catch (error) {
    log.push(`Error: ${error.message}`);
}

fs.writeFileSync('copy_log_node.txt', log.join('\n'));
