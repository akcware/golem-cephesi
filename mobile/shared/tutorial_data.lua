-- Bu dosya tools/export-lua.ts tarafından shared/tutorial.ts'den üretilir, elle değiştirme.
-- TUTORIAL[1] = sunucudaki 0. adım (state.tut + 1). Metinler i18n_data.lua'da (tut.<id>.title …).
return {
  TUTORIAL = {
    {
      id = "intro",
      target = "none",
      button = true,
    },
    {
      id = "train",
      target = "melee",
    },
    {
      id = "fight",
      target = "none",
    },
    {
      id = "counter",
      target = "melee",
    },
    {
      id = "heavy",
      target = "ranged",
    },
    {
      id = "hold",
      target = "stance",
    },
    {
      id = "gather",
      target = "units",
    },
    {
      id = "capture",
      target = "none",
    },
    {
      id = "outpost",
      target = "outpost",
    },
    {
      id = "turret",
      target = "slot",
    },
    {
      id = "evolve",
      target = "evolve",
    },
    {
      id = "card",
      target = "card",
    },
    {
      id = "cmd",
      target = "cmd",
    },
    {
      id = "special",
      target = "special",
    },
    {
      id = "finish",
      target = "none",
    },
  },
  TUT_REVEAL = {
    units = "train",
    stance = "hold",
    outposts = "capture",
    slots = "turret",
    evolve = "evolve",
    cmd = "cmd",
    special = "special",
  },
  TIPS = {
    {
      id = "enemy_ranged",
      target = "melee",
    },
    {
      id = "enemy_heavy",
      target = "ranged",
    },
    {
      id = "enemy_melee",
      target = "heavy",
    },
    {
      id = "point_owned",
      target = "outpost",
    },
    {
      id = "turret_gold",
      target = "slot",
    },
    {
      id = "evolve_ready",
      target = "evolve",
    },
    {
      id = "cmd_ready",
      target = "cmd",
    },
    {
      id = "special_ready",
      target = "special",
    },
    {
      id = "source",
      target = "none",
    },
    {
      id = "outnumbered",
      target = "stance",
    },
    {
      id = "low_castle",
      target = "stance",
    },
    {
      id = "siege_soon",
      target = "none",
    },
  },
}
