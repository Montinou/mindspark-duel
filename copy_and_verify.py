import shutil
import os

src_dir = '/Users/agustinmontoya/.gemini/antigravity/brain/78cdc80a-5658-49ad-b030-70cc2cb4da13/'
dst_dir = '/Users/agustinmontoya/Projectos/MVPs/juego-cartas-educativo/mindspark-duel/public/assets/decks/'

files = [
    ('technomancer_epic_box_1764234646053.png', 'technomancer-box.png'),
    ('nature_epic_box_1764234660611.png', 'grove-guardians-box.png'),
    ('arcane_epic_box_1764234805234.png', 'arcane-scholars-box.png')
]

log = []
try:
    if not os.path.exists(dst_dir):
        os.makedirs(dst_dir)
        log.append(f"Created directory {dst_dir}")

    for src_name, dst_name in files:
        src = os.path.join(src_dir, src_name)
        dst = os.path.join(dst_dir, dst_name)
        if os.path.exists(src):
            shutil.copy(src, dst)
            log.append(f"Copied {src} to {dst}")
        else:
            log.append(f"Source file not found: {src}")
    
    log.append("Destination contents:")
    log.append(str(os.listdir(dst_dir)))
except Exception as e:
    log.append(f"Error: {e}")

with open('copy_log.txt', 'w') as f:
    f.write('\n'.join(log))
