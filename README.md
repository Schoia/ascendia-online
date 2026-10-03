# Ascendia Online

A 3D action RPG that runs in the browser, set in a floating castle of 100 floors. Create a character, fight monsters with sword skills, take quests, enhance your gear with the blacksmith, defeat each floor's guardian, and climb. Everyone connected to the same server shares the world.

## Features

- **Character creation** with a live 3D preview: coat color, four hair styles, hair color and skin tone. Armor upgrades show on your avatar.
- **Combat**: a three-hit combo, five sword skills with glowing trails, dodge rolls, target lock-on, hit-pause and camera shake. Monsters flash and show a red warning area on the ground before they strike.
- **World**: a castle floor with a walled city, two villages, forests, a lake and the Labyrinth tower. A shared day/night cycle brings stars, glowing windows and fireflies. Grass and trees sway in the wind, and each of the six floor themes has its own particles.
- **Monsters**: eight detailed monster types, rare golden elites, and floor bosses with their own armor, crystals and weapons. Bosses have multiple HP bars and slam, cleave and charge attacks.
- **Towns**: safe zones that heal you, a merchant (potions, swords, coats), a blacksmith (enhance gear up to +10), Quest Boards, and a Teleport Gate between floors.
- **Status windows**: status and attributes, items, equipment, sword skills, quest log, map, online players and settings (graphics quality, field of view, music, sound, mouse sensitivity).
- **Hardcore mode** (optional): one life. When your HP reaches zero, the character is deleted.
- **Multiplayer**: see other players move, attack and wear their gear, chat, fight floor bosses with shared HP, and get bonus XP when you fight near each other. The server announces floor clears to everyone.
- **Generated music** that changes between town, field, night, the Labyrinth and boss fights.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move (Shift to sprint) |
| Mouse | Look (click the world to capture the mouse) |
| Left click / J | Attack combo |
| 1–5 | Sword skills |
| Tab / middle click | Lock onto a target |
| Space / Q (or right click) | Jump / Dodge |
| R | Drink potion |
| E | Interact (merchant, blacksmith, quest board, teleport gate, labyrinth door) |
| M | Menu · I items · L quest log · C status |
| Enter | Chat |
| H | Show or hide the controls list |

Phones get a touch joystick and buttons.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000. Open it in a second tab to see multiplayer.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New → Blueprint** and pick the repository. Render reads `render.yaml` and creates the web service.
   - Or choose **New → Web Service** and set: Build command `npm install`, Start command `npm start`.
3. Every push to `main` redeploys automatically.

On Render's free plan the service goes to sleep after a period with no visitors, so the first visit afterwards takes a little under a minute to load.

## Project layout

- `server.js`: serves `public/` and relays player positions, chat, shared boss damage, shared XP and announcements over WebSockets (`/ws`)
- `public/index.html`: page markup; loads Three.js r128 and its bloom post-processing from CDNs
- `public/css/style.css`: interface styles
- `public/js/core.js`: helpers, data tables (themes, gear, skills), settings and save data
- `public/js/textures.js`: procedural textures (cobblestone, brick, plaster, roof tiles, wood, water)
- `public/js/audio.js`: sound effects and the generated soundtrack
- `public/js/models.js`: the player avatar, monsters, elites and boss armor
- `public/js/world.js`: renderer, bloom, sky and day/night, terrain, vegetation, towns, the tower and the boss hall
- `public/js/game.js`: combat, monsters, bosses, quests, blacksmith, HUD, menus, multiplayer, input and the main loop
- `public/js/net.js`: the multiplayer client
- `render.yaml`: Render blueprint

Progress and settings save in each player's browser (localStorage). Field monsters are separate for each player; floor bosses are fought together, with HP shared between everyone in the boss room.
