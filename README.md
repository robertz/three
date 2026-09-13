# Three

An open-world game in the style of Ragnarok Online, built with Three.js on
the client and [BoxLang Express](https://github.com/robertz/boxlang-express)
on the backend.

## Stack

- **Client**: Three.js + Vite, `client/`.
- **Server**: BoxLang Express, `server/app.bxs`. Real-time multiplayer sync
  runs over `app.ws()` (native to BoxLang Express — no SocketBox/CommandBox
  needed since Express runs its own server).
- **Persistence**: MySQL (`three` database, `server/db/schema.sql`). Switched
  from the original MSSQL plan since a local MySQL instance was already
  available on this machine and MSSQL wasn't — same JDBC-based config either
  way if that needs to change later.

## Status

Milestone 1 (done): walkable 3D world — third-person character, WASD
movement, camera follow, static obstacles with collision.

Milestone 2 (done): local single-player combat loop — click a monster
("Poring") to target it, auto-attack in melee range, HP/target HUD, XP and
leveling, death + respawn. All client-side, no server involvement yet.

Milestone 3 (done): more combat depth — a second, aggressive monster type
("Wolf") that aggros within range and fights back, player HP/death with a
respawn timer and a small XP penalty on death, a zeny currency drop per
kill, and a cooldown-based "Bash" skill (key `1`, 2x damage) with its own
HUD cooldown bar.

Milestone 4 (done): server wiring — `server/app.bxs` relays player position
over `app.ws("/game")`: on connect a player gets a snapshot of everyone
already in the zone, and join/move/leave events are broadcast to everyone
else. The client (`client/src/network.js`) connects, sends its own position
~10x/sec, and renders other connected players as blue capsules. Verified
with two live browser clients seeing each other move and disappear on
disconnect.

Milestone 5 (done): accounts + persistence — `/api/register` and
`/api/login` (PBKDF2-hashed passwords, same approach as dnd-game-v2's
AuthService) issue a session cookie backed by a `sessions` table (app.ws()
routes sit outside boxlang-express's own middleware chain, so this is a
plain cookie + DB lookup rather than the Session middleware). The client
shows a login/register overlay, skips it via `/api/me` if already
signed in, and seeds the player from the persisted `characters` row
(position, level, HP, XP, zeny) instead of hardcoded defaults. The server
saves that row on each WS disconnect and periodically (every 5s) while
connected. Verified end-to-end: register → move → reconnect → same
position/stats back.

Milestone 6 (done): shared world state — monsters moved entirely
server-side. `server/app.bxs` owns all 12 monsters (spawn, wander/aggro/chase
AI on a 200ms `app.schedule()` tick, HP, death/respawn) and broadcasts a
full snapshot to every connected client via `{type:"monsters"}`, plus
immediate `{type:"monsterUpdate"}` on any hit. The client
(`client/src/monsters.js`) is now a pure renderer — it creates/updates/
removes monster meshes from server snapshots and no longer simulates
anything. Combat is server-authoritative too: clicking a monster still
raycasts locally for targeting, but `attack`/`skill` messages are resolved
server-side (range/cooldown checked against the server's own record of the
player's position), which grants XP/zeny to the attacking player only and
persists their character immediately on a kill. Player HP loss from an
aggressive monster, death (with the XP penalty), and respawn are all
server-driven too — the client just reacts to `stats`/`died`/`respawn`
messages. Verified with two independent clients seeing the exact same
monster HP/death/respawn state (not two separate local copies), and the
full wolf-aggro → damage → death → XP-penalty → respawn cycle end-to-end.

Milestone 7 (done): logout — a "Log Out" button in the HUD calls
`/api/logout`, which destroys the session row server-side, then reloads
the page back to the login screen. Verified the session is actually
invalidated (`/api/me` returns 401 after logout, not just a client-side
redirect) and that logging back in restores the same persisted character.

Milestone 8 (done): chat — press Enter to open a chat box, type, Enter to
send (Escape cancels). Reuses the existing `/game` WebSocket rather than a
separate endpoint: the server trims/caps each message at 200 characters,
drops empty/whitespace-only ones, and broadcasts `{type:"chat"}` (with the
sender's username) to every connected player, including the sender. The
chat input calls `stopPropagation()` on its own keydown events so typing
never leaks into WASD movement or the `1` skill key — verified directly
(holding "w" for a full second while the chat box was focused produced
zero movement). Verified end-to-end across two different accounts seeing
each other's messages in real time.

Milestone 9 (done): inventory — monsters now drop items, not just zeny.
Porings drop "Apple" (30% chance, usable, heals 20 HP); Wolves drop
"Wolf Fang" (40% chance, a plain material, not usable). Items persist in a
new `inventory_items` table (`server/models/InventoryService.bx`) keyed by
account + item, sent to the client as a decorated list (name/usable/qty)
on connect and after every change. Client UI: press `I` to toggle an
inventory panel above the HUD; usable items show a "Use" label — clicking
one sends `{type:"useItem"}`, and the server (not the client) validates
ownership, applies the heal capped at max HP, decrements the stack, and
pushes back updated stats + inventory. Verified: drops land in the DB
immediately, quantity decrements exactly per use, healing is capped
correctly, and both a non-usable item and a nonexistent item key are
safely rejected server-side with no state change.

Found in passing during that milestone: two simultaneous WebSocket
connections authenticated as the same account each kept independent
in-memory player state, and whichever autosaved last won — a stale idle
second connection silently clobbered a level/zeny gain during testing.

Milestone 10 (done): single session per account — fixes the above.
`AuthService.createSession()` now deletes every existing session row for
an account before issuing a new one, so an old tab/device's cookie stops
working (`/api/me` and any new WS connect attempt with it get rejected)
the moment a new login happens. That alone doesn't touch an *already-open*
WebSocket, though, so `app.ws("/game")` also checks for an existing live
connection for the same account on every new connect and actively kicks
it — sends it `{type:"kicked"}`, persists its current state, then closes
it server-side. The client shows an alert ("Logged in from another
location") and reloads back to the login screen. Verified with a direct
two-WebSocket test (old token 401s after the new login, old connection
receives the kick message and closes) and in the actual browser (a second
real login+connection kicks the open tab, which cleanly returns to the
login screen with no leftover state).

Milestone 11 (done): real 3D character model — replaced the player's
capsule primitive with an actual rigged/animated glTF model
(`client/public/models/soldier.glb`, the "Soldier" sample bundled with
three.js's own examples, Idle/Run/TPose/Walk clips included). New
`client/src/character.js` loads it once via `GLTFLoader` at startup and
clones it per instance with `SkeletonUtils.clone()` — a plain
`Object3D.clone()` doesn't work for skinned/rigged meshes, it breaks the
skeleton bindings. Both the local player and remote players go through
the same `createPlayerMesh()` → `createCharacterMesh()` path, so
multiplayer rendering stays consistent. `player.js` crossfades between
the Idle and Walk clips based on WASD input via `AnimationMixer`; each
character's mixer is advanced every frame (local and every remote one) so
idle animation keeps looping even when standing still. Verified visually:
correct idle pose (not stuck in bind/T-pose), smooth idle↔walk
crossfade tied to real movement, and two independently-registered
accounts each rendering their own correctly-posed, independently
animating clone from the same loaded template.

Milestone 12 (done): monster models — Porings now render as the classic
glTF sample "Duck" (`client/public/models/duck.glb`, static, no rig) and
Wolves as the sample "Fox" (`client/public/models/fox.glb`, rigged, with
Survey/Walk/Run clips). Both are placeholders picked for being small,
free, and already reachable — a duck doesn't look like a slime and a fox
isn't a wolf, but same spirit as using "Soldier" for the player. Extracted
the loading/cloning logic shared with the player model into
`client/src/models.js` (`loadModels()`, `cloneModel()`,
`setAnimation()`) so all three model types load through one path;
`character.js` and `monsters.js` both consume it now. One real bug caught
here: `SkeletonUtils.clone()` only clones the bone/object hierarchy, not
materials — meshes from different clones of the same model shared the
same material instance, so the hit-flash effect on one Poring would have
flashed *every* Poring at once. Fixed by cloning each mesh's material in
`cloneModel()`; verified after the fix that N cloned instances have N
distinct material objects. The Fox's Walk/Survey clips are switched based
on real per-tick position deltas from the server snapshot (no new server
field needed) — verified wolves show "walk" while actively moving between
wander legs and "idle" during the brief pause at each wander target,
matching their actual server-side AI state. Monster scale/ground-offset
values (`MONSTER_SCALE`, `BASE_Y` in `monsters.js`) were tuned visually,
not computed — reasonable starting points, not exact.

Milestone 13 (done): ground texture — replaced the flat green plane +
`GridHelper` with a tiled grass texture (`client/public/textures/grass.jpg`,
the "grasslight-big" sample bundled with three.js's own examples, CC-BY
3.0 via opengameart.org). `THREE.RepeatWrapping` on both axes with an
8-unit tile size (`repeat = WORLD_SIZE / 8`) across the 200-unit ground
plane. Dropped the `GridHelper` — it was a placeholder for gauging scale
on a flat color and looks redundant/cluttered over a real texture.
Verified visually up close (no visible seams, texture stays sharp at
player-distance) and from farther away (tiling holds up, fog still blends
naturally at the draw distance).

Milestone 14 (done): environmental props — the 25 scattered brown-box
"obstacles" are now real environmental models instead of primitives: trees
(`tree_default`, `tree_pineRoundA`, `tree_oak`, `tree_fat`), rocks
(`rock_largeA`, `rock_largeC`), a stump, and a bush, picked randomly per
obstacle and loaded from Kenney's free "Nature Kit" (CC0,
`client/public/models/nature/`). Same `models.js` loading path as the
character models; `world.js` just picks a random prop type per obstacle
slot instead of building a box, keeping the exact same collision logic
(position + a single `obstacleRadius`, now 1.2 instead of 1.5) — verified
the player still stops at the same kind of boundary when walking into a
tree. One real bug caught here: these particular Kenney models export
with `metallicFactor: 1, roughnessFactor: 1` — almost certainly an
authoring-pipeline quirk, since they're obviously meant as flat diffuse
colors, not metal — which rendered them nearly black with no environment
map for a metallic surface to reflect. Fixed by forcing `metalness = 0` on
every cloned mesh's material in `models.js`'s `cloneModel()`; confirmed
it's a no-op for the player/monster models (soldier/fox/duck already
export metalness 0) and fixes the nature props. Verified each prop type
(tree, stump, bush) renders with correct color and scale relative to the
player — trees noticeably tower over the player as expected; rocks share
the identical fix path so weren't re-verified individually.

Milestone 15 (done): single-server serving — `server/app.bxs` now serves
the built client itself via `boxExpressStatic( expandPath( "../client/dist" ) )`,
mounted at root (so `/` → `client/dist/index.html`, matching
`express.static()`'s directory-index resolution). Visiting
`http://localhost:3001` alone now serves the full game — no separate
Vite server needed for that path. The client's `public/models/` and
`public/textures/` land at `dist/models/`, `dist/textures/` on build,
matching the absolute paths (`/models/soldier.glb`, etc.) already used in
the code, so no client-side path changes were needed. Verified end-to-end:
built the client (`npm run build`), restarted the server, and played a
full session (login → 3D world with textures/models/HUD all rendering) from
`localhost:3001` alone, no `localhost:5173` involved. The Vite dev server
(`npm run dev`) is still there and still useful for active frontend work
with hot-reload — it's additive, not replaced; just rebuild
(`npm run build`) and restart the server to pick up client changes when
using the single-server path instead.

Bugfix (2026-09-13): clicking a monster to target it, and the `1` skill
key, both silently did nothing — a regression from milestone 12's monster
model swap. `combat.js`'s click handler found the raycast hit's top-level
owner via `hitMesh.parent === entry.mesh`, which only holds for exactly
one level of nesting; the old primitive shapes (a Group with direct-child
meshes) matched that, but the real glTF models (Group → cloned scene →
however many nested transform nodes before the actual Mesh) don't, so
`state.targetId` silently never got set and the mismatch went unnoticed
because later verification of monster combat used `network.sendAttack()`
directly, bypassing the raycaster entirely. Fixed by tagging each
monster's top-level group with `mesh.userData.monsterId` in
`monsters.js` and having the click handler walk up `.parent` until it
finds that tag, regardless of nesting depth. Verified with real
`PointerEvent`s at the monster's actual projected screen position (not
the `combat.targetId =` shortcut used in earlier milestones) that
targeting now sets the correct id, and that both auto-attack and the `1`
skill key land real, server-resolved damage afterward.

Not yet wired up: multiple characters per account, equipment slots, a shop
to spend zeny.

## Running it

**Option A — single server (play at `localhost:3001` only):**

```bash
cd client && npm install && npm run build
cd ../server && ./start.sh   # see setup below if this is a fresh checkout
```

Rebuild (`npm run build`) and restart the server after any client change.

**Option B — separate dev servers (hot-reload while editing the client):**

Client:

```bash
cd client
npm install
npm run dev   # localhost:5173
```

Server, in another terminal (setup below):

```bash
cd server
./start.sh   # localhost:3001
```

**First-time server setup** (requires the BoxLang CLI and a local MySQL
server):

```bash
cd server
box install boxlang-express boxlang_modules
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS three"
mysql -uroot three < db/schema.sql
cp .env.example .env   # edit if your MySQL isn't root@127.0.0.1:3306 with no password
```

`start.sh` loads `.env` and passes `--bx-config ./boxlang.json` —
`boxlang app.bxs` on its own won't pick up the datasource config, and
`${env.DB_PASSWORD}` needs the var to actually exist (even empty) rather
than relying on the JSON-side default.
