# Three

An open-world fantasy MMO in the style of World of Warcraft, built with
Three.js on the client and
[BoxLang Express](https://github.com/robertz/boxlang-express) on the backend.
(Originally prototyped with Ragnarok Online naming/theming — see Milestone 18
for the pivot.)

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

Bugfix (2026-09-13): the Soldier model's own front faced -Z, opposite the
game's forward convention (+Z — see `player.js`'s movement vector), so the
third-person camera (trailing behind at -Z) was looking straight at the
character's face while it walked toward the camera instead of away from
it. Fixed in `character.js` by rotating just the cloned model 180° around
Y (`scene.rotation.y = Math.PI`), leaving the outer group's own rotation —
the one movement, collision, the camera, and network sync all actually
read — untouched. Applies to remote players too, since they share the
same `createCharacterMesh()`. Verified visually: walking now shows the
character's back (backpack visible) receding from camera, and turning
keeps the back facing the camera correctly from any heading.

Milestone 16 (done): mouse-look camera — hold right mouse button and drag
to look around. Horizontal drag turns the character itself
(`player.rotation.y`, same value A/D turning already writes to) rather
than orbiting the camera independently, so the camera just stays behind
wherever the character ends up facing — matching typical MMO right-click
"look/steer" convention. Vertical drag adjusts a camera-only `pitchOffset`
(clamped in `camera.js` so you can't flip over or clip through the
ground); dragging up gives an aerial look-down angle, down a low look-up
angle. `combat.js`'s click-to-target is left-click only (`e.button === 0`)
so a right-drag doesn't also fire a targeting raycast, and `contextmenu`
is suppressed on the canvas so right-click doesn't pop the browser's own
menu. Verified: right-drag changes `player.rotation.y` directly (camera
stays glued behind), pitch clamps correctly at both extremes, left-click
targeting still works, and right-click alone doesn't set a target.

Milestone 17 (done): facing-gated combat — a monster can only be attacked
(basic attack or the `1` skill) while it's in the player's front
hemisphere, not directly behind them. Enforced server-side in
`handleAttack()` (`server/app.bxs`): the player's forward vector
(`sin(rotationY)`, `cos(rotationY)`, the same derivation `player.js`'s
own movement code uses) dotted against the direction to the target — a
negative dot product means behind, and the attack is rejected regardless
of range. This is the actual authority; a matching check
(`isInFront()` in `client/src/combat.js`) also gates the client's
auto-attack/skill calls so a target that's already behind doesn't even
attempt the network round-trip. Verified by calling
`network.sendAttack()` directly (bypassing the client-side check
entirely) against a monster positioned behind the player — HP stayed
unchanged, confirming the server itself enforces this, not just client
UX — and against one in front, where the attack landed normally.

Milestone 18 (done): camera ground clamp — `updateCamera()`
(`client/src/camera.js`) now floors the desired and lerped camera height at
`MIN_HEIGHT = 1`, so dragging the pitch to its steepest look-down angle can
no longer push the camera into/under the ground plane. Verified by forcing
`cameraController.pitchOffset` to both clamp extremes: the low extreme now
settles at `y = 1` instead of going negative, the high extreme still rises
normally, and neutral pitch is unaffected.

Milestone 19 (done): WASD strafing — `A`/`D` now strafe left/right relative
to facing instead of turning the character (turning is handled entirely by
right-click-drag, Milestone 16), and `W`/`S` remain forward/back. Verified
with synthetic key events: `A`/`D` move the player sideways by equal,
opposite amounts with `rotation.y` untouched, `W` still moves straight
forward, and (after a follow-up correction) `A` strafes right/`D` strafes
left per feedback swapping the initial mapping.

Milestone 20 (done): position interpolation — monsters and remote players
used to snap straight to each server position update, which was visibly
choppy since `TICK_SECONDS` (0.2s server tick) is far slower than the
render loop. `client/src/interpolate.js` adds a frame-rate-independent
exponential smoothing helper; `monsters.js`'s `updateMonsterPositions()`
and `network.js`'s remote-player loop now chase a `target` position/heading
every frame instead of snapping to it. Gameplay logic (combat range/facing
checks) still reads the raw authoritative server position, only the visual
mesh is smoothed. Verified by sampling a wandering monster's mesh position
every 50ms: on each new snapshot the mesh visibly closes the gap over
several frames rather than teleporting.

Milestone 21 (done): fantasy theme naming pass — first step of pivoting the
game from its original Ragnarok-Online-inspired theme to a World-of-Warcraft-
style fantasy setting. Renamed the `zeny` currency to `gold` end-to-end
(server `MONSTER_TYPES`/`ITEM_TYPES`/player struct, `CharacterService.bx`
queries, the live MySQL `characters.zeny` column via `ALTER TABLE ... CHANGE
COLUMN`, and every client reference down to the HUD's `g` suffix), renamed
the "Poring" monster type to "Boar" (server `MONSTER_TYPES` key/name, client
`monsters.js` model/scale/name maps), and renamed the `1`-key skill's HUD
label from "Bash" to "Heroic Strike". Visual/UI restyling and swapping the
placeholder monster/character models for more WoW-appropriate art are
tracked as follow-up passes, not done here. Verified end-to-end after a
server restart (BoxLang scripts aren't hot-reloaded) and a client rebuild:
fresh login shows `0g` and "Heroic Strike [1]" in the HUD, and a spawned
monster's `type`/`name` read back as `"boar"`/`"Boar"`.

Milestone 22 (done): fantasy theme pass 2/3 — HUD visual restyle. Reworked
`client/src/hud.js` from plain flat panels into a WoW-Classic-inspired look:
gold-bordered panels with small corner "rivets" (drawn via layered CSS
`radial-gradient`s, no image assets), the 'Cinzel' Google Font for all HUD
text (`client/index.html`), a circular portrait with a level badge, a
numeric HP bar overlay, a gold-coin currency display, and an icon-style
skill slot (bordered square + key label) instead of a plain labeled bar.
Target frame restyled to match. Death screen changed from a plain "YOU
DIED" to an ornate red-tinted "You Have Died" / "Resurrecting..." banner.
Pure CSS/markup change — no HUD API changes, so `main.js` didn't need
touching. Verified in-browser: portrait/level badge/HP-XP bars/gold
display/skill slot all render correctly with a live character, and the
target frame and death screen (exercised by temporarily monkey-patching
`hud.updateTarget`/`hud.setDead` past the tick loop's own calls, since
nothing in-session was actually targetable/dead at test time) both match
the same theme.

Milestone 23 (done): fantasy theme pass 3/3 — model swap. Replaced the
placeholder character/monster models with CC0 assets more in line with the
WoW-style theme: the player is now KayKit's "Knight" (`client/public/models/
knight.glb`, from Kay Lousberg's free "KayKit - Character Pack: Adventurers"
on itch.io), and the "Boar"/"Wolf" monsters use Quaternius's CC0 Pig and
Wolf models (`pig.glb`/`wolf.glb`, via poly.pizza mirrors of quaternius.com)
instead of the old three.js sample Duck/Fox. KayKit ships characters with no
baked-in animations — clips live in separate rig-matched animation-library
files (`rig_medium_movement.glb`'s `Walking_A`, `rig_medium_general.glb`'s
`Idle_A`) applied to the Knight via `clipAction()` after confirming (by
diffing the two files' skin joint names) that both share the exact same
23-bone rig; `models.js` gained a `findAnimation(key, name)` helper for
pulling a clip out of a template that's never itself cloned/rendered. The
Knight's own front faces +Z (opposite the old Soldier model), so the
180°-flip workaround in `character.js` was removed rather than doubled up.
The Pig has no walk cycle (only `Armature|Idle`/`Armature|Jump`) — rather
than require both an idle and a walk clip like before, `createMonsterMesh()`
(`monsters.js`) and `setAnimation()` (`models.js`) were loosened to tolerate
a monster type with idle-only animation (plays idle forever, never told to
switch to a walk it doesn't have) instead of skipping animation setup
entirely. All three new monster-adjacent models needed their scale tuned by
eye same as before (Pig 0.15, Wolf 0.35) — the Wolf in particular has a
deceptively huge native bounding box (≈1×2.7×5.3 units unscaled).
**Testing gotcha**: positioning a debug camera/player directly in front of a
small test object at the exact same on-screen position as the player's own
body silhouette makes the object appear completely invisible — it's simply
occluded behind the closer, larger player mesh from the camera's viewpoint,
not a rendering bug. Caught by projecting the object's bounding-box corners
to NDC space (all within the visible [-1,1] range, centered on screen) and
only then realizing they overlapped the player's own on-screen footprint;
confirmed by moving the test object sideways, after which it rendered
exactly as expected. Downloaded via itch.io's and poly.pizza's actual
network-level download flow (their pages don't expose plain static URLs) —
itch.io signs a short-lived direct-storage URL per file after clicking
through "No thanks, just take me to the downloads", visible in the
browser's network requests once triggered.

Milestone 24 (done): multiple characters per account. `characters` moved
from `account_id` as its own primary key to a surrogate `id` (up to 3 rows
per account, each with a chosen `name`, unique per account). A new
character-select screen (`client/src/characterSelect.js`, WoW-themed via
`hud.js`'s newly-exported `injectStyles()`) appears after login, listing
existing characters with Select/Delete and a Create form (hidden at the
3-character cap). Session-to-character binding is a new nullable
`sessions.character_id` column, set by `POST /api/characters/:id/select`
(`AuthService.setSessionCharacter()`) and read by `app.ws("/game")`
(`AuthService.sessionInfo()`) — a session identifies an account only until
a character is explicitly selected, at which point the socket connects as
that specific character. `inventory_items` was rekeyed from `account_id` to
`character_id`, making inventory (and gold, already a `characters` column)
genuinely per-character rather than shared account-wide. Verified: created
3 characters, confirmed the cap rejects a 4th both client- and server-side;
fought a monster on one character and confirmed a second character's
gold/inventory were untouched; deleted a character and confirmed its
`inventory_items` rows cascade-deleted; confirmed selecting another
account's character id returns 403.

Milestone 25 (done): equipment slots — `weapon`, `helmet`, `chest`,
`trinket`, each additively boosting `attackDamage` and/or `maxHp` (the only
two combat stats that exist). New `equipment` table + `EquipmentService.bx`
(pure storage; equipping moves an item out of `inventory_items` into
`equipment` rather than introducing per-item unique instances). Player
stats split into persisted **base** values (`baseAttackDamage`/`baseMaxHp`,
leveled up via `grantXp()`) and **effective** values (`attackDamage`/
`maxHp` = base + equipped bonuses, recomputed by `recomputeEffectiveStats()`
on connect/equip/unequip/level-up) — `persist()` saves only the base
values, so gear bonuses never permanently bake into progression. New
`client/src/equipment.js` panel (`E` key) shows equipped items with an
Unequip action; equipping itself is a new "Equip" action alongside
`inventory.js`'s existing "Use". **Bug caught during testing**: the WS
connect handler computed effective stats but never sent them to the
client — the client's initial stats come from the REST character-select
response (always base values), so previously-equipped gear silently didn't
show its bonus until the next unrelated stat-changing action. Fixed by
calling `sendStats()` right after `recomputeEffectiveStats()` in the
connect handler. Verified end-to-end: equip/unequip via the real UI with
correct stat changes, gear persisting correctly across a reconnect, and a
direct `network.ws.send({type:"equipItem",...})` call for an item not
actually owned confirmed rejected server-side.

Milestone 26 (done): a shop NPC. A static, non-combat vendor ("Gilda the
Vendor", modeled with KayKit's Mage — `client/public/models/
shopkeeper.glb`, copied from the same pack as the player's Knight) stands
at a fixed world position, rendered via a new `client/src/npc.js` kept
deliberately separate from `monsters.js`'s registry so `combat.js`'s
raycast targeting and auto-attack/facing gate never see it. A "Press B to
shop" hint appears within range (client-side distance check for UX); the
shop panel (`client/src/shop.js`) lists a fixed catalog with prices, and
buying is gated server-side in `handleBuyItem()` by catalog membership,
gold, *and* distance to the NPC — mirroring `handleAttack()`'s
range-check-is-the-real-authority pattern exactly. Verified the hint
toggles at the right distance, a purchase within range/with enough gold
deducts gold and adds the item to inventory, and two direct
`network.ws.send({type:"buyItem",...})` bypass calls (far from the NPC;
gold below price) both correctly landed no change.

Not yet wired up: matching the new fantasy theme in the chat/inventory
panels and login/character-select-adjacent screens (login itself still uses
the original plain styling), and re-selecting a character without
re-entering the character-select screen on every page reload (the server
remembers the last-selected character via `sessions.character_id`, but the
client always re-shows character-select after `checkSession()` rather than
skipping straight back in).

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
