-- Çeviri: t() ve oyun kimliklerinden görünen metin kuran yardımcılar.
-- shared/i18n/index.ts'nin Lua karşılığı; metinler i18n_data.lua'da (tools/export-lua.ts üretir).
-- Dil: kayıtlı seçim, yoksa cihazın dili, o da desteklenmiyorsa İngilizce.
local D = require("shared.i18n_data")
local B = require("shared.balance")

local M = {
	LANGS = D.LANGS,
	NAMES = D.NAMES,
}

local DECIMAL_COMMA = {}
for _, l in ipairs(D.DECIMAL_COMMA) do DECIMAL_COMMA[l] = true end

local current = "en"

function M.is_lang(l)
	return type(l) == "string" and D[l] ~= nil and D.NAMES[l] ~= nil
end

function M.set_lang(l)
	if M.is_lang(l) then current = l end
end

function M.get_lang() return current end

--- Desteklenen dillerde sıradaki (dil düğmesi dokundukça döner).
function M.next_lang(l)
	for i, x in ipairs(D.LANGS) do
		if x == l then return D.LANGS[i % #D.LANGS + 1] end
	end
	return D.LANGS[1]
end

--- Cihazın dili ("de", "pt-BR" …); desteklenmiyorsa İngilizce.
function M.detect()
	local info = sys.get_sys_info()
	for _, v in ipairs({ info.device_language or "", info.language or "" }) do
		local l = string.lower(v):sub(1, 2)
		if M.is_lang(l) then return l end
	end
	return "en"
end

--- Ondalık sayı dile göre (1.5 / 1,5). digits: sabit basamak (verilmezse en kısa yazım).
function M.dec(n, digits, lang)
	local s
	if digits then
		s = string.format("%." .. digits .. "f", n)
	elseif n == math.floor(n) then
		s = string.format("%d", n)
	else
		s = string.format("%.10g", n)
	end
	if DECIMAL_COMMA[lang or current] then s = s:gsub("%.", ",") end
	return s
end

-- Mobil fontlarda olmayan simgeler metinden atılır (web'de emoji olarak görünürler).
local function plain(s)
	s = s:gsub("⚠%s?", ""):gsub("🔥%s?", ""):gsub("▲%s?", ""):gsub("💡%s?", "")
	return s
end

--- key metni, {yer tutucular} doldurulmuş. Sayılar dile göre yazılır.
function M.t(key, params, lang)
	local l = lang or current
	local s = (D[l] and D[l][key]) or D.en[key] or key
	if params then
		s = s:gsub("{([%w_]+)}", function(k)
			local v = params[k]
			if v == nil then return nil end
			if type(v) == "number" then return M.dec(v, nil, l) end
			return tostring(v)
		end)
	end
	return (plain(s))
end

--- Yüzde (25 → "25%" / "%25").
function M.pct(n, lang)
	return M.t("num.pct", { n = math.floor(n + 0.5) }, lang)
end

-- ── oyun metinleri ───────────────────────────────────────
local function tier_key(t) return B.tier(t).key end

function M.tier_name(t) return M.t("tier." .. tier_key(t)) end
function M.arch_name(arch) return M.t("arch." .. arch) end
function M.unit_name(t, arch) return M.t("unit." .. tier_key(t) .. "." .. arch) end
function M.special_name(t) return M.t("special." .. tier_key(t)) end
function M.cmd_name(t) return M.t("cmd." .. tier_key(t)) end
function M.grade_name(g) return M.t("grade." .. g) end
function M.turret_name(t, g) return M.t("turret." .. tier_key(t) .. "." .. g) end
function M.card_name(id) return M.t("card." .. id) end
function M.card_desc(id) return M.t("card." .. id .. ".desc") end
function M.card_cat(cat) return M.t("cardCat." .. cat) end
function M.source_name(kind) return M.t("source." .. kind) end
function M.source_desc(kind) return M.t("source." .. kind .. ".desc") end
function M.tut_title(id) return M.t("tut." .. id .. ".title") end
function M.tut_text(id) return M.t("tut." .. id .. ".text") end
function M.tut_button(id) return M.t("tut." .. id .. ".button") end
function M.tip_text(id) return M.t("tip." .. id) end
function M.bot_name(kind) return M.t("bot." .. kind) end

--- Oyuncunun görünen adı: botlar izleyenin dilinde yazılır.
function M.player_name(p)
	if p.botKind and p.botKind ~= "" then return M.bot_name(p.botKind) end
	return p.name
end

--- Kulenin nasıl saldırdığı (shared/i18n'deki turretDesc ile aynı).
function M.turret_desc(def)
	local k = def.kind
	if k == "shot" then return M.t("turretDesc.shot") end
	if k == "lob" then return M.t((def.slow or 0) > 0 and "turretDesc.lobSlow" or "turretDesc.lob") end
	if k == "pierce" then return M.t("turretDesc.pierce", { n = def.pierce }) end
	if k == "beam" then return M.t("turretDesc.beam", { n = def.pierce }) end
	if k == "chain" then return M.t("turretDesc.chain", { n = def.chain + 1 }) end
	if k == "fire" then return M.t("turretDesc.fire", { n = def.burnDur }) end
	if k == "frost" then return M.t("turretDesc.frost", { n = def.slow }) end
	return ""
end

return M
