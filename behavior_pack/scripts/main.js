import {
  world,
  system,
  EquipmentSlot,
  GameMode,
  ItemStack,
} from "@minecraft/server";

// ============================================================
// CONSTANTS & TRACKING MAPS
// ============================================================

const TICKLE_COOLDOWN_TICKS = 1200; // 1 minute
const tickleCooldowns = new Map();

const TAME_ITEMS = [
  "minecraft:cod_bucket",
  "minecraft:salmon_bucket",
  "minecraft:tropical_fish_bucket",
];
const TAME_PROBABILITY = 0.33;
const GUARANTEED_TAME_ATTEMPTS = 5;
const tameAttempts = new Map();

const FISH_ITEM_IDS = [
  "minecraft:cod",
  "minecraft:salmon",
  "minecraft:tropical_fish",
  "minecraft:pufferfish",
  "minecraft:bone",
];

const activeTickles = new Set();

// ============================================================
// BUCKET RETURN — Breeding, healing, and aging consume the
// entire fish bucket via vanilla. Give back an empty bucket.
// ============================================================

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const entity = event.target;
  if (entity.typeId !== "my:seal") return;

  const itemStack = event.itemStack;
  if (!itemStack || !TAME_ITEMS.includes(itemStack.typeId)) return;

  // Only handle tamed or baby seals (untamed adults handled by taming handler)
  try {
    const isTamed = entity.getComponent("minecraft:is_tamed");
    const isBaby = entity.getComponent("minecraft:is_baby");
    if (!isTamed && !isBaby) return;
  } catch (e) {
    return;
  }

  // Don't cancel — let vanilla breedable/healable/ageable process it
  // Then give back an empty bucket on the next tick
  system.run(() => {
    try {
      if (player.getGameMode() === GameMode.creative) return;
      const bucket = new ItemStack("minecraft:bucket", 1);
      player.getComponent("inventory")?.container?.addItem(bucket);
    } catch (e) {}
  });
});

// ============================================================
// Feature 1a: CUSTOM TAMING — Guaranteed after 5 attempts
// Uses fish buckets on wild seals. 33% each try, 100% on 5th.
// Returns empty bucket. Shows hearts on success, smoke on fail.
// ============================================================

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const entity = event.target;

  if (entity.typeId !== "my:seal") return;

  const itemStack = event.itemStack;
  if (!itemStack || !TAME_ITEMS.includes(itemStack.typeId)) return;

  // Only intercept for wild (untamed) adult seals
  try {
    const isTamed = entity.getComponent("minecraft:is_tamed");
    const isBaby = entity.getComponent("minecraft:is_baby");
    if (isTamed || isBaby) return;
  } catch (e) {
    return;
  }

  event.cancel = true;

  system.run(() => {
    try {
      const entityId = entity.id;
      const attempts = (tameAttempts.get(entityId) || 0) + 1;
      tameAttempts.set(entityId, attempts);

      // Consume fish bucket -> give back empty bucket
      if (player.getGameMode() !== GameMode.creative) {
        const equipment = player.getComponent("equippable");
        if (equipment) {
          const mainhand = equipment.getEquipment(EquipmentSlot.Mainhand);
          if (mainhand) {
            if (mainhand.amount > 1) {
              mainhand.amount -= 1;
              equipment.setEquipment(EquipmentSlot.Mainhand, mainhand);
              const bucket = new ItemStack("minecraft:bucket", 1);
              player.getComponent("inventory")?.container?.addItem(bucket);
            } else {
              const bucket = new ItemStack("minecraft:bucket", 1);
              equipment.setEquipment(EquipmentSlot.Mainhand, bucket);
            }
          }
        }
      }

      // Roll taming chance
      const success =
        attempts >= GUARANTEED_TAME_ATTEMPTS ||
        Math.random() < TAME_PROBABILITY;

      if (success) {
        entity.triggerEvent("my:on_tame");
        tameAttempts.delete(entityId);

        // Spawn heart particles around the seal
        const loc = entity.location;
        for (let i = 0; i < 7; i++) {
          const ox = (Math.random() - 0.5) * 1.5;
          const oy = Math.random() * 1.0 + 0.5;
          const oz = (Math.random() - 0.5) * 1.5;
          try {
            entity.dimension.spawnParticle("minecraft:heart_particle", {
              x: loc.x + ox,
              y: loc.y + oy,
              z: loc.z + oz,
            });
          } catch (e) {}
        }

        player.sendMessage("\u00A7aThe seal is now your friend!");
      } else {
        // Smoke particles for failure (no chat message)
        try {
          entity.dimension.spawnParticle("minecraft:basic_smoke_particle", {
            x: entity.location.x,
            y: entity.location.y + 1.0,
            z: entity.location.z,
          });
        } catch (e) {}
      }
    } catch (e) {
      console.warn(`[CuteSeals] Taming error: ${e}`);
    }
  });
});

// ============================================================
// Feature 1b: Anchor/Free Toggle — Sneak + empty hand
// Toggles between "stay in area" and "roam freely" modes.
// ============================================================

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const entity = event.target;

  if (entity.typeId !== "my:seal") return;
  if (!player.isSneaking) return;

  const itemStack = event.itemStack;
  if (itemStack) return; // Only with empty hand

  event.cancel = true;

  system.run(() => {
    try {
      if (!entity.getComponent("minecraft:is_tamed")) return;

      const isAnchored = entity.getProperty("my:is_anchored");
      if (isAnchored) {
        entity.triggerEvent("my:free_seal");
        player.sendMessage("\u00A7bThe seal swims freely!");
      } else {
        entity.triggerEvent("my:anchor_seal");
        player.sendMessage("\u00A7eThe seal will stay in this area.");
      }
    } catch (e) {
      console.warn(`[CuteSeals] Anchor toggle error: ${e}`);
    }
  });
});

// ============================================================
// Feature 1c: Tickle Mechanic — Brush -> drops Blubber
// Adults drop blubber; babies only play the animation.
// ============================================================

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const entity = event.target;

  if (entity.typeId !== "my:seal") return;

  const itemStack = event.itemStack;
  if (!itemStack || itemStack.typeId !== "minecraft:brush") return;

  event.cancel = true;

  system.run(() => {
    const now = system.currentTick;
    const entityId = entity.id;
    const cooldownEnd = tickleCooldowns.get(entityId) || 0;

    if (now < cooldownEnd) {
      const remainingSec = Math.ceil((cooldownEnd - now) / 20);
      player.sendMessage(
        `\u00A77This seal was recently tickled. Try again in \u00A7e${remainingSec}s\u00A77.`,
      );
      return;
    }

    tickleCooldowns.set(entityId, now + TICKLE_COOLDOWN_TICKS);

    try {
      entity.triggerEvent("my:start_tickle");
      activeTickles.add(entity.id);
      entity.dimension.playSound("mob.seal.tickle", entity.location);

      const isBaby = entity.getComponent("minecraft:is_baby");
      if (!isBaby) {
        system.runTimeout(() => {
          try {
            const blubberStack = new ItemStack("my:seal_blubber", 1);
            const offsetX = (Math.random() - 0.5) * 0.5;
            const offsetZ = (Math.random() - 0.5) * 0.5;
            entity.dimension.spawnItem(blubberStack, {
              x: entity.location.x + offsetX,
              y: entity.location.y + 1.0,
              z: entity.location.z + offsetZ,
            });
          } catch (e) {}
        }, 10);
      }

      // Heart particles
      try {
        entity.dimension.spawnParticle("minecraft:heart_particle", {
          x: entity.location.x,
          y: entity.location.y + 1.0,
          z: entity.location.z,
        });
      } catch (e) {}

      // End tickle state after 3 seconds
      const tickleSealId = entity.id;
      system.runTimeout(() => {
        try {
          entity.triggerEvent("my:end_tickle");
        } catch (e) {}
        activeTickles.delete(tickleSealId);
      }, 60);
    } catch (e) {
      console.warn(`[CuteSeals] Tickle error: ${e}`);
    }
  });
});

// ============================================================
// Feature 5: Clap — One-shot greeting when player pulls out
// a fish bucket. Plays once, then seal just follows (tempt).
// Unequip and re-equip the bucket to trigger clap again.
// ============================================================

const sealGreetedPlayers = new Map(); // sealId -> Set<playerId>
const activeClaps = new Set(); // seal ids currently in clap anim

system.runInterval(() => {
  // Find all players currently holding fish buckets
  const fishHolderMap = new Map();
  for (const player of world.getAllPlayers()) {
    try {
      const equip = player.getComponent("equippable");
      if (!equip) continue;
      const mainhand = equip.getEquipment(EquipmentSlot.Mainhand);
      if (mainhand && TAME_ITEMS.includes(mainhand.typeId)) {
        fishHolderMap.set(player.id, player);
      }
    } catch (e) {}
  }

  // Check all tamed seals
  const checkedDims = new Set();
  for (const player of world.getAllPlayers()) {
    const dimId = player.dimension.id;
    if (checkedDims.has(dimId)) continue;
    checkedDims.add(dimId);

    try {
      const seals = player.dimension.getEntities({ type: "my:seal" });
      for (const seal of seals) {
        try {
          if (!seal.getComponent("minecraft:is_tamed")) continue;

          let greeted = sealGreetedPlayers.get(seal.id);
          if (!greeted) {
            greeted = new Set();
            sealGreetedPlayers.set(seal.id, greeted);
          }

          // Check if any fish holder is within 8 blocks
          let hasNearbyHolder = false;
          for (const [holderId, holder] of fishHolderMap) {
            if (holder.dimension.id !== seal.dimension.id) continue;
            const dx = holder.location.x - seal.location.x;
            const dy = holder.location.y - seal.location.y;
            const dz = holder.location.z - seal.location.z;
            if (dx * dx + dy * dy + dz * dz > 64) continue;

            hasNearbyHolder = true;

            // Clap once per "bucket pull-out" — if not already greeted
            if (!greeted.has(holderId) && !activeClaps.has(seal.id)) {
              greeted.add(holderId);
              seal.triggerEvent("my:start_clap");
              activeClaps.add(seal.id);
              const sealRef = seal;
              const sealId = seal.id;
              // End clap after 1.5 seconds, then seal follows normally
              system.runTimeout(() => {
                try {
                  sealRef.triggerEvent("my:end_clap");
                } catch (e) {}
                activeClaps.delete(sealId);
              }, 30);
            }
          }

          // If no fish holder is nearby, clear greeted set
          // so next time a player pulls out a bucket → clap again
          if (!hasNearbyHolder) {
            greeted.clear();
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
}, 10);

// ============================================================
// Feature 6: Chested Seal Fish Loot Collection
// Tamed chested seals (without riders) pick up nearby fish
// items and bones, storing them in their chest inventory.
// ============================================================

system.runInterval(() => {
  const checkedDims = new Set();
  for (const player of world.getAllPlayers()) {
    const dimId = player.dimension.id;
    if (checkedDims.has(dimId)) continue;
    checkedDims.add(dimId);

    try {
      const seals = player.dimension.getEntities({ type: "my:seal" });
      for (const seal of seals) {
        try {
          // Only chested seals without riders
          if (!seal.getComponent("minecraft:is_chested")) continue;
          const rideable = seal.getComponent("minecraft:rideable");
          if (rideable) {
            try {
              const riders = rideable.getRiders();
              if (riders && riders.length > 0) continue;
            } catch (e) {}
          }

          const inv = seal.getComponent("minecraft:inventory");
          if (!inv || !inv.container) continue;

          // Find nearby dropped fish/bone items (within 3 blocks)
          const nearbyItems = seal.dimension.getEntities({
            location: seal.location,
            maxDistance: 3,
            type: "minecraft:item",
          });

          for (const itemEntity of nearbyItems) {
            try {
              const itemComp = itemEntity.getComponent("minecraft:item");
              if (!itemComp) continue;

              const stack = itemComp.itemStack;
              if (!stack || !FISH_ITEM_IDS.includes(stack.typeId)) continue;

              // Try to add to seal's inventory
              const remainder = inv.container.addItem(stack);
              if (!remainder) {
                itemEntity.kill();
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
}, 20);

// ============================================================
// Cleanup — Remove stale cooldown/tame entries every 60 sec
// ============================================================

system.runInterval(() => {
  const now = system.currentTick;
  for (const [entityId, cooldownEnd] of tickleCooldowns) {
    if (now > cooldownEnd + 1200) {
      tickleCooldowns.delete(entityId);
    }
  }
  for (const [entityId] of tameAttempts) {
    try {
      let found = false;
      for (const dim of ["overworld", "nether", "the_end"]) {
        try {
          const entities = world.getDimension(dim).getEntities({
            type: "my:seal",
          });
          if (entities.some((e) => e.id === entityId)) {
            found = true;
            break;
          }
        } catch (e) {}
      }
      if (!found) tameAttempts.delete(entityId);
    } catch (e) {
      tameAttempts.delete(entityId);
    }
  }
}, 1200);

// ============================================================
// Feature 2: Seal Blubber Food — Absorption only if in water
// ============================================================

world.afterEvents.itemCompleteUse.subscribe((event) => {
  if (!event.itemStack) return;
  const player = event.source;
  if (!player) return;

  if (event.itemStack.typeId === "my:seal_blubber") {
    if (player.isInWater) {
      player.addEffect("absorption", 600, {
        amplifier: 0,
        showParticles: true,
      });
      player.sendMessage("\u00A7aThe blubber warms you with ocean energy!");
    }
  }
});

// ============================================================
// Feature 3: Gravity Freeze — Rendered Blubber on Sand/Gravel
// ============================================================

const GRAVITY_BLOCK_MAP = {
  "minecraft:sand": "my:stabilized_sand",
  "minecraft:red_sand": "my:stabilized_red_sand",
  "minecraft:gravel": "my:stabilized_gravel",
};

world.beforeEvents.itemUseOn.subscribe((event) => {
  const item = event.itemStack;
  if (!item || item.typeId !== "my:rendered_blubber") return;

  const block = event.block;
  const stabilizedId = GRAVITY_BLOCK_MAP[block.typeId];
  if (!stabilizedId) return;

  event.cancel = true;

  system.run(() => {
    try {
      block.setType(stabilizedId);

      const player = event.source;
      if (player.getGameMode() !== GameMode.creative) {
        const equipment = player.getComponent("equippable");
        if (equipment) {
          const mainhand = equipment.getEquipment(EquipmentSlot.Mainhand);
          if (mainhand && mainhand.amount > 1) {
            mainhand.amount -= 1;
            equipment.setEquipment(EquipmentSlot.Mainhand, mainhand);
          } else {
            equipment.setEquipment(EquipmentSlot.Mainhand, undefined);
          }
        }
      }
    } catch (e) {
      console.warn(`[CuteSeals] Gravity freeze error: ${e}`);
    }
  });
});

// ============================================================
// Feature 4: Seal Rider Buff — One-shot 15s water breathing on mount
// Applied once when mounting a seal in water. Dismount and remount
// to get it again.
// ============================================================

const playersGrantedBuff = new Set(); // player ids that already received the buff this ride

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      const ridingComp = player.getComponent("riding");
      if (!ridingComp) {
        // Player is NOT riding — clear their buff flag so next mount gives it again
        playersGrantedBuff.delete(player.id);
        continue;
      }

      const mount = ridingComp.entityRidingOn;
      if (mount && mount.typeId === "my:seal" && player.isInWater) {
        if (!playersGrantedBuff.has(player.id)) {
          playersGrantedBuff.add(player.id);
          player.addEffect("water_breathing", 300, {
            amplifier: 0,
            showParticles: true,
          });
        }
      }
    } catch (e) {}
  }
}, 20);

// ============================================================
// Feature 7: Script-based Rolling — Periodically triggers roll
// No component group changes — only sets/clears the property.
// Animation controller handles visual freeze of walk/swim.
// ============================================================

const rollCooldowns = new Map();
const activeRolls = new Set();

system.runInterval(() => {
  const now = system.currentTick;
  const checkedDims = new Set();

  for (const player of world.getAllPlayers()) {
    const dimId = player.dimension.id;
    if (checkedDims.has(dimId)) continue;
    checkedDims.add(dimId);

    try {
      const seals = player.dimension.getEntities({ type: "my:seal" });
      for (const seal of seals) {
        try {
          // Skip if already rolling, being ridden, or baby
          if (seal.getProperty("my:is_rolling")) continue;
          if (seal.getComponent("minecraft:is_baby")) continue;
          const rideable = seal.getComponent("minecraft:rideable");
          if (rideable) {
            try {
              const riders = rideable.getRiders();
              if (riders && riders.length > 0) continue;
            } catch (e) {}
          }

          // Check cooldown (15s minimum gap)
          const nextRoll = rollCooldowns.get(seal.id) || 0;
          if (now < nextRoll) continue;

          // 5% chance per check (every 1s) = roughly every 20s on average
          if (Math.random() > 0.05) continue;

          // Start roll
          seal.triggerEvent("my:start_roll");
          activeRolls.add(seal.id);
          rollCooldowns.set(seal.id, now + 300);
          const sealRef = seal;
          const sealId = seal.id;

          // End roll after 2 seconds
          system.runTimeout(() => {
            try {
              sealRef.triggerEvent("my:end_roll");
            } catch (e) {}
            activeRolls.delete(sealId);
          }, 40);
        } catch (e) {}
      }
    } catch (e) {}
  }
}, 20);

// ============================================================
// Safety Sweep — Clear stuck rolling/clapping/tickle states
// Handles chunk reload losing script runTimeout references.
// ============================================================

system.runInterval(() => {
  const checkedDims = new Set();
  for (const player of world.getAllPlayers()) {
    const dimId = player.dimension.id;
    if (checkedDims.has(dimId)) continue;
    checkedDims.add(dimId);

    try {
      const seals = player.dimension.getEntities({ type: "my:seal" });
      for (const seal of seals) {
        try {
          // Clear stuck rolling
          if (seal.getProperty("my:is_rolling") && !activeRolls.has(seal.id)) {
            seal.triggerEvent("my:end_roll");
          }
          // Clear stuck clapping
          if (seal.getProperty("my:is_clapping") && !activeClaps.has(seal.id)) {
            seal.triggerEvent("my:end_clap");
          }
          // Clear stuck tickle
          if (
            seal.getProperty("my:is_tickled") &&
            !activeTickles.has(seal.id)
          ) {
            seal.triggerEvent("my:end_tickle");
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
}, 200); // Every 10 seconds
