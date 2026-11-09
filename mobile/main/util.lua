-- Ortak küçük yardımcılar: renk, koordinat dönüşümü, derinlik.
local A = require("shared.art_data")

local M = {}

M.VIEW_H = A.VIEW_H
M.GROUND_Y = A.GROUND_Y
M.ART = A.ART_SCALE

--- 0xRRGGBB → vector4 (a: saydamlık)
function M.rgb(hex, a)
	local r = math.floor(hex / 65536) % 256
	local g = math.floor(hex / 256) % 256
	local b = hex % 256
	return vmath.vector4(r / 255, g / 255, b / 255, a or 1)
end

--- "#rrggbb" → vector4
function M.css(s, a)
	return M.rgb(tonumber(s:sub(2), 16), a)
end

--- İki renk arası (0xRRGGBB)
function M.mix(a, b, t)
	local ca, cb = M.rgb(a), M.rgb(b)
	return vmath.vector4(ca.x + (cb.x - ca.x) * t, ca.y + (cb.y - ca.y) * t, ca.z + (cb.z - ca.z) * t, 1)
end

--- Web'deki (y aşağı) koordinatı Defold'a (y yukarı) çevirir.
function M.Y(y) return M.VIEW_H - y end

--- Web'deki derinlik (Phaser depth) → z
function M.Z(depth) return depth * 0.02 end

function M.rand(a, b) return a + (b - a) * math.random() end
function M.pick(t) return t[math.random(1, #t)] end
function M.clamp(v, a, b) if v < a then return a elseif v > b then return b end return v end

--- Z ekseni etrafında dönüş (web'deki açının y çevrilmiş hali)
function M.rot(angle) return vmath.quat_rotation_z(-angle) end

function M.size(key) return A.SIZES[key] end

return M
