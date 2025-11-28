#!/bin/bash
echo "Starting copy..." > copy_debug.log
cp -v /Users/agustinmontoya/.gemini/antigravity/brain/78cdc80a-5658-49ad-b030-70cc2cb4da13/technomancer_epic_box_1764234646053.png /Users/agustinmontoya/Projectos/MVPs/juego-cartas-educativo/mindspark-duel/public/assets/decks/technomancer-box.png >> copy_debug.log 2>&1
cp -v /Users/agustinmontoya/.gemini/antigravity/brain/78cdc80a-5658-49ad-b030-70cc2cb4da13/nature_epic_box_1764234660611.png /Users/agustinmontoya/Projectos/MVPs/juego-cartas-educativo/mindspark-duel/public/assets/decks/grove-guardians-box.png >> copy_debug.log 2>&1
cp -v /Users/agustinmontoya/.gemini/antigravity/brain/78cdc80a-5658-49ad-b030-70cc2cb4da13/arcane_epic_box_1764234805234.png /Users/agustinmontoya/Projectos/MVPs/juego-cartas-educativo/mindspark-duel/public/assets/decks/arcane-scholars-box.png >> copy_debug.log 2>&1
echo "Done." >> copy_debug.log
