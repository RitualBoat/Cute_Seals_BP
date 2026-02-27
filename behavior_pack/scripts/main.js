import {
  world,
  system,
  EquipmentSlot,
  GameMode,
  ItemStack,
} from "@minecraft/server";

// ============================================================
// TICKLE COOLDOWN TRACKING
// Per-entity cooldown map: entityId → next-available tick
// Cooldown: 1 minute = 1200 ticks
// ============================================================

const TICKLE_COOLDOWN_TICKS = 1200;
const tickleCooldowns = new Map();

// ============================================================
// Feature 1: Tickle Mechanic — Brush on Seal → drops Blubber
// Uses beforeEvents to CANCEL the default interaction (ride)
// when the player is holding a brush. Defers world modifications
// with system.run() as required by the before-event contract.
// ============================================================

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const entity = event.target;

  if (entity.typeId !== "my:seal") return;

  // Check if player is holding a brush via the event's itemStack
  const itemStack = event.itemStack;
  if (!itemStack || itemStack.typeId !== "minecraft:brush") return;

  // Cancel the interaction — prevents riding / sit-toggle / etc.
  event.cancel = true;

  // Defer all world modifications to the next tick
  system.run(() => {
    // Check cooldown
    const now = system.currentTick;
    const entityId = entity.id;
    const cooldownEnd = tickleCooldowns.get(entityId) || 0;

    if (now < cooldownEnd) {
      const remainingSec = Math.ceil((cooldownEnd - now) / 20);
      player.sendMessage(
        `§7This seal was recently tickled. Try again in §e${remainingSec}s§7.`,
      );
      return;
    }

    // Set cooldown
    tickleCooldowns.set(entityId, now + TICKLE_COOLDOWN_TICKS);

    try {
      // Trigger tickle animation via entity event
      entity.triggerEvent("my:start_tickle");

      // Play tickle sound directly — animation sound_effects can be unreliable
      entity.dimension.playSound("mob.seal.tickle", entity.location);

      // Spawn blubber with a "pop" offset after a short delay (0.5s)
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
        } catch (e) {
          // Entity may have despawned
        }
      }, 10);

      // Spawn heart particles
      entity.dimension.spawnParticle("minecraft:heart_emission", {
        x: entity.location.x,
        y: entity.location.y + 1.0,
        z: entity.location.z,
      });

      // End tickle state after 3 seconds
      system.runTimeout(() => {
        try {
          entity.triggerEvent("my:end_tickle");
        } catch (e) {
          // Entity may have despawned
        }
      }, 60);
    } catch (e) {
      console.warn(`[CuteSeals] Tickle error: ${e}`);
    }
  });
});

// Cleanup despawned entities from cooldown map every 60 seconds
system.runInterval(() => {
  const now = system.currentTick;
  for (const [entityId, cooldownEnd] of tickleCooldowns) {
    if (now > cooldownEnd + 1200) {
      tickleCooldowns.delete(entityId);
    }
  }
}, 1200);

// ============================================================
// Feature 2: Seal Blubber Food — Absorption only if in water
// When a player finishes eating seal blubber, grants Absorption I
// for 30 seconds ONLY if they are standing in water.
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
      player.sendMessage("§aThe blubber warms you with ocean energy!");
    }
  }
});

// ============================================================
// Feature 3: Gravity Freeze — Rendered Blubber on Sand/Gravel
// Using RENDERED blubber on gravity blocks converts them to
// their stabilized counterparts and consumes one item.
//   Sand       → my:stabilized_sand
//   Red Sand   → my:stabilized_red_sand
//   Gravel     → my:stabilized_gravel
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
// Feature 4: Seal Rider Buff — Conduit Power while riding
// Grants Conduit Power to any player riding a seal in water.
// ============================================================

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      const ridingComp = player.getComponent("riding");
      if (!ridingComp) continue;

      const mount = ridingComp.entityRidingOn;
      if (mount && mount.typeId === "my:seal" && player.isInWater) {
        player.addEffect("conduit_power", 60, {
          amplifier: 0,
          showParticles: false,
        });
      }
    } catch (e) {
      // Player may have disconnected mid-tick
    }
  }
}, 20);
