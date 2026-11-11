# Native Desktop smoke tests

1. Enable the plugin, restart the gateway, reload desktop plugins.
2. Confirm English on a clean device. Switch to Japanese, reload, confirm persistence.
3. Confirm existing games remain in history.
4. Create a mate-in-4 puzzle. No chat message should appear.
5. Play a correct first move: both it and the defending reply should appear without an LLM response. Undo returns to the previous user decision.
6. Try a legal incorrect move: position stays unchanged and feedback appears.
7. Use Hint, Try again, Next puzzle and Show PGN. None should submit to chat.
8. Create a knight-odds game as White. Your first legal move appears immediately, followed by one request for Hermes’s reply. Verify the reply is visible from the shared store and that opponent pieces cannot be moved by the UI.
9. Try Black: the board flips, and Hermes receives one request to open the game.
10. Check narrow panel, keyboard square navigation, board flip, promotion choice, ended-game state and disconnected-backend feedback.

Automated checks: `python -m unittest discover -s tests -v`, `node --check desktop/plugin.js`, `npm test`.
