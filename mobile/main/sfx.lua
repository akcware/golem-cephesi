-- Ses efektleri: tools/bake-sounds.ts'in ürettiği WAV'lar (web'deki sentez tarifleriyle aynı).
-- Hem oyun betiği hem arayüz çağırabilir (ses bileşenine mesaj yollanır).
local D = require("shared.sound_data")

local M = { muted = false }
local last = {}
local URL = "main:/sfx#"

local function now() return socket.gettime() end

--- name: ses adı; "shoot" için tier ile kademeye göre seçilir.
function M.play(name, tier)
	if M.muted then return end
	if name == "shoot" then
		local t = tier or 0
		name = t == 2 and "shoot_b" or (t >= 3 and "shoot_c" or "shoot_a")
	end
	local group = D.THROTTLE_GROUP[name]
	if group then
		local t = now()
		if last[group] and (t - last[group]) * 1000 < D.THROTTLE_MS[group] then return end
		last[group] = t
	end
	msg.post(URL .. name, "play_sound")
end

return M
