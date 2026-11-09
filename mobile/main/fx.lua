-- Görsel efektler: parçacıklar, mermiler, uçan yazılar, ışın, şimşek, halka, sarsıntı.
-- Tüm konumlar web'deki gibi y aşağı koordinatta verilir; Defold'a çevirme burada yapılır.
-- Sprite'lar havuzdan alınır (her efektte yeni nesne yaratılmaz).
local U = require("main.util")
local B = require("shared.balance")

local M = {}

local F -- fabrika adresleri
local free = { [false] = {}, [true] = {} } -- saydam / toplamsal sprite havuzları
local live_count = 0
local MAX_LIVE = 700
local parts = {} -- canlı parçacıklar
local projs = {} -- uçan mermiler
local text_pool = {}
local shake = { t = 0, dur = 0, amt = 0 }
local HIDE = vmath.vector3(0, -100000, 0)

function M.init(urls)
	F = urls
end

-- ── havuz ────────────────────────────────────────────────
local function take(add)
	add = add == true
	if live_count >= MAX_LIVE then return nil end
	local list = free[add]
	local id = table.remove(list)
	if not id then id = factory.create(add and F.add or F.fx, HIDE) end
	live_count = live_count + 1
	return id, msg.url(nil, id, "sprite")
end

local function give(id, add)
	add = add == true
	go.cancel_animations(id)
	go.cancel_animations(msg.url(nil, id, "sprite"))
	go.set_position(HIDE, id)
	go.set_rotation(vmath.quat(), id)
	live_count = live_count - 1
	table.insert(free[add], id)
end

local function place(id, x, y, depth)
	go.set_position(vmath.vector3(x, U.Y(y), U.Z(depth)), id)
end

--- pw: dokunun piksel genişliği
local function pw(key) return U.size(key).pw end
local function ph(key) return U.size(key).ph end

-- ── parçacıklar ──────────────────────────────────────────
local EMIT = {
	spark = { tex = "dot", add = true, life = { 0.26, 0.26 }, speed = { 60, 190 }, angle = { 0, 360 }, scale = { 0.7, 0 }, tints = { 0xffffff, 0xfff1a8 }, depth = 950 },
	smoke = { tex = "soft", add = false, life = { 0.7, 0.7 }, speed = { 10, 40 }, angle = { 240, 300 }, scale = { 0.8, 2 }, alpha = { 0.45, 0 }, tints = { 0xd8cfc0 }, depth = 890 },
	heal = { tex = "dot", add = true, life = { 0.7, 0.7 }, vx = { -10, 10 }, vy = { -60, -25 }, scale = { 0.9, 0 }, tints = { 0x8dff9a, 0x5be37a, 0xd8ffd0 }, depth = 955 },
	dust = { tex = "soft", add = false, life = { 0.45, 0.45 }, vx = { -24, 24 }, vy = { -26, -8 }, scale = { 0.35, 0.9 }, alpha = { 0.38, 0 }, tints = { 0xd8cfc0 }, depth = 895 },
	flame = { tex = "soft", add = true, life = { 0.35, 0.65 }, vx = { -12, 12 }, vy = { -90, -40 }, scale = { 0.55, 0.1 }, alpha = { 0.9, 0 }, tints = { 0xffd27a, 0xff9a3c, 0xff5a1f }, depth = 880 },
}
for t = 0, B.MAX_TIER do
	local P = B.tier(t).palette
	EMIT["chunks" .. t] = { tex = "px", add = false, life = { 0.5, 0.9 }, speed = { 60, 230 }, angle = { 200, 340 }, gravity = 700, scale = { 1.4, 0.5 }, alpha = { 1, 0 }, spin = true, tints = { P.main, P.dark, P.light }, depth = 900 }
	EMIT["glow" .. t] = { tex = "dot", add = true, life = { 0.9, 0.9 }, speed = { 80, 280 }, angle = { 0, 360 }, scale = { 1, 0 }, tints = { P.glow, P.light }, depth = 960 }
end

--- name: "spark" | "smoke" | "heal" | "flame" | "chunksN" | "glowN"
function M.emit(name, n, x, y)
	local e = EMIT[name]
	if not e then return end
	for _ = 1, n do
		local id, url = take(e.add)
		if not id then return end
		local vx, vy
		if e.vx then
			vx, vy = U.rand(e.vx[1], e.vx[2]), U.rand(e.vy[1], e.vy[2])
		else
			local a = math.rad(U.rand(e.angle[1], e.angle[2]))
			local sp = U.rand(e.speed[1], e.speed[2])
			vx, vy = math.cos(a) * sp, math.sin(a) * sp
		end
		sprite.play_flipbook(url, e.tex)
		local c = U.rgb(U.pick(e.tints))
		go.set(url, "tint", c)
		if e.spin then go.set_rotation(vmath.quat_rotation_z(math.random() * 6.28), id) end
		local p = { id = id, url = url, add = e.add, x = x, y = y, vx = vx, vy = vy, g = e.gravity or 0, t = 0, life = U.rand(e.life[1], e.life[2]),
			s0 = e.scale[1], s1 = e.scale[2], a0 = e.alpha and e.alpha[1] or 1, a1 = e.alpha and e.alpha[2] or 1, c = c, depth = e.depth }
		parts[#parts + 1] = p
		place(id, x, y, e.depth)
		go.set_scale(p.s0, id)
	end
end

local function update_parts(dt)
	local n = #parts
	local i = 1
	while i <= n do
		local p = parts[i]
		p.t = p.t + dt
		local k = p.t / p.life
		if k >= 1 then
			give(p.id, p.add)
			parts[i] = parts[n]
			parts[n] = nil
			n = n - 1
		else
			p.vy = p.vy + p.g * dt
			p.x = p.x + p.vx * dt
			p.y = p.y + p.vy * dt
			place(p.id, p.x, p.y, p.depth)
			go.set_scale(p.s0 + (p.s1 - p.s0) * k, p.id)
			if p.a0 ~= 1 or p.a1 ~= 1 then
				p.c.w = p.a0 + (p.a1 - p.a0) * k
				go.set(p.url, "tint", p.c)
			end
			i = i + 1
		end
	end
end

-- ── tek seferlik sprite canlandırmaları ─────────────────
--- Bir sprite koyar, verilen özelliklere doğru canlandırıp sonra havuza geri verir.
--- o: { key, add, x, y, depth, scale (sayı ya da {x,y}), rot, tint (vector4), to = { scale, alpha, y }, dur, ease, delay }
function M.sprite(o)
	local id, url = take(o.add)
	if not id then return end
	sprite.play_flipbook(url, o.key)
	local tint = o.tint or vmath.vector4(1)
	go.set(url, "tint", tint)
	place(id, o.x, o.y, o.depth or 900)
	local s = o.scale or 1
	go.set_scale(type(s) == "number" and vmath.vector3(s, s, 1) or vmath.vector3(s[1], s[2], 1), id)
	if o.rot then go.set_rotation(U.rot(o.rot), id) end
	local to = o.to or {}
	local dur = o.dur or 0.3
	local ease = o.ease or go.EASING_LINEAR
	if to.scale then
		local ts = type(to.scale) == "number" and vmath.vector3(to.scale, to.scale, 1) or vmath.vector3(to.scale[1], to.scale[2], 1)
		go.animate(id, "scale", go.PLAYBACK_ONCE_FORWARD, ts, ease, dur, o.delay or 0)
	end
	if to.y then go.animate(id, "position.y", go.PLAYBACK_ONCE_FORWARD, U.Y(to.y), ease, dur, o.delay or 0) end
	if to.x then go.animate(id, "position.x", go.PLAYBACK_ONCE_FORWARD, to.x, ease, dur, o.delay or 0) end
	go.animate(url, "tint.w", go.PLAYBACK_ONCE_FORWARD, to.alpha or tint.w, ease, dur, o.delay or 0, function()
		give(id, o.add)
		if o.done then o.done() end
	end)
	return id
end

--- Genişleyip sönen halka.
function M.ring(x, y, color, sx0, sy0, sx1, sy1, dur, depth)
	M.sprite({ key = "ring", add = true, x = x, y = y, depth = depth or 970, scale = { sx0, sy0 }, tint = U.rgb(color),
		to = { scale = { sx1, sy1 }, alpha = 0 }, dur = dur, ease = go.EASING_OUTCUBIC })
end

--- Düz çizgi parçası (ışın / şimşek için): beyaz doku esnetilir.
local function segment(x0, y0, x1, y1, w, color, alpha, depth, dur, shrink)
	local len = math.sqrt((x1 - x0) ^ 2 + (y1 - y0) ^ 2)
	if len < 0.5 then return end
	local ang = math.atan2(y1 - y0, x1 - x0)
	local sx, sy = len / pw("white"), w / ph("white")
	M.sprite({ key = "white", add = true, x = (x0 + x1) / 2, y = (y0 + y1) / 2, depth = depth, rot = ang, scale = { sx, sy },
		tint = U.rgb(color, alpha), to = { alpha = 0, scale = { sx, sy * (shrink or 1) } }, dur = dur, ease = go.EASING_INQUAD })
end

--- Lazer: renkli dış ışık + beyaz çekirdek, hızla incelip söner.
function M.beam(x0, y0, x1, y1, color, width)
	segment(x0, y0, x1, y1, width * 2.2, color, 0.55, 850, 0.22, 0.2)
	segment(x0, y0, x1, y1, math.max(2, width * 0.6), 0xffffff, 1, 851, 0.22, 0.2)
end

--- Zikzak şimşek (pts: {{x=,y=},...})
function M.lightning(pts, color)
	local path = { pts[1] }
	for i = 2, #pts do
		local p0, p1 = pts[i - 1], pts[i]
		local steps = math.max(4, math.floor(math.sqrt((p1.x - p0.x) ^ 2 + (p1.y - p0.y) ^ 2) / 22 + 0.5))
		for s = 1, steps - 1 do
			local k = s / steps
			path[#path + 1] = { x = p0.x + (p1.x - p0.x) * k + (math.random() - 0.5) * 10, y = p0.y + (p1.y - p0.y) * k + (math.random() - 0.5) * 26 }
		end
		path[#path + 1] = p1
	end
	for i = 2, #path do
		local a, b = path[i - 1], path[i]
		segment(a.x, a.y, b.x, b.y, 7, color, 0.45, 850, 0.2)
		segment(a.x, a.y, b.x, b.y, 2.5, 0xffffff, 1, 851, 0.2)
	end
end

--- Namlu ucunda kısa parlama.
function M.flash_at(key, x, y, scale)
	local s = scale / U.ART
	M.sprite({ key = key, add = true, x = x, y = y, depth = 860, scale = s, to = { scale = s * 1.6, alpha = 0 }, dur = 0.16 })
end

-- ── mermiler ─────────────────────────────────────────────
--- o: { key, x0, y0, x1, y1, dur, arc, rotate, spin, add, scale, on_hit }
function M.projectile(o)
	local id, url = take(o.add)
	if not id then
		if o.on_hit then o.on_hit() end
		return
	end
	sprite.play_flipbook(url, o.key)
	go.set(url, "tint", vmath.vector4(1))
	local s = (o.scale or 1) / U.ART
	go.set_scale(vmath.vector3(s, s, 1), id)
	go.set_rotation(vmath.quat(), id)
	place(id, o.x0, o.y0, 800)
	projs[#projs + 1] = { id = id, add = o.add, x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1, t = 0, dur = o.dur, arc = o.arc or 0,
		rotate = o.rotate, spin = o.spin or 0, rot = 0, on_hit = o.on_hit }
end

local function update_projs(dt)
	local n = #projs
	local i = 1
	while i <= n do
		local p = projs[i]
		p.t = p.t + dt
		local k = math.min(1, p.t / p.dur)
		local x = p.x0 + (p.x1 - p.x0) * k
		local y = p.y0 + (p.y1 - p.y0) * k - math.sin(k * math.pi) * p.arc
		place(p.id, x, y, 800)
		if p.spin ~= 0 then
			p.rot = p.rot + p.spin * dt
			go.set_rotation(U.rot(p.rot), p.id)
		elseif p.rotate then
			go.set_rotation(U.rot(math.atan2(p.y1 - p.y0 - math.cos(k * math.pi) * math.pi * p.arc, p.x1 - p.x0)), p.id)
		end
		if k >= 1 then
			give(p.id, p.add)
			projs[i] = projs[n]
			projs[n] = nil
			n = n - 1
			if p.on_hit then p.on_hit() end
		else
			i = i + 1
		end
	end
end

-- ── uçan yazılar ─────────────────────────────────────────
function M.float_text(x, y, str, color)
	local id = table.remove(text_pool)
	if not id then id = factory.create(F.text, HIDE) end
	local url = msg.url(nil, id, "label")
	go.cancel_animations(id)
	go.cancel_animations(url)
	go.set(url, "text", str)
	local c = type(color) == "string" and U.css(color) or color
	go.set(url, "color", c)
	go.set(url, "outline", vmath.vector4(0.16, 0.1, 0, 1))
	go.set_scale(vmath.vector3(0.5, 0.5, 1), id)
	place(id, x, y, 1000)
	go.animate(id, "position.y", go.PLAYBACK_ONCE_FORWARD, U.Y(y - 36), go.EASING_OUTCUBIC, 0.9)
	go.animate(url, "color.w", go.PLAYBACK_ONCE_FORWARD, 0, go.EASING_INCUBIC, 0.9, 0, function()
		go.set_position(HIDE, id)
		table.insert(text_pool, id)
	end)
	go.animate(url, "outline.w", go.PLAYBACK_ONCE_FORWARD, 0, go.EASING_INCUBIC, 0.9)
end

-- ── sarsıntı ─────────────────────────────────────────────
--- intensity: web'deki gibi ekran genişliğine oran
function M.shake(dur, intensity)
	if intensity * 1280 >= shake.amt or shake.t >= shake.dur then
		shake.t = 0
		shake.dur = dur
		shake.amt = intensity * 1280
	end
end

function M.shake_offset()
	if shake.t >= shake.dur then return 0, 0 end
	return (math.random() * 2 - 1) * shake.amt, (math.random() * 2 - 1) * shake.amt
end

function M.after(sec, fn)
	return timer.delay(sec, false, fn)
end

function M.update(dt)
	shake.t = shake.t + dt
	update_parts(dt)
	update_projs(dt)
end

--- Maç bitince/ayrılınca uçan her şeyi temizler.
function M.clear()
	for i = #parts, 1, -1 do
		give(parts[i].id, parts[i].add)
		parts[i] = nil
	end
	for i = #projs, 1, -1 do
		give(projs[i].id, projs[i].add)
		projs[i] = nil
	end
end

return M
