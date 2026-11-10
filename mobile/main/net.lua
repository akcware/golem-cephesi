-- Sunucu bağlantısı (Colyseus). Oda yalnızca game.script içinden açılır: ağ geri çağrıları
-- o betiğin bağlamında çalışır, dünya nesnelerine dokunabilir. Arayüz durumu buradan okur,
-- komutları game.script'e mesajla yollar.
local Colyseus = require("colyseus.sdk")
local I = require("shared.i18n")

local M = {
	room = nil,
	--- benim tarafım (0 solda, 1 sağda); bağlanınca dolar
	side = -1,
	session = nil,
}

local client

--- Sunucu adresi: tarayıcıda localhost'tan açıldıysa yerel geliştirme sunucusu,
--- web sürümü oyun sunucusunun kendisinden açıldıysa aynı adres, aksi halde yayındaki sunucu.
function M.endpoint()
	local prod = sys.get_config_string("golem.server", "wss://golem-forge.onrender.com")
	local dev = sys.get_config_string("golem.dev_server", "ws://localhost:2567")
	if html5 then
		local host = html5.run("location.hostname")
		if host == "localhost" or host == "127.0.0.1" then return dev end
	end
	return prod
end

local function get_client()
	if not client then client = Colyseus.Client(M.endpoint()) end
	return client
end

local function error_text(err)
	local msg = type(err) == "table" and tostring(err.message or err.error or err.code or "") or tostring(err or "")
	local low = string.lower(msg)
	if low:find("not found") or low:find("locked") or low:find("full") or low:find("invalid") then
		return I.t("net.notFound")
	end
	if msg == "" or low:find("connect") or low:find("network") or low:find("timeout") or low:find("refused") then
		return I.t("mobile.noServer")
	end
	return I.t("net.failedWith", { msg = msg })
end

--- mode: "bot" | "quick" | "private" | "join"
--- cb(err_text, room)
function M.join(opts, cb)
	if M.room then return end
	local c = get_client()
	local done = function(err, room)
		if err or not room then
			cb(error_text(err), nil)
			return
		end
		M.room = room
		M.session = room.session_id
		M.side = -1
		cb(nil, room)
	end
	local name = opts.name or I.t("player.default")
	if opts.mode == "bot" then
		c:create("battle", { mode = "bot", name = name, level = opts.level or "normal" }, done)
	elseif opts.mode == "quick" then
		c:join_or_create("battle", { mode = "quick", name = name, skill = opts.skill }, done)
	elseif opts.mode == "tutorial" then
		c:create("battle", { mode = "tutorial", name = name }, done)
	elseif opts.mode == "private" then
		c:create("battle", { mode = "private", name = name }, done)
	else
		c:join_by_id(string.upper(opts.code or ""), { name = name }, done)
	end
end

function M.send(t, payload)
	if M.room then M.room:send(t, payload or {}) end
end

function M.leave()
	local room = M.room
	M.room = nil
	M.side = -1
	if room then room:leave(true) end
end

--- Oyun durumu (yoksa nil).
function M.state()
	return M.room and M.room.state or nil
end

--- me, foe oyuncuları (side'a göre).
function M.players()
	local st = M.state()
	if not st or not st.players then return nil, nil end
	local me, foe
	st.players:each(function(p)
		if p.side == M.side then me = p else foe = p end
	end)
	return me, foe
end

return M
