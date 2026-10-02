# Ascendia Online

A 3D action RPG that runs in the browser, set in a floating castle of 100 floors. Fight monsters with sword skills, rest in safe-zone towns, manage your stats in the status window, defeat each floor's boss, and climb. Everyone connected to the same server shares the world.

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
3. When the deploy finishes, open the `.onrender.com` URL and share it with friends.

On Render's free plan the service goes to sleep after a period with no visitors, so the first visit afterwards takes a little under a minute to load.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move (Shift to sprint) |
| Mouse | Look (click the world to capture the mouse) |
| Left click / J | Attack combo |
| 1–5 | Sword skills |
| Space / Q | Jump / Dodge |
| R | Drink potion |
| E | Interact (merchant, teleport gate, labyrinth door) |
| M | Menu (status, items, equipment, skills, map, players) |
| Enter | Chat |

Phones get a touch joystick and buttons.

## Project layout

- `server.js`: serves `public/` and relays player positions, chat, and shared boss damage over WebSockets (`/ws`)
- `public/index.html`: the whole game (Three.js r128 from cdnjs)
- `public/net.js`: the multiplayer client
- `render.yaml`: Render blueprint

Progress saves in each player's browser (localStorage). Field monsters are separate for each player; floor bosses are fought together, with HP shared between everyone in the boss room.
