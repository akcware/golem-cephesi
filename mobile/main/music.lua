-- Arka plan müziği (web'deki client/music.ts'in karşılığı): menü, savaş ve gerilim parçaları arasında
-- yumuşak geçiş, maç sonu motifi, büyük patlamalarda kısa kısılma. Parçalar client/tracks.ts listesinden
-- tools/bake-music.ts ile üretilir (main/music.go, shared/music_data.lua).
-- Ses çağrıları yalnızca game.script'in update'inden yapılır; arayüz yalnızca durumu değiştirir.
local D = require("shared.music_data")

local M = { off = false, TENSION_HP = D.TENSION_HP }
local URL = "main:/music#"
local H_DONE = hash("sound_done")

local mode = "menu"
local tense = false
local stinger = nil -- çalan motif
local stinger_t = 0 -- motif takılı kalmasın diye üst süre
local pending = nil -- istenen motif (bir sonraki update'te çalar)
local fresh = false -- savaş müziği baştan başlasın
local kill_stinger = false
local fade_s = D.FADE_S -- bu karede başlayan geçişlerin süresi
local duck_age = 99
local voices = {} -- id -> { level, target, speed, state = "stopped" | "playing" | "paused" }
local group_gain = -1

-- Defold'da kazanç 0..1 aralığı -60..0 dB'dir; web'deki doğrusal genlikleri buna çevirir.
local function to_gain(a)
	if a <= 0.001 then return 0 end
	return math.max(0, 1 + 20 * math.log10(a) / 60)
end

local function voice(id)
	local v = voices[id]
	if not v then
		v = { level = 0, target = 0, speed = 1, state = "stopped" }
		voices[id] = v
	end
	return v
end

--- Şu an duyulması gereken döngü parçası.
local function wanted()
	if M.off or stinger or pending then return nil end
	if mode == "battle" then return (tense and D.TRACKS.tension) and "tension" or "battle" end
	return "menu"
end

local function duck_level()
	local a, h, r, g = 0.04, D.DUCK.hold, D.DUCK.release, D.DUCK.gain
	local t = duck_age
	if t < a then return 1 + (g - 1) * t / a end
	if t < a + h then return g end
	if t < a + h + r then return g + (1 - g) * (t - a - h) / r end
	return 1
end

local function stop_stinger()
	if stinger then sound.stop(URL .. stinger) end
	stinger = nil
end

local function start_stinger(id)
	stop_stinger()
	stinger = id
	stinger_t = 20
	fade_s = 0.5 -- döngüler hızla söner
	sound.play(URL .. id, { gain = to_gain(D.TRACKS[id].vol) }, function(_, message_id)
		if message_id == H_DONE and stinger == id then
			stinger = nil
			fade_s = 3 -- motiften sonra menü müziği yavaşça geri gelir
		end
	end)
end

function M.update(dt)
	if not next(D.TRACKS) then return end
	duck_age = duck_age + dt
	if kill_stinger then
		kill_stinger = false
		stop_stinger()
	end
	if pending then
		start_stinger(pending)
		pending = nil
	end
	if stinger then
		stinger_t = stinger_t - dt
		if stinger_t <= 0 then stop_stinger() end
	end
	if fresh then
		fresh = false
		for _, id in ipairs({ "battle", "tension" }) do
			local v = voices[id]
			if v and v.state == "paused" then
				sound.stop(URL .. id)
				v.state = "stopped"
			end
		end
	end
	local want = wanted()
	for id, t in pairs(D.TRACKS) do
		if t.loop then
			local v = voice(id)
			local target = id == want and t.vol or 0
			if target ~= v.target then
				v.target = target
				v.speed = math.max(0.01, math.abs(target - v.level)) / math.max(0.05, fade_s)
			end
			if target > 0 and v.state ~= "playing" then
				if v.state == "paused" then
					sound.pause(URL .. id, false)
				else
					sound.play(URL .. id, { gain = to_gain(v.level) })
				end
				v.state = "playing"
			end
			if v.level < v.target then
				v.level = math.min(v.target, v.level + v.speed * dt)
			elseif v.level > v.target then
				v.level = math.max(v.target, v.level - v.speed * dt)
			end
			if v.state == "playing" then
				if v.level <= 0 and v.target <= 0 then
					-- sönen parça durdurulur ama yeri korunur (geri dönünce kaldığı yerden sürer)
					sound.pause(URL .. id, true)
					v.state = "paused"
				else
					sound.set_gain(URL .. id, to_gain(v.level))
				end
			end
		end
	end
	fade_s = D.FADE_S
	local g = M.off and 0 or to_gain(D.MUSIC_GAIN * duck_level())
	if math.abs(g - group_gain) > 0.001 then
		group_gain = g
		sound.set_group_gain("music", g)
	end
end

--- Ana menü, bekleme odası.
function M.menu()
	mode = "menu"
	tense = false
end

--- Maç başlıyor (restart: savaş müziği baştan).
function M.battle(restart)
	if restart then
		fresh = true
		kill_stinger = true
		pending = nil
		tense = false
	end
	mode = "battle"
end

--- Maç bitti: zafer/yenilgi motifi. Motif yoksa ya da müzik kapalıysa false döner (efekt sesi çalınsın).
function M.ended(win)
	mode = "ended"
	tense = false
	local id = win and "victory" or "defeat"
	if M.off or not D.TRACKS[id] then return false end
	pending = id
	return true
end

--- Kale düşerken ya da Yıkım Saati'nde gerilim parçasına geçer.
function M.tension(on)
	if on == tense then return end
	tense = on
	if mode == "battle" then fade_s = on and 1.2 or 2.5 end
end

--- Büyük patlama: müzik bir an kısılıp geri gelir.
function M.duck()
	duck_age = 0
end

function M.set_off(off)
	M.off = off
	if off then
		kill_stinger = true
		pending = nil
	else
		fade_s = 1.2
	end
end

return M
