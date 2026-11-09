-- Bu dosya tools/bake-sounds.ts tarafından client/sounds.ts'den üretilir, elle değiştirme.
return {
  NAMES = { "click", "deny", "hit", "hit_heavy", "shoot_a", "shoot_b", "shoot_c", "death", "spawn", "coin", "base", "boom", "special", "evolve", "countdown", "countdown_final", "win", "lose" },
  THROTTLE_MS = {
    hit = 45,
    shoot = 60,
    death = 70,
    spawn = 120,
    coin = 90,
    base = 160,
    boom = 50,
  },
  THROTTLE_GROUP = {
    hit = "hit",
    hit_heavy = "hit",
    shoot_a = "shoot",
    shoot_b = "shoot",
    shoot_c = "shoot",
    death = "death",
    spawn = "spawn",
    coin = "coin",
    base = "base",
    boom = "boom",
  },
}
