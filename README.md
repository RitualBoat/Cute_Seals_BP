# 🦭 Cute Seals — Minecraft Bedrock Add-On

**Author:** Ritual Boat  
**Dedicated to my beloved girlfriend, Valen Russel.**

> Adds adorable, tameable seals to Minecraft Bedrock Edition with unique
> interactions, custom items, and gravity-defying blocks — all powered by
> stable APIs (no experimental toggles required).

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Gameplay Guide](#gameplay-guide)
  - [Finding Seals](#finding-seals)
  - [Taming](#taming)
  - [Riding](#riding)
  - [Tickling](#tickling)
  - [Items](#items)
  - [Stabilized Blocks](#stabilized-blocks)
- [File Structure](#file-structure)
- [Development History](#development-history)
- [Modification Guide](#modification-guide)
  - [Adding a New Texture Variant](#adding-a-new-texture-variant)
  - [Changing AI / Behavior](#changing-ai--behavior)
  - [Adding or Editing Animations](#adding-or-editing-animations)
  - [Adding New Sounds](#adding-new-sounds)
  - [Using This as a Mob Template](#using-this-as-a-mob-template)
- [Future Upgrades](#future-upgrades)
- [Credits](#credits)
- [License](#license)

---

## Features

| Feature               | Details                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **5 Biome Variants**  | Gray (temperate), Arctic (frozen/ice), Brown (warm/lukewarm), Plant (rare, temperate), Strawberry (rare, frozen)                 |
| **Taming**            | Use a fish bucket (cod, salmon, or tropical fish) — 33 % chance per attempt                                                      |
| **Riding**            | Mount a tamed seal bare-back; equip a saddle for full player control (water: free-camera, ground: WASD)                          |
| **Rider Buff**        | Conduit Power while riding a seal in water                                                                                       |
| **Tickle Mechanic**   | Brush a tamed seal → drops **Seal Blubber**, plays a custom animation + sound, spawns heart particles (5 min cooldown)           |
| **Seal Blubber**      | Edible food (3 hunger, can always eat). Grants Absorption I for 30 s when eaten in water. Also works as furnace fuel (320 ticks) |
| **Rendered Blubber**  | Enchantment-glint utility item — use on Sand, Red Sand, or Gravel to create **Stabilized Blocks** that are immune to gravity     |
| **Stabilized Blocks** | Stabilized Sand, Stabilized Red Sand, Stabilized Gravel — gravity-proof with matching vanilla block sounds                       |
| **Custom Sounds**     | Ambient (3 variations), hurt, death, step, tickle (3 variations), clap                                                           |
| **Animations**        | Idle, waddle-walk, swim, clap, tickle, roll, look-at-target — all with smooth state-machine transitions                          |

---

## Requirements

| Requirement               | Minimum              |
| ------------------------- | -------------------- |
| Minecraft Bedrock Edition | **1.21.0**           |
| `@minecraft/server`       | **1.14.0** (bundled) |
| Holiday Creator Features  | **Not required**     |

> The add-on uses only stable, non-experimental format versions.

---

## Installation

1. Download the latest `.mcaddon` file from the
   [Releases](../../releases) page.
2. Double-click the file — Minecraft will import both packs automatically.
3. Create or edit a world → **Behavior Packs** → activate **Cute Seals BP**
   (the resource pack links automatically).
4. Make sure **Holiday Creator Features** is **OFF** (not needed).
5. Launch the world and enjoy!

---

## Gameplay Guide

### Finding Seals

Seals spawn naturally in ocean and beach biomes. Their texture variant is
selected based on the biome temperature:

| Biome Tag               | Variants (weighted)              |
| ----------------------- | -------------------------------- |
| Warm / Lukewarm         | Brown                            |
| Frozen / Ice            | Arctic (70 %), Strawberry (30 %) |
| Temperate Ocean / Beach | Gray (85 %), Plant (15 %)        |
| Other                   | Random (all 5 variants)          |

### Taming

Hold a **fish bucket** (Cod Bucket, Salmon Bucket, or Tropical Fish Bucket)
and interact with a wild seal. Each attempt has a **33 % success chance**.
Once tamed, the seal will follow you and can sit on command.

### Riding

- **Without a saddle:** interact with a tamed seal to mount it. The seal will
  continue its own AI — you're just along for the ride.
- **With a saddle:** open the seal's inventory (crouch + interact) and equip a
  saddle. Now you have full movement control:
  - **In water:** free-camera steering (look where you want to go)
  - **On land:** standard WASD ground controls

While riding a seal in water, you receive **Conduit Power** continuously.

### Tickling

Equip a **Brush** and interact with a tamed seal:

1. The seal plays its tickle animation with a custom sound.
2. Heart particles appear above the seal.
3. After 0.5 s a **Seal Blubber** item drops on the ground.
4. A **5-minute cooldown** prevents spamming — you'll see a chat message with
   the remaining time if you try too early.

### Items

| Item                                         | How to Obtain       | Use                                                                                                                                          |
| -------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Seal Blubber** (`my:seal_blubber`)         | Tickle a seal       | Eat for 3 hunger (works even when full). Grants **Absorption I** for 30 s if eaten in water. Also usable as furnace fuel (320 ticks / 16 s). |
| **Rendered Blubber** (`my:rendered_blubber`) | Crafting / creative | Use on Sand, Red Sand, or Gravel to stabilize the block (enchantment glint). Consumed on use (survival).                                     |

### Stabilized Blocks

| Block                                          | Source                       | Sound         |
| ---------------------------------------------- | ---------------------------- | ------------- |
| Stabilized Sand (`my:stabilized_sand`)         | Rendered Blubber on Sand     | Sand sounds   |
| Stabilized Red Sand (`my:stabilized_red_sand`) | Rendered Blubber on Red Sand | Sand sounds   |
| Stabilized Gravel (`my:stabilized_gravel`)     | Rendered Blubber on Gravel   | Gravel sounds |

These blocks look like their vanilla counterparts but **will not fall** when
unsupported.

---

## File Structure

```
behavior_pack/
├── manifest.json                 # BP manifest (data + script modules)
├── blocks/
│   ├── stabilized_sand.json
│   ├── stabilized_red_sand.json
│   └── stabilized_gravel.json
├── entities/
│   └── seal.json                 # Full entity behavior definition
├── items/
│   ├── seal_blubber.json
│   └── rendered_blubber.json
├── loot_tables/entities/
│   └── seal.json                 # Drops cod / salmon on death
└── scripts/
    └── main.js                   # 4 script features (tickle, food, gravity freeze, rider buff)

resource_pack/
├── manifest.json                 # RP manifest
├── animation_controllers/
│   └── seal.animation_controllers.json
├── animations/
│   └── seal.animation.json
├── entity/
│   └── seal.client.entity.json   # Client entity (textures, anims, sounds, spawn egg)
├── models/entity/
│   └── seal.geo.json             # Geometry model (128×128 UV, 512×512 textures)
├── render_controllers/
│   └── seal.render_controllers.json
├── sounds/
│   ├── sound_definitions.json
│   └── entity/seal/              # .ogg sound files
├── texts/
│   └── en_US.lang                # Display names
└── textures/
    ├── item_texture.json
    ├── terrain_texture.json
    ├── blocks/                   # Stabilized block textures
    ├── entity/seal/              # 5 variant skins (512×512)
    └── items/                    # Item icons
```

---

## Development History

This add-on was developed through an AI-assisted iterative workflow
(GitHub Copilot / Claude) with the author providing creative direction,
in-game testing, and art assets.

**Key milestones:**

1. **Entity foundation** — Blockbench Entity Wizard exported the initial
   geometry and client entity scaffolding.
2. **Behavior design** — Taming, riding (amphibious with dual control
   schemes), variant selection via biome environment sensors, and the
   full saddle equip/unequip lifecycle.
3. **Script features** — `@minecraft/server` 1.14.0 scripting for four
   gameplay mechanics: tickle interaction, blubber food effects, gravity
   freeze, and rider conduit-power buff.
4. **Geometry rework** — The -90° Y rotation needed for seal orientation
   (facing sideways in Bedrock) was baked directly into cube
   positions/pivots rather than using a root-bone rotation, preventing
   animation-axis mismatches.
5. **UV audit** — North/South and East/West face UVs were swapped to
   correct the baked-rotation mirror effect.
6. **Extensive playtesting** — 12+ rounds of in-game debugging covering
   orientation, UV mapping, riding priority conflicts, block textures,
   animation loops, and sound playback.

---

## Modification Guide

### Adding a New Texture Variant

1. Create a **512×512 skin** PNG and place it in
   `resource_pack/textures/entity/seal/`.
2. In `resource_pack/entity/seal.client.entity.json`, add a new texture
   entry under `"textures"`:
   ```json
   "my_new_skin": "textures/entity/seal/my_new_skin"
   ```
3. In `resource_pack/render_controllers/seal.render_controllers.json`,
   append `"Texture.my_new_skin"` to `Array.skin_variants`.
4. In `behavior_pack/entities/seal.json`:
   - Add a new component group:
     ```json
     "my:variant_new": { "minecraft:variant": { "value": 5 } }
     ```
   - Add the group to the appropriate biome event or
     `my:set_random_variant`.

### Changing AI / Behavior

All AI lives in `behavior_pack/entities/seal.json` under `"components"`
(always-on) and `"component_groups"` (conditional). Key behaviors:

| Behavior                             | Priority | Notes                          |
| ------------------------------------ | -------- | ------------------------------ |
| `behavior.sit` / `sittable`          | 0        | Sit-on-command (tamed only)    |
| `behavior.player_ride_tamed`         | 0        | Player steering (saddled only) |
| `behavior.follow_owner`              | 1        | Follow tamer                   |
| `behavior.tempt`                     | 2        | Follow fish-bucket holders     |
| `behavior.nearest_attackable_target` | 3        | Hunt fish (wild only)          |
| `behavior.melee_attack`              | 4        | Attack target                  |
| `behavior.move_to_water`             | 5        | Seek water                     |
| `behavior.swim_idle`                 | 6        | Idle swimming                  |
| `behavior.random_swim`               | 7        | Wander in water                |
| `behavior.random_stroll`             | 8        | Wander on land                 |
| `behavior.look_at_player`            | 9        | Look at nearby players         |
| `behavior.random_look_around`        | 10       | Idle head movement             |

Lower priority number = evaluated first.

### Adding or Editing Animations

Animations are in `resource_pack/animations/seal.animation.json` (Bedrock
animation format). The state machine in
`resource_pack/animation_controllers/seal.animation_controllers.json` has
four states:

- `on_ground` — idle / walk / look_at_target
- `in_water` — swim / idle / look_at_target
- `clapping` — triggered by `query.is_tempted`
- `tickled` — triggered by `query.is_charged`

To add a new animation:

1. Define it in the animations file.
2. Reference it in `seal.client.entity.json` under `"animations"`.
3. Add a transition rule in the animation controller.

### Adding New Sounds

1. Place `.ogg` files in `resource_pack/sounds/entity/seal/`.
2. Register them in `resource_pack/sounds/sound_definitions.json`.
3. For entity-automatic sounds (ambient, hurt, death, step), add routing
   in `resource_pack/sounds.json`.
4. For animation-triggered sounds, add `"sound_effects"` keyframes in
   the animation file and register the short name in the client entity's
   `"sound_effects"` map.
5. For script-triggered sounds, use
   `entity.dimension.playSound("sound.id", entity.location)`.

### Using This as a Mob Template

To create a new mob based on this seal:

1. **Copy** `behavior_pack/entities/seal.json` → rename identifier.
2. **Copy** `resource_pack/entity/seal.client.entity.json` → update
   identifier, textures, geometry, and animation references.
3. **Copy** animations, geometry, render controller, and sounds —
   rename identifiers to match.
4. Update `en_US.lang` with display names.
5. Update item textures / loot tables as needed.
6. In `main.js`, search-replace `"my:seal"` with your new identifier if
   you want the same script features.

---

## Future Upgrades

The following features are planned for future versions:

- **Breeding** — Tamed seals will be breedable with fish buckets.
  Babies will spawn at half scale and grow up over ~5 minutes.
  The groundwork (component groups, events, ageable timer) was prototyped
  during development and can be re-enabled by adding `my:adult` and
  `my:baby` component groups back to the entity definition.
- **Seal Potion** — A drinkable potion crafted from blubber with unique
  aquatic effects.
- **Additional biome variants** — More skins for swamp, deep dark, and
  lush cave biomes.
- **Spawn rules** — Natural spawning via `spawn_rules/` with biome
  filters and population caps.

---

## Credits

- **Ritual Boat** — Design, art, in-game testing, creative direction
- **Valen Russel** — Inspiration and moral support ❤️
- **GitHub Copilot (Claude)** — AI-assisted code generation and debugging
- **Blockbench** — Entity model and UV editing

---

## License

This project is provided as-is for personal and educational use.
Feel free to modify it for your own worlds. If you redistribute it,
please credit **Ritual Boat** as the original author.
