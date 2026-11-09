-- Denge değerleri + yardımcılar. Değerler shared/balance.ts'den üretilir (balance_data.lua);
-- buradaki fonksiyonlar balance.ts'deki aynı adlı fonksiyonların Lua karşılığıdır.
-- Kademe (tier) ve derece (grade) sunucudaki gibi 0'dan başlar; Lua dizilerine erişirken +1 eklenir.
local D = require("shared.balance_data")

local M = {}
for k, v in pairs(D) do M[k] = v end

local function clamp(v, a, b)
	if v < a then return a end
	if v > b then return b end
	return v
end

--- JS Math.round ile aynı (pozitif sayılarda).
local function round(x) return math.floor(x + 0.5) end
M.round = round
M.clamp = clamp

function M.round5(n) return math.max(5, round(n / 5) * 5) end

function M.tier(t) return D.TIERS[clamp(t or 0, 0, M.MAX_TIER) + 1] end
function M.unit_def(t, arch) return M.tier(t).units[arch] end
function M.turret_def(t, g) return M.tier(t).turrets[clamp(g or 0, 0, M.TURRET_GRADE_COUNT - 1) + 1] end

local CARD_BY_ID = {}
for _, c in ipairs(D.CARDS) do CARD_BY_ID[c.id] = c end
function M.card_def(id) return CARD_BY_ID[id] end

local ADDITIVE = { turretBounce = true, specialEcho = true, outpostRegen = true }

--- Sahip olunan kartların birleşik etkisi. ids: kart kimliklerinden oluşan Lua dizisi.
function M.card_mods(ids)
	local m = {}
	for k, v in pairs(D.BASE_MODS) do m[k] = v end
	for _, id in ipairs(ids or {}) do
		local c = CARD_BY_ID[id]
		if c then
			for k, v in pairs(c.mods) do
				if ADDITIVE[k] then m[k] = m[k] + v else m[k] = m[k] * v end
			end
		end
	end
	return m
end

--- Kartlar dahil birim fiyatı.
function M.unit_cost(t, arch, mods)
	local c = M.unit_def(t, arch).cost
	if arch == "heavy" and mods and mods.heavyCost ~= 1 then return M.round5(c * mods.heavyCost) end
	return c
end

function M.outpost_upgrade_cost(from, to)
	return math.max(0, round(M.tier(to).outpost.cost - M.tier(from).outpost.cost * 0.5))
end

function M.siege_mult(time)
	if time <= M.SIEGE_TIME then return 1 end
	return 1 + (M.SIEGE_RAMP * (time - M.SIEGE_TIME)) / 60
end

--- Komutanın öldürülünce verdiği altın (sunucudaki commanderDef ile aynı hesap).
function M.commander_bounty(t)
	local value = M.unit_def(t, "heavy").cost * 1.5
	return round(value * M.BOUNTY_RATE)
end

return M
