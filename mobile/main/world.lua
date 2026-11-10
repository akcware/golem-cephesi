-- Savaş alanının sabit kısımları: arka plan (paralaks), kaleler, kule yuvaları ve kuleler,
-- koridordaki karakol noktaları, Eter Kaynağı, "Savun" sancağı. Kule atışlarının görüntüsü de burada.
local U = require("main.util")
local B = require("shared.balance")
local A = require("shared.art_data")
local fx = require("main.fx")
local units = require("main.units")
local I = require("shared.i18n")

local M = {}

local GROUND_Y = U.GROUND_Y
local ART = U.ART
local CASTLE_W, CASTLE_H = A.CASTLE_W, A.CASTLE_H
local CASTLE_CX = B.BASE_FRONT + 14 - CASTLE_W / 2
local CASTLE_BOTTOM = GROUND_Y + 10
local FORT_SCALE = 0.4
local SRC_SCALE = 1.35
local SOURCE_TINT = { gold = 0xffd34d, fury = 0xff6a3d, heal = 0x7dff9a }
local HIDE = vmath.vector3(0, -100000, 0)
--- Kale çatlaklarının yeri (kale dokusunun alt-ortasına göre; web ile aynı)
local CRACK_SPOTS = {
	{ x = 78, y = -96, at = 0.66, deep = false },
	{ x = 8, y = -150, at = 0.4, deep = true },
	{ x = -62, y = -178, at = 0.2, deep = true },
}

M.WORLD_MIN = -170
M.WORLD_MAX = B.WORLD_W + 170

local F -- fabrikalar
local side = 0
local parallax = {} -- { id, x, scroll }
local clouds = {}
local castles = {} -- [ci] = { id, url, tier, label }
local slots = {} -- [ci][s] = { slot_id, tur_id, tur_url, key, shots }
local ops = {}
local src
local rally
local last_base_hp = { -1, -1 }
local last_base_fx = { 0, 0 }
local clock = 0

local function sprite_go(fac, key, x, y, depth, sx, sy)
	local id = factory.create(fac, vmath.vector3(x, U.Y(y), U.Z(depth)), nil, nil, vmath.vector3(sx or 1, sy or sx or 1, 1))
	local url = msg.url(nil, id, "sprite")
	if key then sprite.play_flipbook(url, key) end
	return id, url
end

local function text_go(x, y, depth, size, color)
	local id = factory.create(F.text, vmath.vector3(x, U.Y(y), U.Z(depth)), nil, nil, vmath.vector3(size / 36, size / 36, 1))
	local url = msg.url(nil, id, "label")
	if color then go.set(url, "color", color) end
	return id, url
end

local function move(id, x, y, depth)
	go.set_position(vmath.vector3(x, U.Y(y), U.Z(depth)), id)
end

--- Düz renkli dikdörtgen (sol üst köşe x0,y0; web koordinatı)
local function rect(x0, y0, w, h, color, alpha, depth)
	local id, url = sprite_go(F.fx, "white", x0 + w / 2, y0 + h / 2, depth, w / 8, h / 8)
	go.set(url, "tint", U.rgb(color, alpha or 1))
	return id, url
end

-- ── kurulum ──────────────────────────────────────────────
local function build_background()
	-- gökyüzü (4×720 degrade, yatayda esnetilir)
	sprite_go(F.bg, "bg_sky", (A.SKY_X0 + A.SKY_X1) / 2, 360, -100, (A.SKY_X1 - A.SKY_X0) / 4, 1)
	local sun = sprite_go(F.bg, "bg_sun", A.SUN.x, A.SUN.y, -96)
	parallax[#parallax + 1] = { id = sun, x = A.SUN.x, y = A.SUN.y, depth = -96, scroll = A.SUN.scroll }
	for _, c in ipairs(A.CLOUDS) do
		local id, url = sprite_go(F.bg, "bg_cloud_" .. c.kind, c.x, c.y, -94, c.scale, c.scale)
		if c.flip then sprite.set_hflip(url, true) end
		go.set(url, "tint", vmath.vector4(1, 1, 1, c.alpha))
		clouds[#clouds + 1] = { id = id, x = c.x, y = c.y, speed = c.speed, scroll = c.scroll }
	end
	for _, layer in ipairs(A.BG) do
		for _, p in ipairs(layer.parts) do
			local cx = p.x + p.w / 2
			local cy = (layer.y0 + layer.y1) / 2
			local id = sprite_go(F.bg, p.name, cx, cy, layer.depth, 1 / layer.scale, 1 / layer.scale)
			if layer.scroll < 1 then parallax[#parallax + 1] = { id = id, x = cx, y = cy, depth = layer.depth, scroll = layer.scroll } end
		end
	end
	-- pişmiş zeminin altı ve iki yanı düz toprak
	rect(A.SKY_X0, 780, A.SKY_X1 - A.SKY_X0, 400, A.SOIL, 1, -81)
	rect(A.SKY_X0, 532, A.GROUND_X0 - A.SKY_X0, 260, A.SOIL, 1, -81)
	rect(A.GROUND_X1, 532, A.SKY_X1 - A.GROUND_X1, 260, A.SOIL, 1, -81)
end

local function mount_pos(ci, s)
	local m = A.MOUNTS[s + 1]
	local cx = ci == 0 and CASTLE_CX or B.WORLD_W - CASTLE_CX
	local x = ci == 0 and cx - CASTLE_W / 2 + m.x or cx + CASTLE_W / 2 - m.x
	return x, CASTLE_BOTTOM - CASTLE_H + m.y
end

local function build_castles()
	for ci = 0, 1 do
		local team = ci == 0 and "a" or "e"
		local cx = ci == 0 and CASTLE_CX or B.WORLD_W - CASTLE_CX
		-- Defold negatif ölçeğe izin vermez: ayna görüntüsü sprite çevirmeyle (hflip)
		local id, url = sprite_go(F.castle, "castle_0_" .. team, cx, CASTLE_BOTTOM - CASTLE_H / 2, 5, 1 / ART, 1 / ART)
		sprite.set_hflip(url, ci == 1)
		local tid, turl = text_go(cx, CASTLE_BOTTOM - CASTLE_H - 34, 8, 20)
		castles[ci] = { id = id, url = url, tier = -1, label = turl, name = "", x = cx, cracks = {}, ruin = 0 }
		for i, sp in ipairs(CRACK_SPOTS) do
			local x, y = cx + (ci == 0 and sp.x or -sp.x), CASTLE_BOTTOM + sp.y
			local cid, curl = sprite_go(F.fx, sp.deep and "crack_1" or "crack_0", x, y, 5.5, 1 / ART, 1 / ART)
			sprite.set_hflip(curl, ci == 1)
			castles[ci].cracks[i] = { id = cid, url = curl, x = x, y = y, shown = true }
		end
		slots[ci] = {}
		for s = 0, B.MAX_SLOTS - 1 do
			local mx, my = mount_pos(ci, s)
			local ss = U.size("slot")
			local sid = sprite_go(F.fx, "slot", mx, my - 3 + ss.h / 2, 6, 1 / ART, 1 / ART)
			move(sid, mx, 100000, 6)
			-- kulenin alt kenarı yuvaya otursun: dönme noktası alt kenardan TURRET_H*(1-pivot.y) yukarıda
			local ty = my - 1 - A.TURRET_H * (1 - A.TURRET_PIVOT.y)
			local tid2, turl2 = sprite_go(F.fx, "turret_0_1", mx, ty, 7, 1 / ART, 1 / ART)
			sprite.set_hflip(turl2, ci == 1)
			slots[ci][s] = { slot = sid, tur = tid2, url = turl2, x = mx, y = ty, sy = my - 3 + ss.h / 2, key = "", shots = -1, shown = false, slot_shown = false, flip = ci == 0 and 1 or -1 }
			move(tid2, mx, 100000, 7)
		end
	end
end

local function build_outposts()
	for i = 1, #B.OUTPOST_XS do
		local x = B.OUTPOST_XS[i]
		local pole = rect(x - 32, GROUND_Y + 6 - 92, 4, 92, 0x3b3024, 1, GROUND_Y - 22)
		local bs = U.size("op_banner")
		local banner, burl = sprite_go(F.fx, "op_banner", x - 28 + bs.w / 2, GROUND_Y - 80 + bs.h / 2, GROUND_Y - 22, 1 / ART, 1 / ART)
		go.animate(banner, "scale.y", go.PLAYBACK_LOOP_PINGPONG, 0.9 / ART, go.EASING_INOUTSINE, 0.5 + (i - 1) * 0.07)
		local cs = U.size("castle_0_a")
		local fort, furl = sprite_go(F.castle, "castle_0_a", x, GROUND_Y + 8 - cs.h * FORT_SCALE / 2, GROUND_Y - 25, FORT_SCALE / ART, FORT_SCALE / ART)
		local ty = GROUND_Y + 8 - CASTLE_H * FORT_SCALE * 0.78
		local tur, turl = sprite_go(F.fx, "turret_0_0", x, ty, GROUND_Y - 24, 0.85 / ART, 0.85 / ART)
		-- çubuklar: ele geçirme / karakol canı (arka + dolgu)
		local bbg, bbgu = sprite_go(F.fx, "white", x, -1000, 1001, 1, 1)
		go.set(bbgu, "tint", vmath.vector4(0, 0, 0, 0.55))
		local bfl, bflu = sprite_go(F.fx, "white", x, -1000, 1001.1, 1, 1)
		ops[i] = { x = x, pole = pole, banner = banner, burl = burl, bx = x - 28 + bs.w / 2, fort = fort, furl = furl, fort_y = GROUND_Y + 8 - cs.h * FORT_SCALE / 2,
			tur = tur, turl = turl, ty = ty, bbg = bbg, bbgu = bbgu, bfl = bfl, bflu = bflu, shots = -1, draw = "", fkey = "", tkey = "", built = false, armed = false }
		move(fort, x, 100000, GROUND_Y - 25)
		move(tur, x, 100000, GROUND_Y - 24)
	end
end

local function build_source()
	local zone, zurl = sprite_go(F.add, "blob", 0, GROUND_Y - 4, GROUND_Y - 21.5, B.SOURCE_RADIUS * 2 / 64 * 1.15, 26 / 64)
	local gs = U.size("soft")
	local glow, gurl = sprite_go(F.add, "soft", 0, GROUND_Y - 56 * SRC_SCALE, GROUND_Y - 21.4, 6.5, 6.5)
	local ss = U.size("ether_src")
	local img, iurl = sprite_go(F.fx, "ether_src", 0, GROUND_Y + 6 - ss.h * SRC_SCALE / 2, GROUND_Y - 21.3, SRC_SCALE / ART, SRC_SCALE / ART)
	-- ödül türünün simgesi (altın / öfke / şifa)
	local lab, lurl = sprite_go(F.fx, "src_gold", 0, GROUND_Y - A.SOURCE_H * SRC_SCALE - 26, GROUND_Y - 21.2, 0.3, 0.3)
	local bbg, bbgu = sprite_go(F.fx, "white", 0, -1000, GROUND_Y - 21.1, 1, 1)
	go.set(bbgu, "tint", vmath.vector4(0, 0, 0, 0.55))
	local bfl, bflu = sprite_go(F.fx, "white", 0, -1000, GROUND_Y - 21.0, 1, 1)
	src = { zone = zone, zurl = zurl, glow = glow, gurl = gurl, img = img, iurl = iurl, lab = lab, lurl = lurl, bbg = bbg, bbgu = bbgu, bfl = bfl, bflu = bflu,
		img_y = GROUND_Y + 6 - ss.h * SRC_SCALE / 2, kind = "", bar = "", shown = true, x = 0 }
	M.hide_source()
end

local function build_rally()
	local rs = U.size("rally")
	-- doku: direk dibi (8,160) px → merkeze göre (-32, +78) px
	local x = B.BASE_FRONT + B.HOLD_DIST
	local id = sprite_go(F.fx, "rally", x + 16, GROUND_Y - 4 - 39, GROUND_Y - 20, 1 / ART, 1 / ART)
	rally = { id = id, x = x + 16, y = GROUND_Y - 4 - 39, shown = true }
	go.animate(id, "scale.y", go.PLAYBACK_LOOP_PINGPONG, 0.97 / ART, go.EASING_INOUTSINE, 0.6)
end

function M.init(f)
	F = f
	build_background()
	build_castles()
	build_outposts()
	build_source()
	build_rally()
	M.show_rally(false)
end

-- ── yardımcılar ──────────────────────────────────────────
function M.set_side(s) side = s end
function M.op_x(i) return units.sx(B.OUTPOST_XS[i + 1]) end

function M.show_rally(on)
	if rally.shown == on then return end
	rally.shown = on
	move(rally.id, rally.x, on and rally.y or 100000, GROUND_Y - 20)
end

function M.hide_source()
	if not src.shown then return end
	src.shown = false
	for _, k in ipairs({ "zone", "glow", "img", "lab", "bbg", "bfl" }) do move(src[k], 0, 100000, 0) end
end

local function bar(bg_id, fl_id, fl_url, x, y, w, h, frac, color, depth)
	go.set_position(vmath.vector3(x, U.Y(y + h / 2), U.Z(depth)), bg_id)
	go.set_scale(vmath.vector3((w + 4) / 8, (h + 4) / 8, 1), bg_id)
	go.set_position(vmath.vector3(x - w / 2 + w * frac / 2, U.Y(y + h / 2), U.Z(depth) + 0.001), fl_id)
	go.set_scale(vmath.vector3(math.max(0.001, w * frac / 8), h / 8, 1), fl_id)
	go.set(fl_url, "tint", color)
end

-- ── kule atışları ────────────────────────────────────────
--- Hattaki düşman görünümleri (origin_x'ten dışarı doğru sıralı)
local function enemy_line(origin_x, mine, range)
	local out = mine and 1 or -1
	local list = {}
	for _, v in pairs(units.views) do
		if v.ally ~= mine then
			local d = (v.x - origin_x) * out
			if d >= -30 and d <= range + 30 then list[#list + 1] = { v = v, d = d } end
		end
	end
	table.sort(list, function(a, b) return a.d < b.d end)
	local r = {}
	for i, e in ipairs(list) do r[i] = e.v end
	return r
end

local function explosion(x, y, tier, radius)
	radius = radius or 0
	local big = radius > 0 and radius / 40 or 1
	fx.emit("glow" .. tier, math.floor(8 * big + 0.5), x, y - 6)
	fx.emit("chunks" .. tier, math.floor(5 * big + 0.5), x, y)
	fx.emit("smoke", math.max(2, math.floor(2 * big + 0.5)), x, y - 8)
	if radius > 0 then fx.ring(x, y - 6, B.tier(tier).palette.glow, 0.2, 0.08, radius / 28, radius / 70, 0.32, 855) end
	if M.on_screen(x) then
		M.sfx("boom")
		if big >= 1.5 and M.duck then M.duck() end
		fx.shake(0.09, 0.0015 * math.min(2, big))
	end
end
M.explosion = explosion

local function burn_fx(x, y, r, dur)
	local n = math.floor(dur / 0.09 + 0.5)
	local h
	h = timer.delay(0.09, true, function(_, handle)
		fx.emit("flame", 2, x + (math.random() * 2 - 1) * r, y - math.random() * 6)
		n = n - 1
		if n <= 0 then timer.cancel(handle) end
	end)
end

--- t: { id, url, x, y, flip } kule görünümü; mine: benim mi; origin_x: menzilin ölçüldüğü x
local function turret_fire(t, mine, origin_x, tier, grade, tgt, range, scale_k)
	local def = B.turret_def(tier, grade)
	local rng = range or def.range
	local tv = units.views[tgt]
	if not tv then return end
	local tx, ty = tv.x, tv.y - tv.height * 0.5
	local ang = math.atan2(ty - t.y, tx - t.x)
	local rot = mine and ang or math.atan2(-(ty - t.y), -(tx - t.x))
	go.set_rotation(U.rot(rot), t.id)
	local reach = (A.TURRET_MUZZLE[grade + 1] or 38) * (scale_k or 1)
	local mx, my = t.x + math.cos(ang) * reach, t.y + math.sin(ang) * reach
	local out = mine and 1 or -1
	local pkey = "tproj_" .. tier .. "_" .. grade
	local glow = B.tier(tier).palette.glow
	local scale = 0.9 + grade * 0.25
	-- geri tepme
	go.animate(t.id, "position.x", go.PLAYBACK_ONCE_PINGPONG, t.x - math.cos(ang) * 3 * (1 + grade), go.EASING_LINEAR, 0.12)
	if M.on_screen(t.x) or M.on_screen(tx) then M.sfx("shoot", tier) end

	local kind = def.kind
	if kind == "shot" then
		local d = math.sqrt((tx - mx) ^ 2 + (ty - my) ^ 2)
		fx.projectile({ key = pkey, x0 = mx, y0 = my, x1 = tx, y1 = ty, dur = math.max(0.1, d / 1150), scale = scale, rotate = true, on_hit = function() units.hit_fx(tx, ty, false) end })
	elseif kind == "frost" then
		local d = math.sqrt((tx - mx) ^ 2 + (ty - my) ^ 2)
		fx.projectile({ key = pkey, x0 = mx, y0 = my, x1 = tx, y1 = ty, dur = math.max(0.1, d / 950), scale = scale, rotate = true, add = true, on_hit = function()
			fx.emit("glow3", 10, tx, ty)
		end })
	elseif kind == "pierce" then
		local line = enemy_line(origin_x, mine, rng)
		local last = line[math.min(#line, def.pierce)] or tv
		local ex, ey = last.x + out * 80, last.y - last.height * 0.5
		local d = math.sqrt((ex - mx) ^ 2 + (ey - my) ^ 2)
		fx.projectile({ key = pkey, x0 = mx, y0 = my, x1 = ex, y1 = ey, dur = math.max(0.1, d / 1300), scale = scale * 1.2, rotate = true })
		for i = 1, math.min(#line, def.pierce) do
			local v = line[i]
			fx.after(math.abs(v.x - mx) / 1300, function() units.hit_fx(v.x, v.y - v.height * 0.5, true) end)
		end
	elseif kind == "beam" then
		local line = enemy_line(origin_x, mine, rng)
		local last = line[math.min(#line, def.pierce)] or tv
		fx.beam(mx, my, last.x + out * 30, last.y - last.height * 0.5, glow, 4 + grade * 4)
		for i = 1, math.min(#line, def.pierce) do
			local v = line[i]
			fx.emit("glow" .. tier, 5, v.x, v.y - v.height * 0.5)
		end
		fx.flash_at(pkey, mx, my, 0.8 + grade * 0.2)
	elseif kind == "chain" then
		local pts = { { x = mx, y = my }, { x = tx, y = ty } }
		local struck = { [tv] = true }
		local cur = tv
		for _ = 1, def.chain do
			local best, nxt = B.CHAIN_RANGE, nil
			for _, v in pairs(units.views) do
				if not struck[v] and v.ally ~= mine then
					local d = math.abs(v.x - cur.x)
					if d <= best then best, nxt = d, v end
				end
			end
			if not nxt then break end
			struck[nxt] = true
			pts[#pts + 1] = { x = nxt.x, y = nxt.y - nxt.height * 0.5 }
			cur = nxt
		end
		fx.lightning(pts, glow)
		for j = 2, #pts do fx.emit("glow" .. tier, 6, pts[j].x, pts[j].y) end
	elseif kind == "lob" or kind == "fire" then
		local gx, gy = tx, tv.y - 4
		local dist = math.abs(gx - mx)
		fx.projectile({ key = pkey, x0 = mx, y0 = my, x1 = gx, y1 = gy, dur = B.LOB_TIME, arc = 90 + dist * 0.3, spin = gx >= mx and 9 or -9, scale = scale * 1.1, on_hit = function()
			explosion(gx, gy, tier, def.splash)
			if kind == "fire" then burn_fx(gx, gy, def.splash, def.burnDur) end
			if def.slow > 0 then fx.emit("glow3", 14, gx, gy - 10) end
		end })
	end
end

-- ── eşitleme ─────────────────────────────────────────────
M.on_screen = function() return true end
M.sfx = function() end

local function evolve_fx(ci, tier)
	local c = castles[ci]
	local x = ci == 0 and CASTLE_CX or B.WORLD_W - CASTLE_CX
	local y = CASTLE_BOTTOM - CASTLE_H / 2
	fx.ring(x, y, B.tier(tier).palette.glow, 0.5, 0.5, 7, 7, 0.9, 970)
	fx.emit("glow" .. tier, 50, x, y)
	M.sfx("evolve")
end

--- Kale canı azaldıkça duvarda çatlaklar belirir; yarının altında kulelerden duman, dörtte birin altında alev çıkar.
local function castle_damage(ci, frac, live)
	local c = castles[ci]
	for i, sp in ipairs(CRACK_SPOTS) do
		local cr = c.cracks[i]
		local show = live and frac < sp.at
		if show ~= cr.shown then
			cr.shown = show
			move(cr.id, cr.x, show and cr.y or 100000, 5.5)
			if show then
				fx.emit("chunks" .. math.max(0, c.tier), 8, cr.x, cr.y)
				fx.emit("dust", 4, cr.x, cr.y + 10)
			end
		end
	end
	if not live or frac >= 0.5 or clock < c.ruin then return end
	local burning = frac < 0.25
	c.ruin = clock + (burning and 0.11 or 0.24)
	local mx, my = mount_pos(ci, math.random(0, #A.MOUNTS - 1))
	local x = mx + (math.random() * 2 - 1) * 14
	if not M.on_screen(x) then return end
	fx.emit("smoke", 1, x, my - 6)
	if burning then fx.emit("flame", 2, x, my + 4) end
end

local function base_hit_fx(ci, tier)
	if clock - last_base_fx[ci + 1] < 0.14 then return end
	last_base_fx[ci + 1] = clock
	local c = castles[ci]
	-- kale sarsılır (darbe önden geldiği için içeri doğru)
	go.cancel_animations(c.id, "position.x")
	local p = go.get_position(c.id)
	p.x = c.x
	go.set_position(p, c.id)
	go.animate(c.id, "position.x", go.PLAYBACK_ONCE_PINGPONG, c.x + (ci == 0 and -3 or 3), go.EASING_LINEAR, 0.09)
	go.set(c.url, "tint", U.rgb(0xff9a9a))
	fx.after(0.09, function() go.set(c.url, "tint", vmath.vector4(1)) end)
	local fxx = ci == 0 and B.BASE_FRONT - 6 or B.WORLD_W - B.BASE_FRONT + 6
	fx.emit("chunks" .. tier, 3, fxx, GROUND_Y - 30 - math.random() * 90)
	if M.on_screen(fxx) then M.sfx("base") end
end

local function sync_players(st)
	st.players:each(function(p)
		local ci = p.side == side and 0 or 1
		local team = ci == 0 and "a" or "e"
		local c = castles[ci]
		if c.tier ~= p.tier then
			local prev = c.tier
			sprite.play_flipbook(c.url, "castle_" .. p.tier .. "_" .. team)
			if prev >= 0 and p.tier > prev then evolve_fx(ci, p.tier) end
			c.tier = p.tier
		end
		if last_base_hp[ci + 1] >= 0 and p.baseHp < last_base_hp[ci + 1] - 0.01 then base_hit_fx(ci, p.tier) end
		last_base_hp[ci + 1] = p.baseHp
		castle_damage(ci, p.baseMaxHp > 0 and p.baseHp / p.baseMaxHp or 1, st.phase == "playing" or st.phase == "ended")
		-- botların adı izleyenin dilinde
		local name = I.player_name(p)
		if c.name ~= name then
			c.name = name
			go.set(c.label, "text", name)
		end
		if ci == 0 then M.show_rally(p.stance == "hold" and st.phase ~= "ended") end

		for s = 0, B.MAX_SLOTS - 1 do
			local t = p.turrets[s + 1]
			local v = slots[ci][s]
			local slot_on = t ~= nil
			if slot_on ~= v.slot_shown then
				v.slot_shown = slot_on
				move(v.slot, v.x, slot_on and v.sy or 100000, 6)
			end
			local built = t ~= nil and t.tier >= 0
			if built then
				local key = "turret_" .. t.tier .. "_" .. t.grade
				if v.key ~= key then
					v.key = key
					sprite.play_flipbook(v.url, key)
					go.set_rotation(vmath.quat(), v.tur)
				end
			end
			if built ~= v.shown then
				v.shown = built
				move(v.tur, v.x, built and v.y or 100000, 7)
			end
			local shots = built and t.shots or -1
			if shots >= 0 and v.shots >= 0 and shots ~= v.shots then
				turret_fire({ id = v.tur, x = v.x, y = v.y }, ci == 0, ci == 0 and B.BASE_FRONT or B.WORLD_W - B.BASE_FRONT, t.tier, t.grade, t.tgt)
			end
			v.shots = shots
		end
	end)
end

local function sync_outposts(st)
	for i = 1, #ops do
		local v = ops[i]
		local o = st.outposts and st.outposts[i] or nil
		local x = M.op_x(i - 1)
		local owner = o and o.owner or -1
		local mine = owner == side
		local color = owner < 0 and 0xe6e6e6 or (mine and A.TEAM.a or A.TEAM.e)
		if v.x ~= x then
			v.x = x
			go.set_position(vmath.vector3(x - 30, U.Y(GROUND_Y + 6 - 46), U.Z(GROUND_Y - 22)), v.pole)
			v.bx = x - 28 + U.size("op_banner").w / 2
			go.set_position(vmath.vector3(v.bx, U.Y(GROUND_Y - 80 + U.size("op_banner").h / 2), U.Z(GROUND_Y - 22)), v.banner)
		end
		if v.color ~= color then
			v.color = color
			go.set(v.burl, "tint", U.rgb(color))
		end
		local built = o ~= nil and o.built
		local armed = built and o.armed
		if built then
			local team = mine and "a" or "e"
			local fk = "castle_" .. o.tier .. "_" .. team
			if v.fkey ~= fk then
				v.fkey = fk
				sprite.play_flipbook(v.furl, fk)
			end
			local tk = "turret_" .. o.tier .. "_0"
			if v.tkey ~= tk then
				v.tkey = tk
				sprite.play_flipbook(v.turl, tk)
			end
			local f = mine and 1 or -1
			if v.flip ~= f then
				v.flip = f
				sprite.set_hflip(v.furl, f < 0)
				sprite.set_hflip(v.turl, f < 0)
			end
			if armed and v.shots >= 0 and o.shots ~= v.shots and o.tgt ~= "" then
				turret_fire({ id = v.tur, x = x, y = v.ty }, mine, x, o.tier, 0, o.tgt, B.OUTPOST_RANGE, 0.85 / 2 * ART)
			end
		end
		move(v.fort, x, built and v.fort_y or 100000, GROUND_Y - 25)
		if armed ~= v.armed or built ~= v.built or v.tx ~= x then
			v.armed, v.built, v.tx = armed, built, x
			move(v.tur, x, armed and v.ty or 100000, GROUND_Y - 24)
		end
		v.shots = (o and built) and o.shots or -1
		-- çubuklar: ele geçirme ilerlemesi ya da karakol canı
		local key = ""
		if o and not built and o.cap > 0 and (o.cap < 1 or owner < 0) then
			key = "c" .. o.capSide .. string.format("%.2f", o.cap) .. x
			if key ~= v.draw then bar(v.bbg, v.bfl, v.bflu, x, GROUND_Y - 104, 46, 5, o.cap, U.rgb(o.capSide == side and A.TEAM.a or A.TEAM.e), 1001) end
		elseif o and built and o.hp < o.maxHp then
			key = "h" .. math.floor(o.hp / o.maxHp * 50) .. x .. tostring(mine)
			if key ~= v.draw then bar(v.bbg, v.bfl, v.bflu, x, GROUND_Y + 8 - CASTLE_H * FORT_SCALE - 14, 56, 4, math.max(0, o.hp / o.maxHp), U.rgb(mine and 0x5be37a or 0xff5a5a), 1001) end
		end
		if key == "" and v.draw ~= "" then
			move(v.bbg, 0, 100000, 0)
			move(v.bfl, 0, 100000, 0)
		end
		v.draw = key
	end
end

local function sync_source(st, time)
	local s = st.src
	local active = s ~= nil and s.active and st.phase == "playing"
	if not active then
		M.hide_source()
		return
	end
	local x = units.sx(s.x)
	if not src.shown or src.x ~= x then
		src.shown = true
		src.x = x
		move(src.zone, x, GROUND_Y - 4, GROUND_Y - 21.5)
		move(src.glow, x, GROUND_Y - 56 * SRC_SCALE, GROUND_Y - 21.4)
		move(src.lab, x, GROUND_Y - A.SOURCE_H * SRC_SCALE - 26, GROUND_Y - 21.2)
		src.bar = ""
	end
	-- yukarı aşağı süzülme ve parıltı
	move(src.img, x, src.img_y - 3 - math.sin(time * 2.9) * 3, GROUND_Y - 21.3)
	go.set(src.gurl, "tint", U.rgb(SOURCE_TINT[s.kind] or 0xffffff, 0.35 + (math.sin(time * 3.5) * 0.5 + 0.5) * 0.35))
	if src.kind ~= s.kind then
		src.kind = s.kind
		local tint = SOURCE_TINT[s.kind] or 0xffffff
		local c = U.mix(tint, 0xffffff, 0.35)
		go.set(src.iurl, "tint", c)
		go.set(src.zurl, "tint", U.rgb(tint, 0.35))
		sprite.play_flipbook(src.lurl, "src_" .. s.kind)
	end
	local key = s.capSide .. ":" .. string.format("%.2f", s.cap)
	if key ~= src.bar then
		src.bar = key
		if s.cap > 0 then
			bar(src.bbg, src.bfl, src.bflu, x, GROUND_Y - A.SOURCE_H * SRC_SCALE - 2, 70, 6, s.cap, U.rgb(s.capSide == side and A.TEAM.a or A.TEAM.e), GROUND_Y - 21.1)
		else
			move(src.bbg, 0, 100000, 0)
			move(src.bfl, 0, 100000, 0)
		end
	end
end

function M.sync(st, time)
	clock = time
	if not st.players then return end
	sync_players(st)
	sync_outposts(st)
	sync_source(st, time)
end

--- Bulutlar ve paralaks katmanları (kameranın sol kenarına göre).
function M.update(dt, cam_left)
	for _, c in ipairs(clouds) do
		c.x = c.x + c.speed * dt
		if c.x > B.WORLD_W + 900 then c.x = -900 end
		go.set_position(vmath.vector3(c.x + (1 - c.scroll) * cam_left, U.Y(c.y), U.Z(-94)), c.id)
	end
	for _, p in ipairs(parallax) do
		go.set_position(vmath.vector3(p.x + (1 - p.scroll) * cam_left, U.Y(p.y), U.Z(p.depth)), p.id)
	end
end

--- Odadan çıkınca başlangıç görünümüne döner.
function M.reset()
	last_base_hp = { -1, -1 }
	for ci = 0, 1 do
		local c = castles[ci]
		c.tier = -1
		c.name = ""
		c.ruin = 0
		for _, cr in ipairs(c.cracks) do
			cr.shown = false
			move(cr.id, cr.x, 100000, 5.5)
		end
		go.set(c.label, "text", "")
		sprite.play_flipbook(c.url, "castle_0_" .. (ci == 0 and "a" or "e"))
		for s = 0, B.MAX_SLOTS - 1 do
			local v = slots[ci][s]
			v.shots, v.key, v.shown, v.slot_shown = -1, "", false, false
			move(v.slot, v.x, 100000, 6)
			move(v.tur, v.x, 100000, 7)
		end
	end
	for _, v in ipairs(ops) do
		v.shots, v.draw, v.fkey, v.tkey, v.built, v.armed, v.color, v.tx, v.flip = -1, "", "", "", false, false, nil, nil, nil
		move(v.fort, v.x, 100000, 0)
		move(v.tur, v.x, 100000, 0)
		move(v.bbg, 0, 100000, 0)
		move(v.bfl, 0, 100000, 0)
		go.set(v.burl, "tint", U.rgb(0xe6e6e6))
	end
	M.hide_source()
	src.kind = ""
	M.show_rally(false)
end

--- Komutan / kaynak / özel güç gibi olayların dünya efektleri.
function M.special_fx(tier, wx0, wx1)
	local a, b = units.sx(wx0), units.sx(wx1)
	local x0, x1 = math.min(a, b), math.max(a, b)
	M.sfx("special")
	local fall = 0.4
	for _ = 1, 16 do
		local delay = math.random() * (B.SPECIAL_DELAY - fall)
		local tx = x0 + math.random() * (x1 - x0)
		local ty = GROUND_Y - 4 - math.random() * 10
		fx.after(delay, function()
			local s = 1.4 / ART
			fx.sprite({ key = "spec_" .. tier, add = tier >= 3, x = tx - 90, y = -60, depth = 820, scale = s, rot = math.atan2(ty + 60, 90) - math.pi / 2,
				to = { x = tx, y = ty }, dur = fall, ease = go.EASING_INQUAD, done = function() explosion(tx, ty, tier) end })
		end)
	end
end

return M
