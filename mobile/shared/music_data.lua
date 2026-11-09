-- Bu dosya tools/bake-music.ts tarafından client/tracks.ts'den üretilir, elle değiştirme.
return {
  TRACKS = {
    menu = {
      loop = true,
      vol = 1,
    },
    battle = {
      loop = true,
      vol = 0.62,
    },
    tension = {
      loop = true,
      vol = 0.57,
    },
    victory = {
      loop = false,
      vol = 0.61,
    },
    defeat = {
      loop = false,
      vol = 1,
    },
  },
  MUSIC_GAIN = 1,
  FADE_S = 1.6,
  DUCK = {
    gain = 0.45,
    hold = 0.12,
    release = 0.7,
  },
  TENSION_HP = 0.3,
}
