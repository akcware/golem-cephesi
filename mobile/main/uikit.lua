-- Arayüz yapı taşları: kutu, yazı, ikon, düğme. Düğümler mutlak konumla (sol alt köşe 0,0;
-- yükseklik 720, genişlik ekran oranına göre) kurulur; dokunma testi de aynı düzlemde yapılır.
local U = require("main.util")
local I = require("shared.i18n")

local M = {}

local FONT_BASE = { big = 48, ui = 30, small = 24 }
local OUTLINE = vmath.vector4(0.08, 0.08, 0.12, 1)

M.C = {
	panel = U.rgb(0x101626, 0.82),
	panel2 = U.rgb(0x1c2640, 0.92),
	btn = U.rgb(0x2a3a5e),
	btn_hi = U.rgb(0x3d5a94),
	gold = U.rgb(0xffd34d),
	good = U.rgb(0x5be37a),
	bad = U.rgb(0xff5a5a),
	ally = U.rgb(0x3d8bff),
	foe = U.rgb(0xff4d4d),
	white = vmath.vector4(1),
	dim = U.rgb(0xaab4cc),
	black = U.rgb(0x000000, 0.55),
}

--- Yeni bir arayüz oluşturucu (her yeniden kurulumda sıfırlanır).
--- scale: küçük ekranlarda tüm arayüzü küçültür; düğüm konumları bu ölçeğe bölünmüş (sanal) düzlemdedir.
--- ox, oy: arayüzün sol alt köşesinin kaydırması (ekran çentiği / güvenli alan).
function M.new(scale, ox, oy)
	local ui = { buttons = {}, texts = {}, base = {}, fitw = {} }
	ui.root = gui.new_box_node(vmath.vector3(ox or 0, oy or 0, 0), vmath.vector3(0, 0, 0))
	gui.set_visible(ui.root, false)
	gui.set_scale(ui.root, vmath.vector3(scale, scale, 1))

	local function attach(n, parent)
		gui.set_parent(n, parent or ui.root, false)
	end
	ui.attach = attach

	function ui.group(parent)
		local n = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0))
		gui.set_visible(n, false)
		attach(n, parent)
		return n
	end

	--- x, y: merkez. o: { tex, color, slice, parent, pivot }
	function ui.box(x, y, w, h, o)
		o = o or {}
		local n = gui.new_box_node(vmath.vector3(x, y, 0), vmath.vector3(w, h, 0))
		gui.set_texture(n, "ui")
		gui.play_flipbook(n, o.tex or "ui_round")
		gui.set_size_mode(n, gui.SIZE_MODE_MANUAL)
		gui.set_size(n, vmath.vector3(w, h, 0))
		if (o.tex or "ui_round") == "ui_round" or o.tex == "ui_frame" then
			local s = o.slice or 18
			gui.set_slice9(n, vmath.vector4(s, s, s, s))
		end
		gui.set_color(n, o.color or M.C.panel)
		if o.pivot then gui.set_pivot(n, o.pivot) end
		attach(n, o.parent)
		return n
	end

	--- Doku ikonu (ui atlasından)
	function ui.icon(x, y, size, key, parent)
		local n = gui.new_box_node(vmath.vector3(x, y, 0), vmath.vector3(size, size, 0))
		gui.set_texture(n, "ui")
		gui.play_flipbook(n, key)
		gui.set_size_mode(n, gui.SIZE_MODE_MANUAL)
		gui.set_size(n, vmath.vector3(size, size, 0))
		gui.set_color(n, vmath.vector4(1))
		attach(n, parent)
		return n
	end

	--- Yazı düğümünün ölçeksiz genişliği (fontun kendi ölçüsüyle).
	local fonts = {}
	local function text_width(n)
		local name = gui.get_font(n)
		local res = fonts[name]
		if not res then
			res = gui.get_font_resource(name)
			fonts[name] = res
		end
		return resource.get_text_metrics(res, gui.get_text(n)).width
	end

	--- Tek satırlık yazı fitw[n] genişliğini aşarsa küçülür (uzun dillerde düğme yazıları taşmasın).
	local function fit(n)
		local maxw = ui.fitw[n]
		if not maxw then return end
		local k = ui.base[n]
		local w = text_width(n) * k
		local s = (w > maxw and w > 0) and k * maxw / w or k
		gui.set_scale(n, vmath.vector3(s, s, 1))
	end

	--- o: { font, size, color, pivot, parent, width (satır kaydırma), fit (en fazla genişlik, küçülterek), outline }
	function ui.text(x, y, str, o)
		o = o or {}
		local font = o.font or "ui"
		local n = gui.new_text_node(vmath.vector3(x, y, 0), str or "")
		gui.set_font(n, font)
		local k = (o.size or 20) / FONT_BASE[font]
		gui.set_scale(n, vmath.vector3(k, k, 1))
		gui.set_color(n, o.color or M.C.white)
		gui.set_outline(n, o.outline or OUTLINE)
		gui.set_shadow(n, vmath.vector4(0))
		gui.set_pivot(n, o.pivot or gui.PIVOT_CENTER)
		if o.width then
			gui.set_line_break(n, true)
			gui.set_size(n, vmath.vector3(o.width / k, 400, 0))
		end
		attach(n, o.parent)
		ui.texts[n] = str or ""
		ui.base[n] = k
		if o.fit then
			ui.fitw[n] = o.fit
			fit(n)
		end
		return n
	end

	--- Yazı değişmediyse dokunma (gereksiz yeniden çizimi önler).
	function ui.set_text(n, str)
		if ui.texts[n] ~= str then
			ui.texts[n] = str
			gui.set_text(n, str)
			fit(n)
		end
	end

	--- Düğme: kutu + (isteğe bağlı) yazı. fn dokununca çağrılır.
	--- o: { color, label, size, font, parent, modal, tex, slice }
	function ui.button(id, x, y, w, h, fn, o)
		o = o or {}
		local n = ui.box(x, y, w, h, { color = o.color or M.C.btn, parent = o.parent, tex = o.tex, slice = o.slice })
		local b = { id = id, node = n, x = x, y = y, w = w, h = h, fn = fn, enabled = true, modal = o.modal, color = o.color or M.C.btn, group = o.parent }
		if o.label then b.label = ui.text(x, y, o.label, { size = o.size or 22, font = o.font, parent = o.parent, fit = w - 14 }) end
		ui.buttons[#ui.buttons + 1] = b
		ui.buttons[id] = b
		return b
	end

	function ui.enable(b, on)
		if b.enabled == on then return end
		b.enabled = on
		local c = b.color
		gui.set_color(b.node, on and c or vmath.vector4(c.x * 0.55, c.y * 0.55, c.z * 0.55, 0.7))
		if b.label then gui.set_color(b.label, on and M.C.white or vmath.vector4(1, 1, 1, 0.45)) end
	end

	function ui.recolor(b, c)
		if b.color == c then return end
		b.color = c
		local on = b.enabled
		gui.set_color(b.node, on and c or vmath.vector4(c.x * 0.55, c.y * 0.55, c.z * 0.55, 0.7))
	end

	--- Dokunulan düğme (en son eklenen üstte). modal: şu an açık katman (nil = oyun arayüzü).
	function ui.hit(x, y, modal)
		for i = #ui.buttons, 1, -1 do
			local b = ui.buttons[i]
			if b.modal == modal and b.enabled and math.abs(x - b.x) <= b.w / 2 and math.abs(y - b.y) <= b.h / 2 then
				if not b.group or gui.is_enabled(b.group, true) then
					if gui.is_enabled(b.node, true) then return b end
				end
			end
		end
	end

	return ui
end

--- UTF-8 dizgesinin son karakterini siler.
function M.utf8_pop(s)
	local n = #s
	while n > 0 do
		local c = s:byte(n)
		n = n - 1
		if c < 0x80 or c >= 0xC0 then break end
	end
	return s:sub(1, n)
end

function M.utf8_len(s)
	local _, count = s:gsub("[^\128-\191]", "")
	return count
end

function M.fmt_time(t)
	t = math.max(0, math.floor(t))
	return string.format("%d:%02d", math.floor(t / 60), t % 60)
end

function M.fmt_num(n)
	if n >= 10000 then return I.t("num.thousand", { n = math.floor(n / 100) / 10 }) end
	return tostring(math.floor(n))
end

return M
