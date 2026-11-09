-- Birim görünümleri: parçalardan (gövde, iki bacak, silah, komutanda pelerin + taç) oluşan golemler.
-- Yürüme, saldırı, vurulma parlaması, durum renkleri, ölüm. Web'deki GameScene'in birim kısmının karşılığı.
-- Konumlar web'deki gibi y aşağı; birim kökü 0.5 ölçekli olduğundan parça konumları doku pikseli (×2) cinsinden.
local U = require("main.util")
local B = require("shared.balance")
local A = require("shared.art_data")
local fx = require("main.fx")

local M = {}

local CMD_SCALE = 1.3
local GROUND_Y = U.GROUND_Y
local ART = U.ART
local STATUS_SLOW, STATUS_BURN, STATUS_AURA, STATUS_STUN, STATUS_FURY = B.STATUS_SLOW, B.STATUS_BURN, B.STATUS_AURA, B.STATUS_STUN, B.STATUS_FURY

-- parçaların koleksiyondaki z'leri (unit.collection ile aynı)
local PZ = { aura = 0, shadow = 0.00001, cape = 0.00002, legB = 0.00003, legF = 0.00004, body = 0.00005, crown = 0.00006, weapon = 0.00007, hpbg = 0.00008, hp = 0.00009, lvl = 0.0001 }
local SPRITES = { "cape", "legB", "legF", "body", "crown", "weapon" }

M.views = {} -- id → görünüm
local unit_factory
local my_side = 0

function M.init(factory_url) unit_factory = factory_url end
function M.set_side(side) my_side = side end

local function has(bits, flag) return math.floor(bits / flag) % 2 == 1 end

--- yerel (web, y aşağı, ekran birimi) → kök içi Defold konumu
local function lp(x, y, z) return vmath.vector3(x * ART, -y * ART, z) end

--- Aynalanmış konum: Defold negatif ölçeğe izin vermez; sola bakan birimde parça x'leri ve
--- dönüşleri ters çevrilir, sprite'lar hflip ile çevrilir (negatif x ölçeğiyle aynı sonuç).
local function mp(v, x, y, z) return vmath.vector3(v.sign * x * ART, -y * ART, z) end
local function mrot(v, a) return U.rot(v.sign * a) end

--- Yüz yönüne bağlı sabit parçalar: bacaklar, pelerin, taç ve sprite çevirmeleri.
local function place_static(v)
	local L = A.LAYOUT[v.arch]
	go.set_position(mp(v, -L.legGap / 2, L.hipY, PZ.legB), v.id.legB)
	go.set_position(mp(v, L.legGap / 2, L.hipY, PZ.legF), v.id.legF)
	local flip = v.sign < 0
	for _, p in ipairs(SPRITES) do sprite.set_hflip(v.url[p], flip) end
	if v.cmd then
		local cs = U.size("cape_0_a")
		go.set_position(mp(v, A.CAPE_BOX[1] + cs.w / 2, A.CAPE_BOX[2] + cs.h / 2, PZ.cape), v.id.cape)
		local ks = U.size("crown_0")
		go.set_position(mp(v, A.CROWN_BOX[1] + ks.w / 2, A.CROWN_BOX[2] + ks.h / 2, PZ.crown), v.id.crown)
	end
end

local function keys(tier, arch, team)
	return {
		body = "ub_" .. tier .. "_" .. arch .. "_" .. team,
		leg = "ul_" .. tier .. "_" .. arch,
		weapon = "uw_" .. tier .. "_" .. arch,
		cape = "cape_" .. tier .. "_" .. team,
		crown = "crown_" .. tier,
	}
end

local function set_textures(v)
	local k = keys(v.tier, v.arch, v.ally and "a" or "e")
	sprite.play_flipbook(v.url.body, k.body)
	sprite.play_flipbook(v.url.legB, k.leg)
	sprite.play_flipbook(v.url.legF, k.leg)
	sprite.play_flipbook(v.url.weapon, k.weapon)
	if v.cmd then
		sprite.play_flipbook(v.url.cape, k.cape)
		sprite.play_flipbook(v.url.crown, k.crown)
	end
	v.body_h = U.size(k.body).h
end

function M.sx(x) return my_side == 0 and x or B.WORLD_W - x end

local function draw_hp(v, u)
	local full = u.hp >= u.maxHp - 0.01 and not v.cmd
	if full then
		go.set_position(lp(0, 4000, PZ.hpbg), v.id.hpbg)
		go.set_position(lp(0, 4000, PZ.hp), v.id.hp)
		return
	end
	local w = v.cmd and 34 or (v.arch == "heavy" and 42 or 26)
	local y = -v.height - 9
	local f = U.clamp(u.hp / math.max(1, u.maxHp), 0, 1)
	-- beyaz doku 8 px: ölçek = istenen boy (ekran birimi) × ART / 8
	go.set_position(lp(0, y + 1.5, PZ.hpbg), v.id.hpbg)
	go.set_scale(vmath.vector3((w + 2) * ART / 8, 5 * ART / 8, 1), v.id.hpbg)
	go.set_position(lp(-w / 2 + w * f / 2, y + 1.5, PZ.hp), v.id.hp)
	go.set_scale(vmath.vector3(math.max(0.001, w * f * ART / 8), 3 * ART / 8, 1), v.id.hp)
end

local function apply_tint(v)
	local s = v.status
	local tint = has(s, STATUS_STUN) and 0xc8c8c8 or has(s, STATUS_SLOW) and 0x9fd8ff or has(s, STATUS_BURN) and 0xffa36b or nil
	local c = tint and U.rgb(tint) or vmath.vector4(1)
	for _, p in ipairs({ "body", "weapon", "legF", "cape", "crown" }) do go.set(v.url[p], "tint", c) end
	go.set(v.url.legB, "tint", tint and vmath.vector4(c.x * 0.75, c.y * 0.75, c.z * 0.75, 1) or U.rgb(0xbbbbbb))
end

local function flash(v)
	if v.flashing then return end
	v.flashing = true
	local on = vmath.vector4(1, 0, 0, 0)
	for _, p in ipairs(SPRITES) do go.set(v.url[p], "flash", on) end
	fx.after(0.07, function()
		v.flashing = false
		if v.dead then return end
		local off = vmath.vector4(0)
		for _, p in ipairs(SPRITES) do go.set(v.url[p], "flash", off) end
	end)
end

local function create_view(u)
	local arch = u.arch
	local L = A.LAYOUT[arch]
	local ally = u.side == my_side
	local dir = ally and 1 or -1
	local idn = tonumber(u.id) or 0
	local y = GROUND_Y + (((idn * 37) % 5) - 2) * 2.5
	local cmd = u.cmd == true
	local scale = cmd and CMD_SCALE or 1
	local depth = y + (arch == "heavy" and 0 or 0.5) + (cmd and 0.3 or 0)
	local z = U.Z(depth) + (idn % 50) * 0.0002
	local ids = collectionfactory.create(unit_factory, vmath.vector3(M.sx(u.x), U.Y(y), z), nil, nil, vmath.vector3(scale / ART, scale / ART, 1))
	local v = { id = {}, url = {}, arch = arch, tier = u.tier, ally = ally, dir = dir, cmd = cmd, scale = scale, x = M.sx(u.x), y = y, z = z,
		last_atk = u.atk, last_hp = u.hp, walk = math.random() * 6, phase = math.random() * 6, swing = 0, swing_dur = 0.3,
		flashing = false, status = 0, lvl = 0, sign = dir,
		-- vuruş hissi: vurulunca sekme, doğarken düşüş, yere inince ezilme, ağır adım tozu
		hit_t = 0, spawn_t = 1, land_t = 0, step = 0, sq = -1 }
	v.root = ids[hash("/root")]
	for name in pairs(PZ) do
		v.id[name] = ids[hash("/" .. name)]
		v.url[name] = msg.url(nil, v.id[name], name == "lvl" and "label" or "sprite")
	end
	v.body_y = L.hipY + 3
	v.height = L.bodyH - v.body_y
	set_textures(v)

	-- gölge ve aura (yumuşak leke dokusu: 64 px)
	sprite.play_flipbook(v.url.shadow, "blob")
	go.set(v.url.shadow, "tint", vmath.vector4(0, 0, 0, 0.3))
	go.set_position(lp(0, 1, PZ.shadow), v.id.shadow)
	go.set_scale(vmath.vector3(L.bodyW * 0.9 * ART / 64, 9 * ART / 64, 1), v.id.shadow)
	sprite.play_flipbook(v.url.aura, "blob")
	go.set_position(lp(0, 1, PZ.aura), v.id.aura)
	go.set_scale(vmath.vector3(L.bodyW * 1.5 * ART / 64, 16 * ART / 64, 1), v.id.aura)
	v.aura_on = cmd
	go.set(v.url.aura, "tint", U.rgb(0xffd76a, cmd and 0.45 or 0))

	place_static(v)
	go.set_position(lp(0, v.body_y - v.body_h / 2, PZ.body), v.id.body)
	local W = L.weapon
	go.set_position(mp(v, W.x, W.y, PZ.weapon), v.id.weapon)
	go.set_rotation(mrot(v, W.rot), v.id.weapon)
	if cmd then
		go.set_position(lp(0, -L.bodyH - 33, PZ.lvl), v.id.lvl)
		-- 13 px yazı (yazı tipi 36 px), kökün ölçeği dengelenir
		local k = 13 / 36 / (scale / ART)
		go.set_scale(vmath.vector3(k, k, 1), v.id.lvl)
		go.set(v.url.lvl, "color", U.css("#ffe08a"))
		go.set(v.url.lvl, "text", "")
	else
		msg.post(v.url.cape, "disable")
		msg.post(v.url.crown, "disable")
		msg.post(v.url.lvl, "disable")
	end
	go.set(v.url.hpbg, "tint", vmath.vector4(0, 0, 0, 0.55))
	go.set(v.url.hp, "tint", U.rgb(ally and 0x5be37a or 0xff5a5a))
	apply_tint(v)
	draw_hp(v, u)
	return v
end

local function swing_pose(arch, rest, p)
	if arch == "melee" then
		if p < 0.35 then return rest - 1.1 * (p / 0.35) end
		if p < 0.6 then return rest - 1.1 + 2.6 * ((p - 0.35) / 0.25) end
		return rest + 1.5 - 1.5 * ((p - 0.6) / 0.4)
	end
	if arch == "heavy" then
		if p < 0.45 then
			local k = p / 0.45
			return rest + (-2.9 - rest) * (1 - (1 - k) * (1 - k))
		end
		if p < 0.6 then return -2.9 + 2.2 * ((p - 0.45) / 0.15) end
		return -0.7 + (rest + 0.7) * ((p - 0.6) / 0.4)
	end
	return rest - math.sin(p * math.pi) * 0.25
end

-- ── saldırı efektleri ────────────────────────────────────
M.on_screen = function() return true end -- game.script bağlar
M.op_x = function(i) return 0 end
M.sfx = function() end
--- game.script bağlar: görüntüyü kısa dondurma ve öldürülen düşmandan altın uçurma
M.hitstop = function() end
M.coin = function() end

function M.hit_fx(x, y, heavy)
	fx.emit("spark", heavy and 10 or 5, x, y)
	if M.on_screen(x) then
		M.sfx(heavy and "hit_heavy" or "hit")
		if heavy then M.hitstop(0.045) end
	end
end

local function target_point(v, u)
	local tgt = u.tgt or ""
	if tgt:sub(1, 2) == "op" then
		local x = M.op_x(tonumber(tgt:sub(3)) or 0)
		return x - v.dir * 14 + (math.random() - 0.5) * 10, GROUND_Y - 14 - math.random() * (v.arch == "ranged" and 70 or 25)
	end
	if tgt == "base" then
		local fxx = v.ally and (B.WORLD_W - B.BASE_FRONT + 8 + math.random() * 20) or (B.BASE_FRONT - 8 - math.random() * 20)
		return fxx, GROUND_Y - 18 - math.random() * (v.arch == "ranged" and 100 or 30)
	end
	local tv = M.views[tgt]
	if tv then return tv.x - tv.dir * 4, tv.y - tv.height * 0.45 end
	return v.x + v.dir * 30, v.y - 20
end

local function on_attack(v, u)
	v.swing = 1
	v.swing_dur = v.arch == "heavy" and 0.55 or (v.arch == "melee" and 0.32 or 0.25)
	local tx, ty = target_point(v, u)
	if v.arch == "ranged" then
		local tipx, tipy = v.x + v.dir * 26, v.y - 26
		local ab = B.unit_def(v.tier, "ranged").ability.p
		local glow = B.tier(v.tier).palette.glow
		if ab.pierce and u.tgt ~= "base" then
			fx.beam(tipx, tipy, tx + v.dir * 90, ty, glow, 3)
			fx.emit("glow" .. v.tier, 4, tx, ty)
		else
			local dist = math.sqrt((tx - tipx) ^ 2 + (ty - tipy) ^ 2)
			local t = v.tier
			local speed = t == 2 and 650 or 800
			local arc = (t == 0 or t == 2) and math.min(80, dist * 0.18) or (t == 1 and dist * 0.06 or 0)
			fx.projectile({ key = "proj_" .. t, x0 = tipx, y0 = tipy, x1 = tx, y1 = ty, dur = math.max(0.1, dist / speed), arc = arc,
				rotate = t ~= 2 and t ~= 4, add = t >= 3, on_hit = function()
					if ab.splash and u.tgt ~= "base" then
						fx.emit("chunks" .. t, 4, tx, ty)
						fx.emit("smoke", 2, tx, ty)
						fx.emit("glow" .. t, 5, tx, ty)
						if M.on_screen(tx) then M.sfx("hit_heavy") end
					elseif ab.chain and u.tgt ~= "base" then
						M.hit_fx(tx, ty, false)
						local tv = M.views[u.tgt]
						local best, nxt = B.UNIT_CHAIN_RANGE, nil
						for _, o in pairs(M.views) do
							if o ~= tv and o.ally ~= v.ally then
								local d = math.abs(o.x - tx)
								if d <= best then best, nxt = d, o end
							end
						end
						if nxt then fx.lightning({ { x = tx, y = ty }, { x = nxt.x, y = nxt.y - nxt.height * 0.5 } }, glow) end
					else
						M.hit_fx(tx, ty, false)
					end
				end })
		end
		if M.on_screen(v.x) then M.sfx("shoot", v.tier) end
	else
		local heavy = v.arch == "heavy"
		fx.after(v.swing_dur * (heavy and 0.55 or 0.45), function() M.hit_fx(tx, ty, heavy) end)
	end
end

local function sync_view(v, u, dt, time)
	local tx = M.sx(u.x)
	local diff = tx - v.x
	v.x = math.abs(diff) > 120 and tx or v.x + diff * math.min(1, dt * 12)
	-- geri çekilirken arkasını dönüp yürür
	local sign = u.state == 3 and -v.dir or v.dir
	local yoff = v.leap_y or 0
	-- vurulunca geri seker ve ezilir; doğarken yukarıdan düşer, yere inince ezilir
	v.hit_t = math.max(0, v.hit_t - dt / 0.16)
	v.land_t = math.max(0, v.land_t - dt / 0.18)
	local k = math.sin(v.hit_t * math.pi * 0.5)
	local sq = 0.07 * k + 0.14 * v.land_t
	if v.spawn_t > 0 then
		v.spawn_t = math.max(0, v.spawn_t - dt / 0.26)
		yoff = yoff + 30 * v.spawn_t * v.spawn_t
		if v.spawn_t == 0 then
			v.land_t = 1
			if M.on_screen(v.x) then fx.emit("dust", (v.arch == "heavy" or v.cmd) and 6 or 3, v.x, v.y - 2) end
		end
	end
	go.set_position(vmath.vector3(v.x - sign * 4 * k, U.Y(v.y - yoff), v.z), v.root)
	if sq ~= v.sq then
		v.sq = sq
		go.set_scale(vmath.vector3(v.scale / ART * (1 + sq * 0.6), v.scale / ART * (1 - sq), 1), v.root)
	end
	if sign ~= v.sign then
		v.sign = sign
		place_static(v)
	end
	if v.cmd then
		if u.tier ~= v.tier then
			v.tier = u.tier
			set_textures(v)
			fx.emit("glow" .. v.tier, 20, v.x, v.y - v.height * 0.6)
		end
		if u.lvl ~= v.lvl then
			v.lvl = u.lvl
			go.set(v.url.lvl, "text", "Sv" .. u.lvl)
		end
	end
	local moving = u.state == 0 or u.state == 3
	if moving then v.walk = v.walk + dt * (v.arch == "heavy" and 7 or 11) end
	local s = math.sin(v.walk)
	-- ağır golem ve komutan her adımda toz kaldırır
	local step = s > 0 and 1 or (s < 0 and -1 or 0)
	if moving and step ~= 0 and step ~= v.step then
		v.step = step
		if (v.arch == "heavy" or v.cmd) and v.spawn_t == 0 and M.on_screen(v.x) then fx.emit("dust", 1, v.x + step * 8, v.y - 1) end
	end
	local amp = moving and 0.55 or 0
	go.set_rotation(mrot(v, s * amp), v.id.legB)
	go.set_rotation(mrot(v, -s * amp), v.id.legF)
	local bob = moving and -math.abs(math.cos(v.walk)) * 2 or math.sin(time * 4 + v.phase) * 0.7
	go.set_position(lp(0, v.body_y + bob - v.body_h / 2, PZ.body), v.id.body)

	local W = A.LAYOUT[v.arch].weapon
	local wx = W.x
	if u.atk ~= v.last_atk then
		v.last_atk = u.atk
		on_attack(v, u)
	end
	local wrot
	if v.swing > 0 then
		v.swing = math.max(0, v.swing - dt / v.swing_dur)
		local p = 1 - v.swing
		wrot = swing_pose(v.arch, W.rot, p)
		if v.arch == "ranged" then wx = W.x - math.sin(p * math.pi) * 4 end
	else
		wrot = W.rot + (moving and s * 0.12 or math.sin(time * 3 + v.phase) * 0.05)
	end
	go.set_position(mp(v, wx, W.y + bob, PZ.weapon), v.id.weapon)
	go.set_rotation(mrot(v, wrot), v.id.weapon)

	if u.hp ~= v.last_hp then
		-- yanma hasarı her karede azar azar düşer; her seferinde beyaz parlamasın
		if u.hp < v.last_hp - 0.02 * u.maxHp or (u.hp < v.last_hp and not has(u.status or 0, STATUS_BURN)) then
			flash(v)
			v.hit_t = 1
		elseif u.hp > v.last_hp and math.random() < 0.15 then
			fx.emit("heal", 1, v.x + (math.random() - 0.5) * 16, v.y - v.height * 0.5)
		end
		v.last_hp = u.hp
		draw_hp(v, u)
	end

	local status = u.status or 0
	if status ~= v.status then
		v.status = status
		if not v.flashing then apply_tint(v) end
		local fury = has(status, STATUS_FURY)
		v.aura_color = fury and 0xff5a2a or 0xffd76a
		v.aura_on = v.cmd or fury or has(status, STATUS_AURA)
		if not v.aura_on then go.set(v.url.aura, "tint", vmath.vector4(0)) end
	end
	if v.aura_on then go.set(v.url.aura, "tint", U.rgb(v.aura_color or 0xffd76a, 0.3 + math.sin(time * 6 + v.phase) * 0.15)) end
	if has(status, STATUS_BURN) and math.random() < dt * 8 then fx.emit("flame", 1, v.x, v.y - v.height * 0.4) end
	if has(status, STATUS_STUN) and math.random() < dt * 10 then
		local a = time * 12 + v.phase
		fx.emit("spark", 1, v.x + math.cos(a) * 10, v.y - v.height * v.scale - 8 + math.sin(a) * 3)
	end
	if has(status, STATUS_FURY) and math.random() < dt * 3 then fx.emit("flame", 1, v.x, v.y - 6) end
end

local function kill_view(v, animate)
	v.dead = true
	if not animate then
		go.delete(v.root, true)
		return
	end
	local x, y = v.x, v.y - v.height * 0.4
	fx.emit("chunks" .. v.tier, (v.arch == "heavy" or v.cmd) and 18 or 10, x, y)
	fx.emit("smoke", 3, x, v.y - 10)
	local visible = M.on_screen(x)
	if visible then M.sfx("death") end
	if not v.ally then
		local bounty = v.cmd and B.commander_bounty(v.tier) or B.unit_def(v.tier, v.arch).bounty
		fx.float_text(x, v.y - v.height - 14, "+" .. bounty, "#ffd34d")
		if visible then
			M.sfx("coin")
			M.coin(x, y, v.cmd and 6 or (v.arch == "heavy" and 4 or 2))
		end
	end
	if v.cmd then M.hitstop(0.06) end
	-- parçalara ayrıl: gövde, bacaklar, silah (komutanda pelerin ve taç) savrulur, seker, söner
	local away = -v.sign -- öldüren önünde: geriye doğru savrulur
	local heavy = v.arch == "heavy" or v.cmd
	local floor = U.Y(v.y)
	local off = vmath.vector4(0)
	-- savrulmayan parçalar (gölge, aura, can çubuğu, yazı; komutan değilse pelerin/taç) kökle birlikte silinir
	local rest = { v.root, v.id.aura, v.id.shadow, v.id.hpbg, v.id.hp, v.id.lvl }
	for _, p in ipairs(SPRITES) do
		if not v.cmd and (p == "cape" or p == "crown") then rest[#rest + 1] = v.id[p] end
	end
	for _, p in ipairs(SPRITES) do
		if v.cmd or (p ~= "cape" and p ~= "crown") then
			local id = v.id[p]
			go.set_parent(id, nil, true)
			go.set(v.url[p], "flash", off)
			M.debris[#M.debris + 1] = { id = id, url = v.url[p], t = 0,
				vx = away * (40 + math.random() * 90) + (math.random() * 2 - 1) * 70,
				vy = (heavy and 160 or 130) + math.random() * 170,
				vr = (math.random() * 2 - 1) * 520,
				floor = floor + 3 - math.random() * 8 }
		end
	end
	go.delete(rest)
end

M.debris = {}

--- Savrulan parçalar: yerçekimi, zeminde sekme, sönme (Defold koordinatı: y yukarı).
function M.update(dt)
	local n = #M.debris
	local i = 1
	while i <= n do
		local d = M.debris[i]
		d.t = d.t + dt
		d.vy = d.vy - 900 * dt
		local pos = go.get_position(d.id)
		pos.x = pos.x + d.vx * dt
		pos.y = pos.y + d.vy * dt
		if pos.y <= d.floor and d.vy < 0 then
			pos.y = d.floor
			d.vy = math.abs(d.vy) < 60 and 0 or -d.vy * 0.35
			d.vx = d.vx * 0.55
			d.vr = d.vr * 0.45
		end
		go.set_position(pos, d.id)
		go.set(d.id, "euler.z", go.get(d.id, "euler.z") + d.vr * dt)
		if d.t > 0.65 then go.set(d.url, "tint.w", math.max(0, 1 - (d.t - 0.65) / 0.45)) end
		if d.t > 1.1 then
			go.delete(d.id)
			M.debris[i] = M.debris[n]
			M.debris[n] = nil
			n = n - 1
		else
			i = i + 1
		end
	end
end

--- Her karede: durumdaki birimlerle görünümleri eşler.
function M.sync(st, dt, time)
	local seen = {}
	st.units:each(function(u, id)
		seen[id] = true
		local v = M.views[id]
		if not v then
			v = create_view(u)
			M.views[id] = v
			if v.ally then M.sfx("spawn") end
		end
		sync_view(v, u, dt, time)
	end)
	for id, v in pairs(M.views) do
		if not seen[id] then
			M.views[id] = nil
			kill_view(v, st.phase == "playing")
		end
	end
end

--- Komutan zıplaması (Sarsıcı Darbe): görünüm havaya kalkıp iner.
function M.leap(id, wx)
	local v = M.views[id]
	if not v then return end
	v.x = M.sx(wx) - v.dir * 40
	local up = B.CMD_LAND / 2
	v.leap_y = 0
	local t = 0
	local h
	h = timer.delay(1 / 60, true, function(_, handle, dt)
		t = t + dt
		local k = t / up
		if k < 1 then
			v.leap_y = 46 * (1 - (1 - k) * (1 - k))
		elseif k < 2 then
			local q = k - 1
			v.leap_y = 46 * (1 - q * q)
		else
			v.leap_y = 0
			timer.cancel(handle)
		end
	end)
end

function M.clear()
	for id, v in pairs(M.views) do
		v.dead = true
		go.delete(v.root, true)
	end
	M.views = {}
	for _, d in ipairs(M.debris) do go.delete(d.id) end
	M.debris = {}
end

return M
