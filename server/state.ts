// Colyseus schema: istemcilere otomatik olarak (sadece değişen alanlar) senkronize edilen oyun durumu.
// @type ile işaretlenmeyen alanlar sadece sunucuda yaşar.
import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';
import type { UnitDef } from '../shared/balance';

export class TurretSlot extends Schema {
  @type('int8') tier = -1; // -1 = boş yuva
  @type('uint8') grade = 1; // 0 Hafif, 1 Orta, 2 Ağır
  @type('uint16') shots = 0; // her atışta artar (istemci mermi çizer)
  @type('string') tgt = '';
  cd = 0;
}

export class Player extends Schema {
  @type('string') id = '';
  @type('string') name = '';
  @type('uint8') side = 0;
  @type('boolean') isBot = false;
  @type('boolean') connected = true;
  @type('boolean') left = false;
  @type('uint32') gold = 0;
  @type('uint32') xp = 0;
  @type('uint8') tier = 0;
  @type('float32') baseHp = 0;
  @type('float32') baseMaxHp = 0;
  @type(['string']) queue = new ArraySchema<string>(); // "tier:arch"
  @type('float32') trainProgress = 0;
  @type('float32') specialCd = 0;
  @type([TurretSlot]) turrets = new ArraySchema<TurretSlot>();
  @type('string') stance = 'attack'; // 'attack' | 'hold'
  @type('boolean') wantsRematch = false;
  @type('uint16') kills = 0;
  @type('uint16') lost = 0;
  @type('uint16') trained = 0;
  @type('uint32') goldEarned = 0;
  // çağ kartları
  @type(['string']) cards = new ArraySchema<string>(); // seçilen kartlar
  @type(['string']) offer = new ArraySchema<string>(); // seçim bekleyen 3 kart
  @type('uint8') picks = 0; // kaç kart seçme hakkı var
  // Eter Öfkesi kalan süresi
  @type('float32') furyT = 0;
  // komutan
  @type('string') cmdId = ''; // hayattaysa birim id'si
  @type('float32') cmdRespawn = 0; // ölüyse geri dönmesine kalan süre
  @type('float32') cmdCd = 0; // yetenek bekleme süresi
  @type('uint8') cmdLvl = 1;
  @type('uint16') cmdKills = 0;

  // sadece sunucu
  goldF = 0;
  xpF = 0;
  earnedF = 0;
}

export class Unit extends Schema {
  @type('string') id = '';
  @type('uint8') side = 0;
  @type('uint8') tier = 0;
  @type('string') arch = 'melee';
  @type('float32') x = 0;
  @type('float32') hp = 0;
  @type('float32') maxHp = 0;
  @type('uint8') state = 0; // 0 yürüyor, 1 bekliyor, 2 saldırıyor, 3 geri çekiliyor
  @type('uint16') atk = 0; // her saldırıda artar (istemci animasyon oynatır)
  @type('string') tgt = '';
  @type('uint8') status = 0; // STATUS_* bitleri (protocol.ts)
  @type('boolean') cmd = false; // komutan mı
  @type('uint8') lvl = 0; // komutan seviyesi

  // sadece sunucu
  cd = 0;
  slowT = 0;
  stunT = 0; // sersemlemiş (yürüyemez, saldıramaz)
  def!: UnitDef;
  revived = false; // Ruh Bedeni kullanıldı mı
  shotsFired = 0; // Seri Atış için
  chargeReady = true; // Boğa Hücumu dolu mu
  walkT = 0; // hücumun yeniden dolması için yürüme süresi
  auraMul = 1; // aura hasar çarpanı
}

/** Koridordaki ele geçirilebilir nokta ve (kurulduysa) üzerindeki karakol. */
export class Outpost extends Schema {
  @type('float32') x = 0;
  @type('int8') owner = -1; // -1 tarafsız
  @type('int8') capSide = -1; // ele geçirme çubuğu kimin lehine dolu
  @type('float32') cap = 0; // 0..1
  @type('boolean') built = false;
  @type('boolean') armed = false; // üstünde kule (silah) var mı
  @type('uint8') tier = 0;
  @type('float32') hp = 0;
  @type('float32') maxHp = 0;
  @type('uint16') shots = 0;
  @type('string') tgt = '';

  // sadece sunucu
  cd = 0;
}

/** Ortanın bir yanında beliren Eter Kaynağı. */
export class EtherSource extends Schema {
  @type('boolean') active = false;
  @type('float32') x = 0;
  @type('string') kind = 'gold'; // SourceKind
  @type('float32') cap = 0; // 0..1 alma ilerlemesi
  @type('int8') capSide = -1; // ilerleme kimin lehine
  @type('float32') next = 0; // belirmesine kalan süre (sn)

  // sadece sunucu
  spot = 0; // sıradaki yer (SOURCE_XS indeksi)
}

export class BattleState extends Schema {
  @type('string') phase = 'waiting';
  @type('float32') countdown = 0;
  @type('int8') winner = -1;
  @type('string') reason = '';
  @type('string') code = '';
  @type('string') mode = 'quick';
  @type('float32') time = 0;
  @type('boolean') paused = false;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Unit }) units = new MapSchema<Unit>();
  @type([Outpost]) outposts = new ArraySchema<Outpost>();
  @type(EtherSource) src = new EtherSource();
  /** Eğitim maçında şu anki adım (-1: eğitim değil). */
  @type('int8') tut = -1;
}
