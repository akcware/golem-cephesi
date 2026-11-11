# Golem Forge: independent ASO review (pre-submission, v1.0.0)

Reviewed:
- `aso/metadata-{en,tr,de,es,fr,pt}.md`, `aso/captions.json`
- `preview/{en,tr}.jpg`, plus full-size slide 1 (en) and slide 4 (en/tr/de/es/fr/pt iPhone, en iPad)
- `shared/i18n/en.ts`, `shared/balance.ts`, `server/BattleRoom.ts`, `server/personas.ts` (quick-match fill-in)
- `mobile/README.md`, `asc/publish.mjs`

Nothing else was changed. All character counts are Unicode code points, computed by script. The same script checks
case- and accent-folded word overlap inside each locale (name, subtitle and keyword field). Every proposed set below
passes all of these checks:
- no field over its limit
- no keyword that repeats a name or subtitle word
- no duplicates
- no spaces after commas

## Verdict

**No hard submission blocker.**

**Accuracy is good.** I checked the claims against the code (`balance.ts`, `BattleRoom.ts`) and the in-game strings
(`i18n`):
- 1.5× counters
- +25% income per point
- 15 cards, 3 offered per pick
- 15 golems
- Doom Clock at 15:00 (`SIEGE_TIME = 15*60`)
- 3–4 minute tutorial
- internet required for every mode

The AI fill-in is honestly disclosed in every description.

**Why the P1 items should go in before you press Submit.** Name, subtitle, keywords, and any newly added localization
change only with a new app version. Anything you skip now waits for 1.0.1.

Biggest gaps:
1. **No en-GB localization.** That leaves English searches in every European, Latin American and Turkish storefront
   without a dedicated English keyword pool.
2. **The keyword fields spend roughly a fifth of their characters on low-intent words** (`siege`, `commander`, `taktik`,
   `kart`, `comandante`…), or on English words that en-GB should carry.
3. **The listing never says "no ads / no in-app purchases / no account".** That is the strongest buying argument this
   game has against the ad- and IAP-funded games it competes with.

---

## How indexing works here (facts this review relies on)

### Which fields count
- **Indexed:** name, subtitle and keyword field.
- **Not indexed:** promotional text. Apple says so explicitly.
- **Apple's keyword rules:**
  - don't repeat words
  - don't add plurals of words already present
  - don't add category names or "app"
  - no trademarks or competing app names
  - commas only, no spaces

  Sources: [Apple: product page](https://developer.apple.com/app-store/product-page/) and
  [Review Guideline 2.3.7](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata).
- **Your keyword fields** contain none of "game(s)", "strategy" or "app". Good.
- **"Strategy" in visible fields.** The category word does appear in the en subtitle, the tr and de subtitles, and the
  es/fr/pt names. Apple's "avoid category names" advice is about saving keyword-field characters, not visible fields.
  My position: keep it there. It tells a browsing user the genre in the most-read spot, and it forms phrases inside the
  locale ("pvp strategy", "estrategia online"). The cost is 10–11 characters of the es/fr/pt name. The localized
  castle-war phrase doesn't fit next to the brand anyway (32 and 31 characters).

### Which localizations each storefront uses
Apple's [App Store localizations table](https://developer.apple.com/help/app-store-connect/reference/app-store-localizations/)
lists these languages per storefront:

| Storefront | Default language | Additional languages |
|---|---|---|
| United States | English (U.S.) | Spanish (Mexico), French, Portuguese (Brazil), Arabic, Chinese (both), Korean, Russian, Vietnamese |
| United Kingdom | English (U.K.) | none |
| Germany, France, Spain, Mexico, Brazil, Portugal, Türkiye, Austria, Argentina, Colombia | own language | English (U.K.) |
| Canada | English (Canada) | French (Canada) |

The default language in Mexico, Argentina and Colombia is Spanish (Mexico).

Apple frames this table as which language is *shown*. That those localizations are also *indexed for search* is
industry observation from two sources:
- [MobileAction, Apr 2026](https://www.mobileaction.co/blog/app-store-cross-localization/): the same table, and it also
  states that phrases only form inside one localization.
- [AppTweak, updated Nov 2025](https://www.apptweak.com/en/aso-blog/how-to-benefit-from-cross-localization-on-the-app-store):
  tests from 2022. Its table matches except for Türkiye, where it adds French.

**Confidence:** medium-high. Verify after launch with App Store Connect search-term data.

### Fallbacks
Apple's [localize app information](https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information/)
page says two things that matter here:
- Where no localization matches the customer's language, the **primary language** is shown.
- A newly added localization's **screenshots default to the primary language's**. The description and keywords do not.

I assume your primary language is English (U.S.); check App Information in App Store Connect.

### What that means for you
| Storefront | Indexed now | After P1 |
|---|---|---|
| United States | en-US + es-MX + fr-FR + pt-BR | same, with en-US improved |
| United Kingdom | no en-GB, so your primary language (en-US) | **en-GB** |
| Germany / Austria | de-DE | de-DE + **en-GB** |
| France | fr-FR | fr-FR + **en-GB** |
| Spain | es-ES | es-ES + **en-GB** |
| Mexico, Argentina, Colombia | es-MX | es-MX + **en-GB** |
| Brazil | pt-BR | pt-BR + **en-GB** |
| Türkiye | tr | tr + **en-GB** |

### Is es-MX as a copy of es-ES a waste?
**For the US, partly.** It adds Spanish-language search for US Spanish speakers, which is real but small. The US also
already indexes your fr-FR and pt-BR text.

**But it is not a spare slot.** es-MX is the *displayed and primary-indexed* listing in Mexico, Argentina, Colombia, and
very likely the other Spanish-speaking Latin American storefronts. So it must stay good Spanish.

Turning its keyword field into English overflow for the US would buy almost nothing:
- en-US already covers the English terms.
- English words placed in es-MX can't pair with en-US words.
- Latin America's English searches are covered by en-GB once you add it.

**Recommendation:** keep es-MX Spanish, with its own slightly tuned keyword field (P1-3). The real cross-localization win
is **en-GB**.

### Demand evidence: method and limits
I have no search-volume data. As a proxy, I ran each candidate term through the public iTunes Search API per country on
2026-11-11. I read which apps come back, their rating counts, and how competitors with real rating counts title their
localized listings. Everything below is inferred, not volume.

- **US**
  - "age of war" and "war evolution" return your direct competitors: *Age of War*, *Age Of War 2*, *We Are Warriors!*
    (56k ratings) and *Stick War: Legacy*.
  - "siege" is Rainbow Six Siege and Fortnite: wrong intent.
  - "td" and "rts" appear in many rated competitor titles ("Kingdom Rush Tower Defense TD", "Art Of War 3:RTS…",
    "Clash of Dots – 1v1 RTS").
  - "turret defense" and "base defense" return tower-defense games.
  - "golem" returns only 5 apps and no strategy game, so the brand query is easy to own.
- **Germany**
  - Well-rated titles use "Turmverteidigung" (*Raid Rush*, 5.7k ratings), "Tower Defense" and "Strategiespiel(e)"
    (*Tower War – Strategiespiel*, 20.5k; *Art of War 3: Strategiespiele*, 2k).
  - Six titles use "Burgverteidigung", but all have 0–24 ratings: a weak signal.
  - "Kriegsspiele" titles are shooters: wrong intent.
- **Spain / Mexico:** rated titles use **"Defensa de Torres"** (*Raid Rush*, *Rush Royale*). "guerra de castillos"
  returns scattered, weak matches.
- **France:** titles use **"Défense de tour(s)"** and "Jeux de défense". "guerre de châteaux" is weak.
- **Brazil:** titles use **"Defesa de Torre"**. "guerra de castelos" is weak.
- **Türkiye**
  - "kule savunma" and "kale savunma" return dense tower-defense clusters.
  - "taktik" returns football tactics boards: wrong intent.
  - "2 kişilik" maps to "2 Player Games" apps.

---

## P1: do before Submit (locked to the version, clear gain or lower risk)

### P1-1 · Add an **en-GB** localization (new)
**Why:** en-GB is the extra indexed localization in DE, AT, FR, ES, MX, AR, CO, BR, PT and TR, and the only one in the
UK. Without it, English searches in those storefronts ("tower defense", "rts", "pvp", "1v1", "multiplayer") depend on
English words your native fields spend characters on.

**It must be a complete listing.** Once added, it is what UK users see, and what English-language devices see in
storefronts that list English (U.K.).
- Copy the en-US description and promo text into it.
- Screenshots default to the primary language's.

**Default set** (current en-US name and subtitle, so the English listing stays consistent):

| Field | Proposed | Chars |
|---|---|---|
| Name | `Golem Forge: Castle War` | 23 |
| Subtitle | `PvP Army Strategy & Defense` | 27 |
| Keywords | `tower,td,rts,real,time,lane,battle,multiplayer,online,friend,1v1,turret,base,evolution,defence,troop` | 100 |

`defence` catches the UK spelling. Inside en-GB, "tower" from the keywords plus "Defense" from the subtitle forms
"tower defense", which matters in every non-English storefront.

**Implementation note:** `publish.mjs` maps `en` → `['en-US']` and `es` → `['es-ES','es-MX']`, one file each. en-GB and a
distinct es-MX keyword field need a per-locale override, for example a `metadata-en-GB.md` or a keywords map. I did not
edit the script.

### P1-2 · en-US keyword field (subtitle unchanged)
| Field | Current | Proposed |
|---|---|---|
| Name | `Golem Forge: Castle War` (23) | keep |
| Subtitle | `PvP Army Strategy & Defense` (27) | keep (for a tower-defense subtitle, see the P2-2 decision) |
| Keywords | `tower,td,battle,rts,lane,siege,multiplayer,online,friend,1v1,troop,commander,fantasy,duel,evolution` (99) | `tower,td,rts,real,time,lane,battle,multiplayer,online,friend,1v1,turret,base,evolution,fantasy,troop` (100) |

**Removed:**
- `siege`: the search intent is Rainbow Six Siege and Fortnite.
- `commander`: low intent for this game.
- `duel`: overlaps `1v1`, low value.

**Added:**
- `real` and `time`: form "real time strategy" with the subtitle's "strategy".
- `turret`: the in-game word; "turret defense" returns tower-defense games.
- `base`: "base defense" is a live tower-defense query.

**Kept:**
- `td`, `rts`, `1v1`: used in rated competitor titles.
- `evolution`: "war evolution" returns your competitor cluster.

**Wasted characters now:** about 21, on `siege`, `commander` and `duel`.

**2.3.7 check (name and subtitle): pass.** No price, no "free", no "best/#1", no competitor name.

### P1-3 · Native keyword fields (current subtitles kept)
These sets assume en-GB is added (P1-1), so `rts` and English loanwords leave the native fields. The no-en-GB fallback is
given for each.

#### tr (Türkiye)
- **Name / subtitle:** keep `Golem Forge: Kale Savaşı` (24) / `Gerçek Zamanlı Online Strateji` (30).
- **Current keywords:** `savaş,pvp,ordu,kule,savunma,taktik,kuşatma,arkadaş,kişilik,çok,oyunculu,rts,asker,kart,çağ,komutan` (98)
- **Proposed keywords:** `savaş,pvp,ordu,kule,savunma,kuşatma,arkadaşla,iki,2,kişilik,çok,oyunculu,çağ,fetih,krallık,düello` (97)

**Removed:**
- `taktik`: results are football tactics apps.
- `kart`: card-game intent; this isn't a card game.
- `komutan`: low value.
- `asker`: results are military shooters.
- `rts`: en-GB carries it.

**Added:**
- `iki` and `2`: complete "2 kişilik" and "iki kişilik" (2-player games). `kişilik` alone couldn't form either.
- `arkadaşla`: the "arkadaşla oyna" form. Turkish stemming is undocumented.
- `fetih`: conquest.
- `krallık`: kingdom.
- `düello`: duel.

**Kept:**
- `savaş`: correctly separate from "Savaşı".
- `çağ`: forms "çağ savaşı" with the name.

**Without en-GB:** swap `düello` for `rts` (94).

**2.3.7 check: pass.**

#### de-DE (Germany, Austria). Low-to-medium confidence
- **Name / subtitle:** keep `Golem Forge: Krieg der Burgen` (29) / `PvP-Strategie in Echtzeit` (25).
- **Current keywords:** `tower,defense,turm,verteidigung,schlacht,armee,online,mehrspieler,freunde,belagerung,taktik,burg,rts` (100)
- **Proposed keywords:** `turmverteidigung,strategiespiel,verteidigung,turm,burg,schlacht,armee,mehrspieler,belagerung,freunde` (100)

**Added:**
- `turmverteidigung` and `strategiespiel`: the compounds rated German competitors title with. Apple is not documented
  to split German compounds.
- `turm` + `verteidigung` and `burg` + `verteidigung` still cover the spaced spellings.

**Moved to en-GB:** `tower`, `defense`, `rts`, `online` ("online" is the same word in both languages).

**Removed:** `taktik` (low).

**Not added:**
- `kriegsspiel`: shooter intent.
- `burgverteidigung`: weak evidence.

**Kept:** `burg`, correctly kept next to "Burgen" because German plural handling is undocumented.

**Without en-GB:** `tower,defense,turmverteidigung,strategiespiel,turm,verteidigung,burg,schlacht,armee,online,rts` (94).

**2.3.7 check: pass.** "der" and "in" are stop words (3 characters each), acceptable for natural German.

#### es-ES (Spain)
- **Name / subtitle:** keep `Golem Forge: Estrategia PvP` (27) / `Guerra de castillos online` (26).
- **Current keywords:** `torres,defensa,ejército,batalla,multijugador,amigos,asedio,tiempo,real,rts,tropas,comandante,duelo` (98)
- **Proposed keywords:** `torres,defensa,ejército,batalla,multijugador,amigos,asedio,tiempo,real,tropas,torreta,fortaleza` (95)

**Removed:**
- `comandante`: low.
- `rts`: en-GB carries it.
- `duelo`: low.

**Added:**
- `torreta`: the in-game word.
- `fortaleza`.

**Without en-GB:** append `rts` (99).

**2.3.7 check: pass.** See "Which fields count" for "Estrategia" in the name.

#### es-MX (Mexico and Latin America; secondary in the US)
- **Name / subtitle:** keep, identical to es-ES.
- **Proposed keywords:** `torres,defensa,ejército,batalla,multijugador,amigos,asedio,tiempo,real,tropas,torreta,línea,duelo` (97)

**Difference from es-ES:**
- `línea` covers the Latin American "juegos en línea" phrasing next to "online".
- `duelo` takes the place of `fortaleza`.

No English is added; see "Is es-MX as a copy of es-ES a waste?" for why.

#### fr-FR
- **Name / subtitle:** keep `Golem Forge : Stratégie PvP` (27) / `Guerre de châteaux en ligne` (27).
- **Current keywords:** `tower,défense,tour,armée,bataille,multijoueur,amis,siège,temps,réel,rts,troupes,commandant,duel,1v1` (99)
- **Proposed keywords:** `défense,tour,armée,bataille,multijoueur,amis,siège,temps,réel,troupes,tourelle,duel,1v1,forteresse` (98)

**Removed:**
- `tower` and `rts`: en-GB carries them.
- `commandant`: low.

**Added:**
- `tourelle`: the in-game word.
- `forteresse`.

**Without en-GB:** `tower,défense,tour,armée,bataille,multijoueur,amis,siège,temps,réel,troupes,tourelle,1v1,forteresse` (99).

**2.3.7 check: pass.**

#### pt-BR
- **Name / subtitle:** keep `Golem Forge: Estratégia PvP` (27) / `Guerra de castelos online` (25).
- **Current keywords:** `torre,defesa,exército,batalha,multiplayer,amigos,cerco,tempo,real,rts,tropas,comandante,duelo,1v1` (97)
- **Proposed keywords:** `torre,defesa,exército,batalha,multiplayer,amigos,cerco,tempo,real,tropas,duelo,fortaleza,conquista` (98)

**Removed:**
- `comandante`: low.
- `rts` and `1v1`: en-GB carries them.

**Added:**
- `conquista`: you capture points.
- `fortaleza`.

**Kept:** `multiplayer`. Brazilians use the English word, and it forms "estratégia multiplayer" with the name.

**Without en-GB:** swap `conquista` for `rts,1v1` (96).

**2.3.7 check: pass.**

### P1-4 · Tell App Review about the Quick Match fill-in
How the fill-in works (`server/BattleRoom.ts`, `server/personas.ts`):
- It joins after 5–18 seconds.
- It uses a gamertag-style name, a region, and "tilt" and rematch behaviour.
- It is **not** labelled "(bot)" in the HUD (`shown = false`).

The store descriptions disclose it. The review notes in `publish.mjs` do not. A reviewer testing on one device gets an
unlabelled AI opponent. Say so up front so it can't read as misleading (Guideline 2.3.1).

**Append to `REVIEW_NOTES`:**
```text
Quick Match: we first look for another player. If nobody is found within about 5–18 seconds, an AI opponent joins so
nobody waits forever; the App Store description states this. To test real player-vs-player, use "Create Room" on one
device and enter the 4-letter code with "Join" on a second device (or in a browser at https://golem-cephesi.onrender.com).
```

---

## P2: should do

### P2-1 · Promotional text: lead with the no-ads / no-IAP / no-account promise
The promo text is the first thing a visitor reads in the description area. The current texts list features without a
reason to pick this game over ad- or IAP-funded rivals.

The new line is factual and allowed: no price, no "free", no "best". Keep it only while it stays true. Promo text can be
edited at any time without a release.

| Lang | Current | Proposed | Chars |
|---|---|---|---|
| en | `Forge a golem army, advance from Wood to Aether across 5 ages and pick a card at every age-up. Invite a friend with a room code or face the bot on 3 difficulty levels.` (167) | `No ads. No in-app purchases. No account. Forge a golem army, climb 5 ages from Wood to Aether and crush the enemy castle, or send a friend a 4-letter code and duel.` | 164 |
| tr | `Golem ordunu sür, Ahşap'tan Eter'e 5 çağ atla, her çağda bir kart seç. Arkadaşını oda koduyla çağır ya da Kolay, Normal, Zor botlara karşı oyna!` (144) | `Reklam yok, uygulama içi satın alma yok, hesap yok. Golem ordunu kur, Ahşap'tan Eter'e 5 çağ atla, rakip kaleyi yık. Ya da arkadaşına 4 harfli kodu gönder, kapışın!` | 164 |
| de | `Gieß eine Golem-Armee, steig in 5 Ären von Holz bis Äther auf und wähl bei jedem Aufstieg eine Karte. Fordere Freunde per Raumcode heraus oder tritt gegen den Bot an.` (166) | `Keine Werbung, keine In-App-Käufe, kein Konto. Gieß Golems, steig in 5 Ären von Holz bis Äther auf und zerschmettere die Burg – oder fordere Freunde per Code heraus.` | 165 |
| es | `Forja un ejército de gólems, avanza de Madera a Éter en 5 eras y elige una carta en cada una. Reta a un amigo con un código de sala o juega contra el bot.` (154) | `Sin anuncios, sin compras en la app, sin cuenta. Forja un ejército de gólems, avanza 5 eras de Madera a Éter y aplasta el castillo rival, o reta a un amigo con un código.` | 170 |
| fr | `Forge une armée de golems, traverse 5 âges du Bois à l’Éther et choisis une carte à chaque nouvel âge. Défie un ami avec un code de salon ou affronte le bot.` (157) | `Sans pub, sans achats intégrés, sans compte. Forge une armée de golems, traverse 5 âges du Bois à l’Éther et écrase le château ennemi, ou défie un ami avec un code.` | 164 |
| pt | `Forje um exército de golens, avance da Madeira ao Éter em 5 eras e escolha uma carta a cada era. Desafie um amigo com o código da sala ou jogue contra o bot.` (157) | `Sem anúncios, sem compras no app, sem cadastro. Forje um exército de golens, suba 5 eras da Madeira ao Éter e esmague o castelo rival, ou desafie um amigo com um código.` | 169 |

### P2-2 · Owner decisions (version-locked; each has a real trade-off)

**(a) A localized "tower defense" phrase in the subtitles.**

Upside:
- In es/fr/pt/tr, rated competitors title their games with the localized tower-defense phrase. The current "castle war"
  phrases return weak matches.
- The phrase is literally accurate: turrets are named "Arrow Tower", "Torre de flechas", "Tour à flèches" and "kule",
  and the pt UI calls them "torres".
- In en-US it also takes "PvP" out of the subtitle (see P2-5).

Downside, and the reason the original author left it out on purpose:
- The game is a lane battler, not a path-and-maze tower-defense game.
- Tower-defense purists who install expecting the classic format may churn or rate it lower.
- Age-of-War-style games are commonly filed under tower defense, so the mismatch is moderate, not severe.

If you take it, use these paired sets. Each is verified, and each assumes en-GB is added:

| Locale | Subtitle (chars) | Keywords (chars) |
|---|---|---|
| en-US | `Army Strategy & Tower Defense` (29) | `pvp,td,rts,real,time,lane,battle,multiplayer,online,friend,1v1,turret,base,evolution,fantasy,troop` (98) |
| en-GB | `Army Strategy & Tower Defense` (29) | `pvp,td,rts,real,time,lane,battle,multiplayer,online,friend,1v1,turret,base,evolution,defence,troop` (98) |
| tr | `Online Strateji & Kule Savunma` (30) | `savaş,pvp,ordu,kuşatma,arkadaş,arkadaşla,iki,2,kişilik,çok,oyunculu,çağ,fetih,krallık,düello,asker` (98) |
| es-ES | `Defensa de torres y castillos` (29) | `guerra,online,ejército,batalla,multijugador,amigos,asedio,tiempo,real,tropas,torreta,duelo,fortaleza` (100) |
| es-MX | `Defensa de torres y castillos` (29) | `guerra,online,línea,ejército,batalla,multijugador,amigos,asedio,tiempo,real,tropas,torreta,fortaleza` (100) |
| fr-FR | `Défense de tour et de château` (29) | `guerre,ligne,armée,bataille,multijoueur,amis,siège,temps,réel,troupes,tourelle,duel,forteresse,1v1` (98) |
| pt-BR | `Defesa de torre e castelo` (25) | `guerra,online,exército,batalha,multiplayer,amigos,cerco,tempo,real,tropas,duelo,fortaleza,conquista` (99) |

The words dropped from each old subtitle ("guerra/online", "guerre/en ligne", "gerçek zamanlı") move into the keyword
fields where they still matter. de-DE stays as in P1-3.

My lean: take it for en and tr, where "tower" and "kule" are the in-game words. For es, fr and pt it is a closer call.

Product Page Optimization can't A/B test subtitles; it only tests icons, screenshots and previews. So revisit the call
using App Store Connect search terms a few weeks after launch.

**(b) Adding `age` to en-US.**

Upside:
- With "war" already in the name, the single generic word `age` makes you eligible for "age of war" searches.
- That query returns your exact competitors.
- The word is accurate: the game has 5 ages.

Downside:
- Its main effect is to target a live app's title, [*Age of War*](https://apps.apple.com/app/id964911178). The
  "popular app names" clause of 2.3.7 is aimed at exactly that.
- The practical rejection risk is low, since reviewers flag full names, not single common words.
- The original listing left it out on purpose.

If you want it, use this en-US field (with the current subtitle; `fantasy` swapped for `age`):
`tower,td,rts,real,time,lane,battle,multiplayer,online,friend,1v1,turret,base,evolution,age,troop` (96).

Leaving it out blocks nothing.

### P2-3 · Description opener (first paragraph)
iOS doesn't index the description, but it is what people read after tapping "more". On Google Play it is indexed and is
the main conversion text. The current openers start with a category label.

Replace the first paragraph in each language. The rest stays as is. Mirror the change into the Google Play full
descriptions.

- **en**
  - Current: `Golem Forge is a real-time strategy game of castle war. Two alchemists forge golem armies and send them down the same battle corridor. Your goal: crush the enemy castle in a live 1v1 match.`
  - Proposed: `Forge golems, send them down the battle lane and smash the enemy castle before yours falls. Golem Forge is real-time 1v1 strategy with a tower-defense twist: train an army, build turrets on your castle, evolve through 5 ages and outplay your rival.`
  - Then a new line: `No ads, no in-app purchases, no account needed.`
- **tr**
  - Current: `Golem Forge, online oynanan gerçek zamanlı bir strateji ve kale savaşı oyunu. İki simyacı golem ordularını döküp aynı koridora sürer. Amaç basit: rakip kaleyi 1'e 1 maçta yıkmak.`
  - Proposed: `Golemlerini dök, cepheye sür, kalen düşmeden rakip kaleyi yık. Golem Forge, kule savunma dokunuşlu, 1'e 1 gerçek zamanlı bir strateji oyunu: ordunu kur, kalene kule dik, 5 çağ boyunca güçlen ve rakibini alt et.`
  - Then a new line: `Reklam yok, uygulama içi satın alma yok, hesap gerekmez.`
- **de**
  - Current: `Golem Forge ist ein Echtzeit-Strategiespiel um Burgen und Armeen. Zwei Alchemisten gießen Golem-Armeen und schicken sie durch denselben Korridor in die Schlacht. Dein Ziel: die gegnerische Burg im Duell 1 gegen 1 zerschmettern.`
  - Proposed: `Gieß Golems, schick sie durch den Korridor und zerschmettere die feindliche Burg, bevor deine fällt. Golem Forge ist Echtzeit-Strategie im Duell 1 gegen 1 mit Tower-Defense-Elementen: Stell eine Armee auf, bau Türme an deiner Burg, steig durch 5 Ären auf und überliste deinen Gegner.`
  - Then a new line: `Keine Werbung, keine In-App-Käufe, kein Konto nötig.`
- **es**
  - Current: `Golem Forge es un juego de estrategia en tiempo real y guerra de castillos. Dos alquimistas forjan ejércitos de gólems y los lanzan por el mismo corredor. Tu objetivo: aplastar el castillo enemigo en un duelo 1 contra 1.`
  - Proposed: `Forja gólems, lánzalos por el corredor y aplasta el castillo enemigo antes de que caiga el tuyo. Golem Forge es estrategia en tiempo real 1 contra 1 con un toque de defensa de torres: forma un ejército, construye torretas en tu castillo, avanza 5 eras y supera a tu rival.`
  - Then a new line: `Sin anuncios, sin compras dentro de la app y sin cuenta.`
- **fr**
  - Current: `Golem Forge est un jeu de stratégie en temps réel où deux châteaux se font la guerre. Deux alchimistes forgent des armées de golems et les envoient dans le même couloir. Ton objectif : écraser le château ennemi en duel, en 1 contre 1.`
  - Proposed: `Forge des golems, envoie-les dans le couloir et écrase le château ennemi avant que le tien ne tombe. Golem Forge est un jeu de stratégie en temps réel en 1 contre 1, avec une touche de défense de tour : forme ton armée, construis des tourelles sur ton château, traverse 5 âges et surpasse ton adversaire.`
  - Then a new line: `Sans pub, sans achats intégrés, sans compte.`
- **pt**
  - Current: `Golem Forge é um jogo de estratégia em tempo real e guerra de castelos. Dois alquimistas forjam exércitos de golens e os mandam pelo mesmo corredor de batalha. Seu objetivo: esmagar o castelo inimigo num duelo 1 contra 1.`
  - Proposed: `Forje golens, mande-os pelo corredor e esmague o castelo inimigo antes que o seu caia. Golem Forge é estratégia em tempo real 1 contra 1 com um toque de defesa de torre: monte um exército, construa torres no seu castelo, avance 5 eras e supere seu rival.`
  - Then a new line: `Sem anúncios, sem compras no app, sem cadastro.`

**Google Play short description**, for example en:
- Current: `Build a golem army and crush the enemy castle. Real-time online strategy PvP.` (77)
- Proposed: `No ads, no in-app purchases. Build a golem army and crush the enemy castle.` (75)

### P2-4 · Screenshot fixes (short)
- **Slide 4 (cards), en and tr, iPhone 6.9" only.** The "You took down the enemy commander!" / "Rakip komutanı
  düşürdün!" banner sits on top of the "Pick an age card" title, which reads as a UI bug. The iPad set and the
  de/es/fr/pt iPhone captures are clean. Recapture these two.
- **Slide 8 (closer) pills.** "Power triangle", "Aether Well" and "3 outposts" are jargon a browsing user can't decode.
  Replace them with buying reasons:

  | Lang | `Power triangle` → | `Aether Well` → | `3 outposts` → |
  |---|---|---|---|
  | en | `No ads` | `No account needed` | `5 ages` |
  | tr | `Reklam yok` | `Hesap gerekmez` | `5 çağ` |
  | de | `Keine Werbung` | `Kein Konto nötig` | `5 Ären` |
  | es | `Sin anuncios` | `Sin registro` | `5 eras` |
  | fr | `Sans pub` | `Sans compte` | `5 âges` |
  | pt | `Sem anúncios` | `Sem cadastro` | `5 eras` |

  Don't use "Free" or any price on images (2.3.7 / 2.3.14). Re-render and check that the pills still wrap cleanly.
- **Thumbnail.** Landscape apps show only screenshot 1 in iPhone search results. The hero headline is readable at that
  size; the eyebrow isn't, which is fine. Each slide carries one idea, which is good.

### P2-5 · "PvP" and the honesty of matchmaking
"PvP" in the es/fr/pt names and the en/de subtitles is true: rooms are real PvP, and Quick Match pairs humans when they
are there. The AI is disclosed. This is not a rejection risk.

It is a **review-score risk.** At launch, most Quick Match games will be against the unlabelled AI while the name and
subtitle promise PvP. That is the classic source of "it's all bots" 1-star reviews.

Cheapest mitigation: one line on the "Looking for an opponent…" screen, such as "If no one is found, you'll face an AI
opponent." That puts the disclosure where the player is, not only in the store.

Never add "real players", "live opponents" or player counts. I checked: no current text does.

---

## P3: nice to have

1. **Caption and keyword alignment.** Slide 5 eyebrows already match the castle-defense idea, and de `BURGVERTEIDIGUNG`
   is fine. If you take P2-2(a), switch them to the subtitle phrase:
   - en `TOWER DEFENSE`
   - tr `KULE SAVUNMA`
   - es `DEFENSA DE TORRES`
   - fr `DÉFENSE DE TOUR`
   - pt `DEFESA DE TORRE`

   ASO vendors report that Apple has OCR-indexed caption text since mid-2025. Apple has not confirmed it, and the reported
   weight is low to medium ([Appradar](https://appradar.com/app-store-ranking-factors/),
   [AppDrift](https://appdrift.co/blog/app-store-screenshot-text-indexing)).
2. **Hero shot details.**
   - The HUD reads "Apprentice Alchemist (bot)". That's honest, but on the hero it undercuts the online pitch. A capture
     from a room match between two of your own devices would show two player names.
   - Gold reads "4457.4k" (from the showcase server). A real mid-game number looks more believable.
3. **Slide 2 headline.** "You build golems. They fight." is the weakest line. Consider `Train golems.` /
   `Lead the charge.` (emphasis `charge`), mirrored in each language.
4. **Web footer at the marketing URL.** The browser build shows "Prototype v0.2 · Music credits" (`menu.footer`, web
   client only; the mobile app doesn't show it). Your review notes send the reviewer to that URL. Change it to "v1.0" so
   nothing reads as a beta (Guideline 2.2). Low risk: it isn't the binary.
5. **Rating prompt.** There is no in-app review request (`SKStoreReviewController`; Defold has an official review
   extension). Ratings drive both conversion and rank. Ask after a won match, not after the tutorial.
6. **Name translation.** Keep doing what you do:
   - The brand "Golem Forge" stays identical everywhere: logo, icon, word of mouth, and an easy brand query with only 5
     US results.
   - Only the descriptor is localized.
   - Don't translate the brand (for example "Forja de Gólems"). It would split the brand query and clash with the in-game
     logo.
7. **Not worth adding now: en-AU, en-CA, fr-CA.** Canada falls back to your primary language, and en-AU would duplicate
   en-GB.
8. **After launch:** re-tune every keyword field from App Store Connect → Analytics → Sources → App Store Search. Treat
   every demand statement here as inferred until that data exists.

---

## Quick reference: recommended default sets (P1; all verified by script)

| Locale | Name (chars) | Subtitle (chars) | Keywords (chars) |
|---|---|---|---|
| en-US | Golem Forge: Castle War (23) | PvP Army Strategy & Defense (27) | tower,td,rts,real,time,lane,battle,multiplayer,online,friend,1v1,turret,base,evolution,fantasy,troop (100) |
| en-GB *(new)* | Golem Forge: Castle War (23) | PvP Army Strategy & Defense (27) | tower,td,rts,real,time,lane,battle,multiplayer,online,friend,1v1,turret,base,evolution,defence,troop (100) |
| tr | Golem Forge: Kale Savaşı (24) | Gerçek Zamanlı Online Strateji (30) | savaş,pvp,ordu,kule,savunma,kuşatma,arkadaşla,iki,2,kişilik,çok,oyunculu,çağ,fetih,krallık,düello (97) |
| de-DE | Golem Forge: Krieg der Burgen (29) | PvP-Strategie in Echtzeit (25) | turmverteidigung,strategiespiel,verteidigung,turm,burg,schlacht,armee,mehrspieler,belagerung,freunde (100) |
| es-ES | Golem Forge: Estrategia PvP (27) | Guerra de castillos online (26) | torres,defensa,ejército,batalla,multijugador,amigos,asedio,tiempo,real,tropas,torreta,fortaleza (95) |
| es-MX | Golem Forge: Estrategia PvP (27) | Guerra de castillos online (26) | torres,defensa,ejército,batalla,multijugador,amigos,asedio,tiempo,real,tropas,torreta,línea,duelo (97) |
| fr-FR | Golem Forge : Stratégie PvP (27) | Guerre de châteaux en ligne (27) | défense,tour,armée,bataille,multijoueur,amis,siège,temps,réel,troupes,tourelle,duel,1v1,forteresse (98) |
| pt-BR | Golem Forge: Estratégia PvP (27) | Guerra de castelos online (25) | torre,defesa,exército,batalha,multiplayer,amigos,cerco,tempo,real,tropas,duelo,fortaleza,conquista (98) |
