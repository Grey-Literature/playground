import type { Record } from "./types.ts";

/** Asia, West Asia, Africa, Oceania */
export const RECORDS_A: Record[] = [
  // ───────────────────────────────── JAPAN
  {
    id: "obon",
    title: "Obon",
    subtitle: "The midsummer return of the ancestors",
    plain: "Once a year the dead come home for a few days, and their families cook for them.",
    culture: "Japanese",
    place: { name: "Nationwide", country: "Japan", lat: 35.4, lng: 136.5 },
    continent: "Asia",
    source: "living",
    evidence: "Widely practised; named in Japanese records from 657 CE, continuously documented since the medieval period",
    summary:
      "For a few days each summer the dead are treated as houseguests: welcomed with fire, fed, entertained, and escorted back out.",
    body: [
      "Households clean graves, hang mukaebi welcome-fires or lanterns at the gate, and set food before the butsudan. In many regions a cucumber horse and an aubergine ox are made so the ancestors can arrive quickly and depart slowly. Bon odori dancing in the neighbourhood square is not incidental — the dance is part of the hospitality.",
      "Dates split: most of Japan observes 13–16 August, Tokyo and parts of the Kantō region keep 13–16 July, and Okinawa follows the lunar calendar. The variation is a fossil of the 1873 switch to the Gregorian calendar rather than a difference of belief.",
    ],
    note: "Obon blends Buddhist Urabon'e rites with older Japanese ancestor practice; the balance between the two is debated and varies by region and sect.",
    threads: ["return", "food", "flame"],
    remembrance: { cluster: "festival", role: "Welcoming, feeding and escorting the dead" },
    calendar: { start: 225, end: 228, label: "13–16 August (July in Kantō)", drift: "variable", theme: "ancestors" },
    tags: ["ancestors", "festival", "hospitality", "fire"],
    sources: [
      {
        work: "nihon-shoki",
        supports:
          "An ullambana rite held west of Asuka temple in 657 CE — the earliest appearance of the term urabon'e in a Japanese record.",
      },
      {
        work: "smith-1974",
        supports:
          "Household observance: grave cleaning, offerings before the butsudan, and how widely practice varies by region.",
      },
      {
        work: "britannica-bon",
        supports: "Overview of the festival and of the July/August date split.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "toro-nagashi",
    title: "Tōrō Nagashi",
    subtitle: "Lanterns set on moving water",
    plain: "When the visit ends, paper lanterns are floated down the river to light the way back.",
    culture: "Japanese",
    place: { name: "Hiroshima & elsewhere", country: "Japan", lat: 34.39, lng: 132.45 },
    continent: "Asia",
    source: "living",
    evidence: "Living practice; documented widely from the 19th century onward",
    summary:
      "Paper lanterns carrying the names of the dead are floated downriver at the close of Obon, sending visitors back toward the other shore.",
    body: [
      "Each lantern is a small vessel: a wooden base, a paper shade, a candle, and often a written name or message. Released at dusk on the last night of Obon, the current does the work of carrying the guest away.",
      "In Hiroshima the rite has taken on a second life since 1947, when lanterns began to be floated on the Motoyasu River for those killed by the atomic bomb. That ceremony is held on 6 August, the anniversary of the bombing, rather than at the close of Obon — the same gesture, moved to carry civic memory as well as family memory.",
    ],
    threads: ["water", "flame", "return"],
    remembrance: { cluster: "object", role: "A named light released onto a current" },
    veil: { depth: "passage", role: "Water as the road out of the world of the living" },
    calendar: { start: 227, end: 228, label: "Closing night of Obon", drift: "variable", theme: "ancestors" },
    tags: ["water", "lanterns", "farewell"],
    sources: [
      {
        work: "jta-toro-nagashi",
        supports:
          "The Hiroshima ceremony from 1947 on the Motoyasu River, held on 6 August — the bombing anniversary — about a week ahead of Obon.",
      },
      {
        work: "smith-1974",
        supports: "Lantern-floating as the closing gesture of Obon in general practice.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "amended" },
  },
  {
    id: "butsudan",
    title: "The Butsudan",
    subtitle: "A cabinet where the household dead are kept close",
    plain: "A small wooden cabinet in the living room, where the family says good morning to their dead.",
    culture: "Japanese",
    place: { name: "Household practice", country: "Japan", lat: 34.99, lng: 135.78 },
    continent: "Asia",
    source: "living",
    evidence: "Living household practice, mandated by law in the Edo period",
    summary:
      "A lacquered cabinet in the family room holds memorial tablets, and receives rice, tea, incense and conversation each morning.",
    body: [
      "Inside are ihai — memorial tablets bearing posthumous names — alongside photographs, a small bell, and an incense burner. The first bowl of rice of the day often goes to the butsudan before anyone eats. Bad news and good news are both reported to it.",
      "The Edo-era danka system required households to register with a temple, which spread the household altar across social classes. What began partly as bureaucracy became one of the most intimate spaces in Japanese domestic life.",
    ],
    threads: ["food", "return", "flame"],
    remembrance: { cluster: "altar", role: "Daily domestic contact with named ancestors" },
    tags: ["altar", "household", "daily", "rice"],
    sources: [
      {
        work: "smith-1974",
        supports:
          "The butsudan in daily household life — ihai tablets, the first rice of the day, and the Edo danka registration that spread the altar across social classes.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "yurei",
    title: "Yūrei",
    subtitle: "The dead who did not finish",
    plain: "Some of the dead do not leave. You know them by the white robe and the long loose hair.",
    culture: "Japanese",
    place: { name: "Kyoto & nationwide", country: "Japan", lat: 35.01, lng: 135.77 },
    continent: "Asia",
    source: "folklore",
    evidence: "Oral tradition, kabuki, ukiyo-e and ghost-story collections",
    summary:
      "Not all dead settle. Those held by grievance, attachment or improper rites remain, recognisable by white burial clothes and loosened hair.",
    body: [
      "The visual grammar hardened in the Edo period: a white katabira, a triangular forehead cloth, hair unbound, hands hanging limp at the wrists, and — traditionally credited to Maruyama Ōkyo's late-18th-century paintings, though footless ghosts appear a century earlier — no feet. Kaidan storytelling games such as Hyakumonogatari Kaidankai made ghost stories a summer pastime.",
      "Yūrei are usually attached to a place or a person rather than roaming. Properly performed rites, an apology, or the resolution of the grievance can release them; this is a category defined by unfinished business, not by malice.",
    ],
    threads: ["return", "thresholds"],
    veil: { depth: "presence", role: "The unsettled dead, bound to place and grievance" },
    entity: {
      kind: "folk",
      shape: "shade",
      names: [
        { name: "幽霊 yūrei", lang: "Japanese" },
        { name: "bōrei", lang: "Japanese, 'ruined spirit'" },
        { name: "onryō", lang: "Japanese, 'vengeful spirit'" },
      ],
      earliest: "Heian-period tale collections (c. 11th century); visual type fixed c. 1750–1800",
      earliestYear: 1000,
      range: "All Japan; strongly associated with wells, bridges, ruined houses and riverbanks",
      traits: ["White burial garment", "Unbound black hair", "Limp, forward-hanging wrists", "Often footless in painting"],
      variants: ["Onryō — vengeful", "Ubume — a woman who died in childbirth", "Funayūrei — drowned dead at sea"],
      development:
        "Codified through kabuki staging and woodblock print rather than doctrine; modern Japanese horror cinema exported the Edo silhouette worldwide.",
    },
    tags: ["ghosts", "grievance", "edo"],
    sources: [
      {
        work: "davisson-2015",
        supports:
          "The Edo visual grammar — white katabira, unbound hair, limp forward-hanging wrists — and how kabuki and woodblock print fixed it.",
      },
      {
        work: "hyakumonogatari-footless",
        supports:
          "That footless ghosts predate Maruyama Ōkyo: one appears in an illustrated Tale of Genji of 1654. The attribution to Ōkyo is traditional, and disputed.",
      },
      {
        work: "yanagita-1910",
        supports: "Regional ghost accounts collected as local testimony rather than as fantasy.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "amended" },
  },
  {
    id: "kappa",
    title: "Kappa",
    subtitle: "The thing that waits at the riverbank",
    plain: "It waits at the river for children. There is a dish of water on its head, and if you bow, it has to bow back.",
    culture: "Japanese",
    place: { name: "Tōno, Iwate", country: "Japan", lat: 39.33, lng: 141.53 },
    continent: "Asia",
    source: "folklore",
    evidence: "Regional oral tradition; recorded systematically from 1910",
    summary:
      "A river being with a water-filled dish on its head — part warning to children, part local neighbour with whom bargains can be struck.",
    body: [
      "Descriptions vary sharply by region: turtle-shelled, ape-like, scaled, or bald with a beaked mouth. The constant is the sara, a depression on the crown holding water; spill it and the kappa loses its strength. It is fond of cucumbers, obsessed with sumo, and dangerously interested in drowning horses and children.",
      "Yanagita Kunio's Tōno Monogatari (1910) collected kappa accounts as local testimony rather than fantasy, and the creature has since become a mascot — river signage in many towns still warns children in kappa form.",
    ],
    note: "Kappa lore consolidated many separate regional water-spirits under one name during the Edo period; the tidy modern image is later than the beliefs it summarises.",
    threads: ["water", "ward"],
    veil: { depth: "threshold", role: "The danger that lives at the water's edge" },
    entity: {
      kind: "folk",
      shape: "aquatic",
      names: [
        { name: "河童 kappa", lang: "Japanese, 'river child'" },
        { name: "gatarō", lang: "Kansai dialect" },
        { name: "mizuchi", lang: "archaic, water serpent" },
      ],
      earliest: "Edo-period encyclopaedias and village records; earlier water-spirit references from the 8th century",
      earliestYear: 1600,
      range: "Rivers, irrigation ponds and canals throughout Japan; densest in Kyushu and Tōhoku",
      traits: ["Water dish on the crown", "Webbed hands", "Smell of fish", "Bows politely — and can be tricked into bowing"],
      variants: ["Hyōsube (Kyushu)", "Enkō (Shikoku)", "Suiko — a fiercer Chinese-derived form"],
      development:
        "A cautionary figure attached to real drowning hazards, later absorbed into commercial mascotry without losing its village-level specificity.",
    },
    tags: ["water", "children", "bargains"],
    sources: [
      {
        work: "yanagita-1910",
        supports:
          "Kappa accounts collected at Tōno as local testimony rather than fantasy — the systematic recording this record dates to 1910.",
      },
      {
        work: "foster-2015",
        supports:
          "The sharp regional variation in descriptions, the constant of the water-filled sara, and the kappa's drift from drowning hazard to town mascot.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "higan",
    title: "Higan",
    subtitle: "The equinox weeks, when the far shore is nearest",
    plain: "Twice a year day and night are exactly equal, and people say the other side is very close.",
    culture: "Japanese Buddhist",
    place: { name: "Nationwide", country: "Japan", lat: 35.68, lng: 139.69 },
    continent: "Asia",
    source: "living",
    evidence: "Living observance; documented from the 9th century",
    summary:
      "Twice a year, at the equinoxes, day and night balance — and families sweep graves, believing the other shore to be briefly close.",
    body: [
      "Higan means 'the far shore', the Buddhist other side of the river of existence. For the three days either side of each equinox, families visit graves, wash headstones, and offer botamochi in spring and ohagi in autumn — the same rice cake, renamed for the flower of the season.",
      "The observance is distinctively Japanese; no equivalent seven-day equinox rite exists in Indian or Chinese Buddhism. It is a case of doctrine settling onto an older seasonal rhythm.",
    ],
    threads: ["thresholds", "food"],
    remembrance: { cluster: "grave", role: "Seasonal grave-visiting and cleaning" },
    calendar: { start: 79, end: 85, label: "Equinox weeks, March & September", drift: "fixed", theme: "boundary" },
    tags: ["equinox", "graves", "balance"],
    sources: [
      {
        work: "smith-1974",
        supports:
          "Equinox grave-visiting and cleaning as household practice, and Buddhist observance settling onto an older seasonal rhythm.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "sai-no-kawara",
    title: "Sai no Kawara",
    subtitle: "The children's riverbank, and the one who intervenes",
    plain: "Children who died first pile stones on a grey riverbank, and someone comes to shelter them.",
    culture: "Japanese Buddhist",
    place: { name: "Mt Osore, Aomori", country: "Japan", lat: 41.32, lng: 141.09 },
    continent: "Asia",
    source: "living",
    evidence: "Living devotional practice with medieval textual roots",
    summary:
      "Children who die before their parents are said to pile stones on a dry riverbed; Jizō shelters them, and pilgrims add stones on their behalf.",
    body: [
      "At volcanic Osorezan — sulphur, bare rock, a pale lake — visitors build small cairns and leave pinwheels, sandals and sweets. The stone piles are understood as help offered to children who cannot complete the task themselves.",
      "Jizō Bosatsu, a bodhisattva who vowed to enter the hells to help those there, is the figure who steps in. Roadside Jizō statues across Japan are dressed in red bibs and knitted caps by strangers, often by parents who have lost a child.",
    ],
    note: "This is active religious devotion for many families, frequently connected to miscarriage and infant death (mizuko kuyō). It is not folklore in the sense of a story told for entertainment.",
    threads: ["water", "thresholds"],
    veil: { depth: "passage", role: "A riverbank between worlds, and a protector who crosses it" },
    remembrance: { cluster: "grave", role: "Stones, clothing and toys left for the child dead" },
    tags: ["children", "stones", "compassion", "pilgrimage"],
    sources: [
      {
        work: "glassman-2012",
        supports:
          "Jizō's vow to enter the hells, the medieval roots of the Sai no Kawara imagery, and how the cult attached itself to child death.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "kuchisake-onna",
    title: "Kuchisake-onna",
    subtitle: "A rumour that emptied the streets",
    plain: "A woman in a mask asks if she is pretty. In 1979 children all over Japan ran home early for months.",
    culture: "Japanese",
    place: { name: "Gifu Prefecture", country: "Japan", lat: 35.39, lng: 136.72 },
    continent: "Asia",
    source: "report",
    evidence: "Traceable rumour panic; contemporary newspaper coverage, 1979",
    summary:
      "In 1979 a story spread through Japanese schoolyards of a masked woman who asks whether she is beautiful. The answer does not help.",
    body: [
      "The rumour surfaced in Gifu in late 1978, reached national scale by summer 1979, and prompted police patrols and group escorts for schoolchildren. Escape strategies circulated with the story: say 'so-so', offer hard candy, ask her a question back.",
      "It behaves like older folklore — a woman at a boundary, a fatal question, a ritual counter-move — but its diffusion is fully documented, spread by children, evening news and weekly magazines rather than by centuries of retelling.",
    ],
    note: "A rare case where a legend's emergence can be dated almost to the month, which makes it useful for understanding how much older legends may have travelled.",
    threads: ["crossroads"],
    veil: { depth: "threshold", role: "The stranger met on the road home" },
    entity: {
      kind: "urban",
      shape: "humanoid",
      names: [
        { name: "口裂け女 kuchisake-onna", lang: "Japanese, 'slit-mouthed woman'" },
      ],
      earliest: "Rumour recorded in Gifu, December 1978; national coverage from March 1979, panic through that spring and summer",
      earliestYear: 1979,
      range: "Japan; later variants in South Korea and among diaspora communities",
      traits: ["Surgical mask", "Long coat", "Asks 'Am I pretty?'", "Appears on the walk home at dusk"],
      accounts: [
        { when: "Dec 1978", what: "First reported sighting, Motosu district, Gifu Prefecture" },
        { when: "Mar 1979", what: "Shūkan Asahi carries the story nationally; police patrols and escorted walks home follow across several prefectures" },
        { when: "2004", what: "A parallel rumour circulated among Korean schoolchildren as 'red mask'" },
      ],
      development:
        "Often linked retroactively to Edo-period tales of disfigured women, though the documented chain begins in the 1970s.",
    },
    tags: ["urban legend", "1979", "rumour"],
    sources: [
      {
        work: "foster-2015",
        supports:
          "The 1978–79 sequence and its spread through weekly magazines — Foster worked from dozens of contemporary tabloid and magazine references.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "hitodama",
    title: "Hitodama",
    subtitle: "Lights seen leaving the body",
    plain: "Pale blue lights that drift low over graveyards. People say they are souls leaving.",
    culture: "Japanese",
    place: { name: "Kyushu", country: "Japan", lat: 33.59, lng: 130.4 },
    continent: "Asia",
    source: "folklore",
    evidence: "Oral reports across regions; noted in poetry from the 8th century",
    summary:
      "Pale bluish lights drifting low over graveyards and marshes, understood as souls departing or lingering.",
    body: [
      "Hitodama are described as fist-sized, trailing a tail, moving at walking pace and often seen shortly before or after a death in the village. Similar lights appear in the Man'yōshū, making this one of the oldest continuously reported phenomena in Japan.",
      "Marsh gas, ball lightning and phosphorescence have all been offered as explanations; the reports have not stopped, and neither has the disagreement.",
    ],
    threads: ["lights", "return"],
    veil: { depth: "presence", role: "The visible soul, briefly" },
    tags: ["lights", "souls", "graveyards"],
    sources: [
      {
        work: "manyoshu",
        supports:
          "A hitodama poem in Book 16 of the eighth-century anthology — the earliest attestation, and what makes this one of the longest continuously reported sightings in Japan.",
      },
      {
        work: "foster-2015",
        supports: "Hitodama within the yōkai tradition, and the competing natural explanations offered for the lights.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 3, status: "clean" },
  },

  // ───────────────────────────────── CHINA & TAIWAN
  {
    id: "qingming",
    title: "Qingming",
    subtitle: "Tomb-sweeping in early spring",
    plain: "Families pull the weeds off the graves, repaint the names, and then have a picnic beside them.",
    culture: "Han Chinese",
    place: { name: "Nationwide", country: "China", lat: 30.59, lng: 114.31 },
    continent: "Asia",
    source: "living",
    evidence: "Continuous documented observance since the Tang dynasty",
    summary:
      "Families clear weeds from graves, repaint inscriptions, lay out food and wine, and then very often picnic beside the ancestors.",
    body: [
      "Held on the 15th day after the spring equinox, Qingming pairs grave maintenance with outings, kite-flying and the first green foods of the year. Offerings are burned; wine is poured on the ground; three bows are made. Cold Food Festival, which preceded it, forbade cooking fires and was gradually absorbed.",
      "It is a public holiday in China, Taiwan, Hong Kong and Macau, and the busiest travel period of the spring — the physical upkeep of a family grave is an obligation, not a sentiment.",
    ],
    threads: ["food", "flame", "return"],
    remembrance: { cluster: "grave", role: "Annual maintenance and feeding of the family grave" },
    calendar: { start: 94, end: 96, label: "15 days after the spring equinox", drift: "fixed", theme: "ancestors" },
    tags: ["graves", "spring", "obligation"],
    sources: [
      {
        work: "holzman-1986",
        supports:
          "The Cold Food Festival as the earlier observance, its prohibition on cooking fires, and its gradual absorption into Qingming.",
      },
      {
        work: "blake-2011",
        supports: "The burning of offerings and the pouring of wine as standard graveside practice.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "zhongyuan",
    title: "Zhongyuan / Ghost Month",
    subtitle: "When the gates below stand open",
    plain: "For one month the gates below stand open, and the dead who have nobody go looking for food.",
    culture: "Chinese & Taiwanese",
    place: { name: "Keelung, Taiwan", country: "Taiwan", lat: 25.13, lng: 121.74 },
    continent: "Asia",
    source: "living",
    evidence: "Living festival with Daoist and Buddhist textual lineages",
    summary:
      "For the seventh lunar month the dead are said to move freely, including those with no descendants to feed them.",
    body: [
      "Households set out food at the roadside, burn spirit money and incense, and avoid swimming, weddings, moving house or whistling at night. Temples stage pudu rites to feed hungry ghosts — the dead who died badly, far from home, or without heirs.",
      "In Keelung the month closes with water lanterns floated to guide drowned souls ashore, a rite run by rotating surname associations since 1855 after a truce ended years of settler feuding.",
    ],
    note: "Buddhist Yulanpen and Daoist Zhongyuan traditions overlap here; practitioners often draw on both without treating them as competing systems.",
    threads: ["food", "return", "ward", "water"],
    veil: { depth: "threshold", role: "A month-long opening between the living and the dead" },
    remembrance: { cluster: "offering", role: "Feeding the dead who have nobody to feed them" },
    calendar: { start: 226, end: 254, label: "Seventh lunar month (roughly August)", drift: "lunar", theme: "spirits" },
    tags: ["hungry ghosts", "lunar", "roadside offerings"],
    sources: [
      {
        work: "klctb-ghost-festival",
        supports:
          "That the Keelung observance began in 1855, and that the surname associations take their turn in an order decided by drawing lots. Eleven groups at the start; fifteen today.",
      },
      {
        work: "moi-keelung-zhongyuan",
        supports:
          "The Zhangzhou–Quanzhou feuding, the truce that buried the dead together, and the decision to let shared surnames replace ancestral homelands as the basis of kinship.",
      },
      {
        work: "teiser-1988",
        supports: "The Buddhist Yulanpen lineage that overlaps with the Daoist Zhongyuan observance.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "clean" },
  },
  {
    id: "joss-paper",
    title: "Burning Spirit Money",
    subtitle: "An economy that reaches across",
    plain: "You burn paper money, paper phones, paper houses — and the dead are said to receive the real thing.",
    culture: "Chinese",
    place: { name: "Hong Kong", country: "China", lat: 22.32, lng: 114.17 },
    continent: "Asia",
    source: "living",
    evidence: "Living practice; paper offerings attested since the Tang dynasty",
    summary:
      "Paper currency, houses, phones and cars are burned so the dead can receive them — a logistics system rather than a symbol.",
    body: [
      "Joss paper ranges from stamped bamboo sheets to elaborate papier-mâché mansions with servants and mahjong sets. It is folded, addressed, and burned in a metal drum; the smoke is the delivery mechanism. Craftsmen in Hong Kong and Taipei still make bespoke items to order.",
      "The practice draws steady criticism on environmental grounds, and temples increasingly offer centralised burners or digital alternatives. The argument is about method, rarely about obligation.",
    ],
    threads: ["flame", "food"],
    remembrance: { cluster: "offering", role: "Material provision for the dead" },
    tags: ["fire", "offerings", "material culture"],
    sources: [
      {
        work: "blake-2011",
        supports:
          "The range of forms burned, smoke as the delivery mechanism, the bespoke paper trade, and the environmental argument — which Blake shows is an argument about method, not about whether the obligation holds.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "diyu",
    title: "Diyu and the Ten Courts",
    subtitle: "A bureaucracy of the afterlife",
    plain: "The underworld is an office. You get registered, judged in ten courtrooms, sentenced, and sent back.",
    culture: "Chinese",
    place: { name: "Fengdu, Chongqing", country: "China", lat: 29.86, lng: 107.71 },
    continent: "Asia",
    source: "historical",
    evidence: "Textual and temple-art tradition from the Tang dynasty onward",
    summary:
      "The Chinese underworld was imagined as a court system: registration, judgement across ten tribunals, sentencing, and eventual rebirth.",
    body: [
      "Each court handles particular offences, with punishments precisely matched to them and a fixed term rather than eternity. At the end the soul drinks Meng Po's broth of forgetting and crosses back into rebirth. Temple murals rendered this in exhaustive administrative detail.",
      "The model absorbed Buddhist naraka into an existing Chinese conception of an underworld at Mount Tai, staffed by clerks and magistrates. Its logic is procedural: the dead can appeal, be misfiled, or be released early.",
    ],
    threads: ["descent", "thresholds"],
    veil: { depth: "otherworld", role: "The judged and administered afterlife" },
    tags: ["underworld", "judgement", "rebirth"],
    sources: [
      {
        work: "teiser-1994",
        supports:
          "The ten-court structure and its Tang-dynasty textual origin in the Scripture of the Ten Kings, the fixed sentence rather than eternity, and the absorption of Buddhist naraka into the older Chinese underworld at Mount Tai.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "jiangshi",
    title: "Jiangshi",
    subtitle: "The corpse that has to get home",
    plain: "A stiffened corpse that can only hop. It is trying to get home to be buried.",
    culture: "Chinese",
    place: { name: "Western Hunan", country: "China", lat: 28.31, lng: 109.74 },
    continent: "Asia",
    source: "folklore",
    evidence: "Qing-period tale collections; strongly reshaped by 20th-century cinema",
    summary:
      "A stiffened corpse that moves by hopping — bound up with the fear of dying far from the ancestral village.",
    body: [
      "Qing writers such as Ji Yun recorded accounts of reanimated corpses, controlled by Daoist talismans pasted to the forehead. The tales sit alongside the real trade of 'corpse-driving' in Xiangxi, where bodies of migrant workers were transported home overland by night, roped upright in single file.",
      "Whether corpse-driving actually involved walking bodies or simply discreet portering is disputed. The 1980s Hong Kong film cycle then fixed the hopping vampire in popular imagination worldwide.",
    ],
    threads: ["return", "ward"],
    veil: { depth: "presence", role: "A body that refuses the wrong burial place" },
    entity: {
      kind: "legend",
      shape: "humanoid",
      names: [
        { name: "僵屍 jiāngshī", lang: "Mandarin, 'stiff corpse'" },
        { name: "goeng-si", lang: "Cantonese" },
      ],
      earliest: "Ji Yun, Yuewei Caotang Biji, c. 1789–1798",
      earliestYear: 1789,
      range: "Southern and western China; strongest in Hunan and Guangdong lore",
      traits: ["Arms held forward, joints locked", "Moves by hopping", "Blind but senses breath", "Halted by a written talisman"],
      variants: ["Corpse-driving accounts of Xiangxi", "Cinematic 'hopping vampire' of 1980s Hong Kong"],
      development:
        "Folk anxiety about improper burial → literati anecdote → film genre. Each stage reshaped the creature substantially.",
    },
    tags: ["corpse", "burial", "cinema"],
    sources: [
      {
        work: "chan-1998",
        supports:
          "Ji Yun's Yuewei Caotang Biji as written 1789–1798, and its accounts of reanimated corpses — Ji Yun sorts them into the recently dead who revive and the long-buried who fail to decay.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "ancestral-hall",
    title: "Ancestral Tablets and Lineage Halls",
    subtitle: "Kinship kept in wood",
    plain: "Every ancestor gets a wooden tablet with their name on it. Some halls hold centuries of them.",
    culture: "Han Chinese",
    place: { name: "Guangzhou, Guangdong", country: "China", lat: 23.13, lng: 113.26 },
    continent: "Asia",
    source: "living",
    evidence: "Living institution with documentation across a millennium",
    summary:
      "Named wooden tablets hold a portion of the ancestor; a lineage hall is the building that houses several centuries of them.",
    body: [
      "A tablet carries the ancestor's name, dates and generation number. Ranked on a hall's altar, the tablets diagram the descent group itself. Halls also held land, funded schools and settled disputes — remembrance with a treasury.",
      "Many halls were destroyed or repurposed in the twentieth century; a great number have been rebuilt since the 1980s, often financed by overseas relatives tracing their line back to a village they have never lived in.",
    ],
    threads: ["return", "food"],
    remembrance: { cluster: "altar", role: "Institutional memory of a descent line" },
    tags: ["lineage", "tablets", "architecture"],
    sources: [
      {
        work: "faure-2007",
        supports:
          "Lineage halls in Guangdong as landholding, school-funding, dispute-settling institutions, and the long documentary record of the descent-group system they diagram.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },

  // ───────────────────────────────── KOREA
  {
    id: "jesa",
    title: "Jesa",
    subtitle: "Setting a table for the dead of the house",
    plain: "On the night someone died, the family lays out their food exactly right, opens the door, and waits.",
    culture: "Korean",
    place: { name: "Seoul & nationwide", country: "South Korea", lat: 37.57, lng: 126.98 },
    continent: "Asia",
    source: "living",
    evidence: "Living practice, codified in Joseon-era ritual manuals",
    summary:
      "On the eve of a death anniversary the family lays a precise table of food, opens the door, and waits.",
    body: [
      "Dishes are arranged by rule: red fruit east, white fruit west, fish east, meat west, no peaches, no red beans. A spoon is stood in the rice. The door is left ajar. After bows, the family eats the food themselves — eumbok, receiving the ancestor's blessing through the meal.",
      "Jesa is under visible renegotiation. Households argue over the labour, which falls disproportionately on women; some families simplify the table, hold it in daylight, or replace it with a shared meal and photographs.",
    ],
    threads: ["food", "return", "thresholds"],
    remembrance: { cluster: "offering", role: "Anniversary meal shared with a named ancestor" },
    tags: ["food", "anniversary", "household"],
    sources: [
      {
        work: "nfm-jesa",
        supports:
          "The table rules — red fruit east and white west, fish east and meat west — the standing spoon, and eumbok, the family eating the offering afterwards.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "chuseok",
    title: "Chuseok",
    subtitle: "Harvest moon, and a journey to the graves",
    plain: "At the harvest full moon everyone travels to the family graves and cuts the grass.",
    culture: "Korean",
    place: { name: "Nationwide", country: "South Korea", lat: 36.5, lng: 127.8 },
    continent: "Asia",
    source: "living",
    evidence: "Living national festival with premodern roots",
    summary:
      "At the full moon of the eighth lunar month, families travel to ancestral graves, cut the grass, and offer the year's first grain.",
    body: [
      "Beolcho — clearing the grave mound — is done before the holiday; seongmyo is the visit itself. Songpyeon rice cakes are steamed on pine needles. Charye rites use the new harvest, making the offering explicitly a first-fruits gift.",
      "The autumn migration home is enormous: tens of millions travel, and traffic reports become national news. The obligation to be physically present at a family grave still structures the calendar of an industrialised country.",
    ],
    threads: ["food", "return"],
    remembrance: { cluster: "grave", role: "Harvest offering at ancestral grave mounds" },
    calendar: { start: 262, end: 264, label: "15th day, 8th lunar month", drift: "lunar", theme: "harvest" },
    tags: ["harvest", "graves", "migration"],
    sources: [
      {
        work: "folkency",
        supports:
          "Beolcho and seongmyo as distinct acts, songpyeon steamed on pine needles, and charye as an explicit first-fruits offering from the new harvest.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "jeoseung-saja",
    title: "Jeoseung Saja",
    subtitle: "The messenger who comes with a name on a list",
    plain: "Death arrives as a man in a black hat carrying a list. Sometimes he knocks at the wrong house.",
    culture: "Korean",
    place: { name: "Nationwide", country: "South Korea", lat: 37.5, lng: 127.03 },
    continent: "Asia",
    source: "folklore",
    evidence: "Oral tradition and shamanic narrative song",
    summary:
      "Death arrives as a functionary in a black hat and robe, carrying a register, sometimes at the wrong address.",
    body: [
      "In shamanic narratives the saja are envoys of the underworld court, and many stories turn on clerical error: the wrong person taken, a bribe of rice and money left at the gate, a soul returned because the name did not match.",
      "Families historically left sajabap — three bowls of rice, three pairs of straw sandals, coins — outside the door at a death, provisioning the messengers so that they would treat the deceased gently on the road.",
    ],
    threads: ["thresholds", "food", "crossroads"],
    veil: { depth: "passage", role: "The escort who collects the dead" },
    entity: {
      kind: "folk",
      shape: "humanoid",
      names: [
        { name: "저승사자 jeoseung saja", lang: "Korean, 'envoy of the other world'" },
        { name: "ganglim doryeong", lang: "Korean, a named saja of shamanic song" },
      ],
      earliest: "Recorded in muga shamanic songs; textual attestations from the Joseon period",
      earliestYear: 1600,
      range: "Korean peninsula",
      traits: ["Black robe and gat hat", "Carries a register of names", "Appears at the threshold", "Susceptible to hospitality"],
      development:
        "Absorbed elements of the Chinese underworld bureaucracy while keeping a distinctly Korean emphasis on negotiation and error.",
    },
    tags: ["psychopomp", "bureaucracy", "threshold"],
    sources: [
      {
        work: "folkency",
        supports:
          "The saja of shamanic narrative, sajabap left at the gate — rice, straw sandals and coins — and the recurring motif of the register naming the wrong person.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "ssitgim-gut",
    title: "Ssitgim-gut",
    subtitle: "Washing the dead clean of resentment",
    plain: "A shaman washes a bundle standing in for the body, and talks the dead out of being angry.",
    culture: "Korean (Jindo)",
    place: { name: "Jindo Island", country: "South Korea", lat: 34.49, lng: 126.26 },
    continent: "Asia",
    source: "living",
    evidence: "Living practice; designated National Intangible Cultural Heritage, 1980",
    summary:
      "A shaman washes a bundle standing in for the body, untangles a long cloth, and talks the dead out of their grudges.",
    body: [
      "Over a night-long rite the mudang bathes an effigy of clothes and bones-in-cloth, then draws the corpse-cloth through a knotted length of fabric — each knot loosened is a resentment released. The family speaks to the dead through the shaman, and is spoken back to.",
      "The Jindo form is one of many regional gut. It is performed for the recently dead and, sometimes decades later, for those who died violently or far from home — including at sea.",
    ],
    note: "Korean shamanic practice is a living religious tradition with practitioners and clients today, not a historical curiosity.",
    threads: ["water", "return"],
    remembrance: { cluster: "mourning", role: "Ritual resolution of grief and grievance" },
    tags: ["shaman", "washing", "grief"],
    sources: [
      {
        work: "khs-jindo-ssitgimgut",
        supports:
          "The designating authority's own listing: designated 17 November 1980, and now published as National Intangible Cultural Heritage with no designation number.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 3, status: "amended" },
  },

  // ───────────────────────────────── SOUTH ASIA
  {
    id: "pitru-paksha",
    title: "Pitru Paksha",
    subtitle: "A fortnight owed to the fathers",
    plain: "For sixteen days the ancestors come back. You put rice out for them, and you watch the crows.",
    culture: "Hindu",
    place: { name: "Gaya, Bihar", country: "India", lat: 24.79, lng: 85.0 },
    continent: "Asia",
    source: "living",
    evidence: "Living observance with textual basis in the Dharmaśāstra",
    summary:
      "For sixteen lunar days the ancestors are said to descend; rice balls and water are offered, and crows are watched closely.",
    body: [
      "Shraddha rites offer pinda — balls of rice and sesame — and tarpana, libations of water, for three ascending generations. Food is set out for crows, understood as carriers for the ancestors; a crow that eats is a good sign.",
      "Gaya is the pre-eminent site: pilgrims perform pinda-dana at the Falgu river and the Vishnupad temple, sometimes for ancestors many generations back, or for the unremembered dead of a whole lineage.",
    ],
    note: "An active religious obligation for millions, with detailed rules varying by region, caste and family custom.",
    threads: ["food", "return", "animals"],
    remembrance: { cluster: "offering", role: "Prescribed food and water offerings to three generations" },
    calendar: { start: 259, end: 274, label: "Bhadrapada dark fortnight (Sept–Oct)", drift: "lunar", theme: "ancestors" },
    tags: ["shraddha", "rice", "crows", "pilgrimage"],
    sources: [
      {
        work: "sayers-2015",
        supports:
          "Śrāddha as it developed out of the Vedic offerings — pinda for three ascending generations, tarpana, and the textual basis the record points to in the Dharmaśāstra.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "manikarnika",
    title: "The Burning Ghats of Kashi",
    subtitle: "Fire at the edge of the river",
    plain: "The fires beside the river never go out. People travel here to die.",
    culture: "Hindu",
    place: { name: "Varanasi, Uttar Pradesh", country: "India", lat: 25.31, lng: 83.01 },
    continent: "Asia",
    source: "living",
    evidence: "Continuously documented sacred site over many centuries",
    summary:
      "At Manikarnika and Harishchandra ghats cremation runs continuously; to die here is held to release one from rebirth.",
    body: [
      "The body is carried through the lanes on a bamboo bier, immersed in the Ganges, then burned on stacked wood. The chief mourner circles the pyre and performs kapala kriya, breaking the skull to release the breath. Ash and remains go to the river.",
      "Hospices near the ghats house people who have travelled to Varanasi specifically to die there. The city's economy of wood, barbers, priests and Dom funeral attendants is organised around this.",
    ],
    note: "A living religious centre. Photography and spectatorship at the cremation grounds are contested locally.",
    threads: ["water", "flame"],
    remembrance: { cluster: "mourning", role: "Cremation as release, performed by the family" },
    veil: { depth: "passage", role: "A place where the passage out is believed to be shortest" },
    tags: ["cremation", "river", "release"],
    sources: [
      {
        work: "eck-1982",
        supports:
          "Kashi as the place where people travel in order to die, the belief that dying there releases one from rebirth, and the working city organised around it — the wood, the priests, the Dom attendants.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "yama",
    title: "Yama and the Two Dogs",
    subtitle: "The first to die, and therefore the one who receives",
    plain: "The first person ever to die found the road. Now he waits at the end of it, with two dogs.",
    culture: "Vedic & Hindu",
    place: { name: "North India", country: "India", lat: 26.0, lng: 79.0 },
    continent: "Asia",
    source: "historical",
    evidence: "Vedic hymns; later epic and Puranic elaboration",
    summary:
      "In the Rigveda, Yama is the first mortal to find the path beyond death, and so becomes the one who greets those who follow.",
    body: [
      "Rigveda 10.14 sends the dead past two broad-nosed, four-eyed dogs, Śyāma and Śabala, sons of Saramā, who guard the road. Yama himself rules a bright gathering-place of the fathers rather than a place of punishment; the judicial and hellish aspects develop later.",
      "As Buddhism and Hinduism spread, Yama travelled — becoming Yanluo in China, Enma in Japan, Shinje in Tibet — each version reshaped by local ideas of law and administration.",
    ],
    note: "Yama is a deity within living religious traditions, not a folkloric monster; the entry describes textual history, not a creature sighting record.",
    threads: ["animals", "descent", "crossroads"],
    veil: { depth: "passage", role: "The sovereign of the road the dead take" },
    entity: {
      kind: "sacred",
      shape: "quadruped",
      names: [
        { name: "यम Yama", lang: "Sanskrit" },
        { name: "Yanluo Wang", lang: "Chinese" },
        { name: "Enma-Ō", lang: "Japanese" },
      ],
      earliest: "Rigveda, c. 1500–1200 BCE",
      earliestYear: -1300,
      range: "South Asia; adopted across Buddhist Asia",
      traits: ["First mortal to die", "Keeper of the path", "Attended by two four-eyed dogs", "Later: judge and record-keeper"],
      variants: ["Vedic gathering-place of the fathers", "Puranic judge of the naraka", "Tibetan Shinje, lord of the Wheel"],
      development:
        "A shift from host to magistrate over roughly two millennia, tracking wider changes in ideas of moral accounting.",
    },
    tags: ["deity", "dogs", "path"],
    sources: [
      {
        work: "rigveda",
        supports:
          "Hymn 10.14, which sends the dead past the two four-eyed, broad-nosed dogs of Yama, sons of Saramā, and which makes Yama the first mortal to find the road rather than a judge of those who take it.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "bhuta-kola",
    title: "Bhūta Kōla",
    subtitle: "The spirit that speaks and settles disputes",
    plain: "A dancer becomes the spirit, and then the spirit listens to people's arguments and says who is right.",
    culture: "Tuluva",
    place: { name: "Tulu Nadu, Karnataka", country: "India", lat: 13.34, lng: 74.75 },
    continent: "Asia",
    source: "living",
    evidence: "Living ritual tradition with hereditary performers",
    summary:
      "A costumed performer becomes the vessel for a local daiva, which then hears grievances and gives judgement aloud.",
    body: [
      "Through the night, with drums, torches and elaborate arecanut-frond costume, the impersonator takes on the spirit — often a deified ancestor, a wronged person, or a guardian of the land. Villagers bring disputes about boundaries, debts and family conflict; the daiva's word carries weight.",
      "Each shrine has its own spirits, oral epics (paddanas) and hereditary lineages of performers, largely from communities historically marginalised in caste terms who hold ritual authority in this context.",
    ],
    note: "A functioning religious and judicial institution in coastal Karnataka, sustained by specific families and shrines.",
    threads: ["masks", "flame", "return"],
    veil: { depth: "presence", role: "A spirit given a voice and a body for one night" },
    remembrance: { cluster: "festival", role: "Deified ancestors addressed directly by the community" },
    calendar: { start: 340, end: 120, label: "Season runs roughly December to April", drift: "variable", theme: "spirits" },
    tags: ["possession", "justice", "performance"],
    sources: [
      {
        work: "claus-1979",
        supports:
          "Bhūta mediumship read through Tulu oral tradition — the paddanas, the hereditary performing lineages, and the daiva's authority over disputes.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "churel",
    title: "Churel",
    subtitle: "A death in childbirth, unatoned",
    plain: "A woman who died badly comes back, and her feet point the wrong way round.",
    culture: "North Indian & Pakistani",
    place: { name: "Punjab region", country: "India / Pakistan", lat: 30.5, lng: 74.0 },
    continent: "Asia",
    source: "folklore",
    evidence: "Widespread oral tradition; colonial-era ethnographic notes",
    summary:
      "A woman who died in childbirth or through mistreatment is said to return, recognisable by feet turned backwards.",
    body: [
      "Accounts describe her waiting near wells, cremation grounds and lonely roads, sometimes appearing beautiful, sometimes withered. Protective customs at burial — thorns, iron nails, a body carried out feet-first through a wall rather than a door — were widely recorded in the nineteenth century.",
      "Folklorists have read the figure as a container for guilt: the churel returns to the family that failed her. The backwards feet are the standard tell across a wide belt of South Asia.",
    ],
    threads: ["crossroads", "ward", "thresholds"],
    veil: { depth: "presence", role: "The dead returning where obligation was broken" },
    entity: {
      kind: "folk",
      shape: "shade",
      names: [
        { name: "चुड़ैल churel", lang: "Hindi / Urdu" },
        { name: "petni", lang: "Bengali (related figure)" },
      ],
      earliest: "Recorded by William Crooke, 1896; oral tradition considerably older",
      earliestYear: 1896,
      range: "Northern India, Pakistan, Bangladesh, Nepal; diaspora communities",
      traits: ["Feet reversed at the ankle", "Haunts wells and lonely roads", "Targets male relatives of her household"],
      variants: ["Petni (Bengal)", "Dayan (Rajasthan, distinct but often conflated)"],
      development:
        "A moral figure as much as a frightening one: her existence is an accusation against the living.",
    },
    tags: ["childbirth", "roads", "obligation"],
    sources: [
      {
        work: "crooke-1896",
        supports:
          "The churel as Crooke found her in northern India: the reversed feet, the haunting of wells and lonely roads, and the burial precautions — iron nails driven to lay her, thorns, the body taken out feet first.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "amended" },
  },

  // ───────────────────────────────── SOUTHEAST ASIA
  {
    id: "pchum-ben",
    title: "Pchum Ben",
    subtitle: "Fifteen days of feeding those who cannot eat",
    plain: "Before dawn, rice is thrown into the temple grounds for the dead who cannot eat any other way.",
    culture: "Khmer",
    place: { name: "Phnom Penh & nationwide", country: "Cambodia", lat: 11.56, lng: 104.92 },
    continent: "Asia",
    source: "living",
    evidence: "Living national observance, Theravada Buddhist framework",
    summary:
      "Before dawn, sticky rice is thrown into temple grounds for the hungry dead who cannot receive ordinary offerings.",
    body: [
      "Families visit seven pagodas across the fortnight. At first light they scatter bay ben — balls of sticky rice and sesame — on the ground so that ancestors with narrow throats or bad karma, unable to accept food from monks, may still be reached.",
      "Merit is transferred to the dead through offerings to the sangha. For many Cambodian families the observance also carries the weight of relatives killed between 1975 and 1979 whose remains were never recovered.",
    ],
    threads: ["food", "return"],
    remembrance: { cluster: "offering", role: "Merit and food directed to unreachable dead" },
    calendar: { start: 258, end: 273, label: "Last 15 days of Pheaktrobotr (Sept–Oct)", drift: "lunar", theme: "ancestors" },
    tags: ["buddhism", "rice", "merit"],
    sources: [
      {
        work: "davis-2016",
        supports:
          "The fifteen-day structure, the transfer of merit to the dead through the sangha, and the logic of bay ben — food for pretas whose throats will not admit an ordinary offering. The custom of seven pagodas answers to seven generations of ancestors.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "torajan-funerals",
    title: "Rambu Solo' and Ma'nene'",
    subtitle: "The dead stay in the house for a while",
    plain: "The dead person stays at home and is called sick, for months or years, until the family is ready.",
    culture: "Toraja",
    place: { name: "Tana Toraja, Sulawesi", country: "Indonesia", lat: -3.02, lng: 119.85 },
    continent: "Asia",
    source: "living",
    evidence: "Living tradition, extensively documented by anthropologists",
    summary:
      "A person may remain at home as to makula' — 'a sick person' — for months or years until the family can hold the funeral.",
    body: [
      "The full Rambu Solo' funeral is a multi-day event with buffalo sacrifice, guest houses built for the occasion, and effigies called tau-tau placed in cliff galleries. Its scale determines the deceased's standing, and the cost can take a family years to assemble.",
      "In some highland villages the Ma'nene' rite later reopens the tombs: bodies are cleaned, re-dressed in new clothes, stood up, and photographed with relatives, then returned.",
    ],
    note: "Widely sensationalised in foreign media. Within Toraja this is ordinary care for kin, not spectacle.",
    threads: ["return", "food"],
    remembrance: { cluster: "grave", role: "Continued physical care of the body after death" },
    calendar: { start: 213, end: 258, label: "Funeral season, roughly August–September", drift: "variable", theme: "remembrance" },
    tags: ["funerals", "effigies", "cliffs"],
    sources: [
      {
        work: "volkman-1985",
        supports:
          "Rambu Solo' as a multi-day feast whose scale sets the standing of the dead, the buffalo sacrifice and the cost that delays it, the tau-tau effigies, and the deceased kept at home as to makula' until the family can pay.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "pontianak",
    title: "Pontianak / Kuntilanak",
    subtitle: "Frangipani on the air before she appears",
    plain: "You smell flowers first. Her cry is loudest when she is far away, and quiet when she is close.",
    culture: "Malay & Indonesian",
    place: { name: "Malay Peninsula & Java", country: "Malaysia / Indonesia", lat: 3.14, lng: 101.69 },
    continent: "Asia",
    source: "folklore",
    evidence: "Widespread oral tradition; a major genre of Malay-language cinema",
    summary:
      "A woman who died in pregnancy or childbirth, announced by a sweet floral smell and a cry that is loudest when she is far away.",
    body: [
      "She is said to appear in white with long black hair, near banana groves and along quiet roads. Distance is judged by the sound: a faint cry means she is close. A nail driven into the nape of the neck is the traditional means of restraining her.",
      "The city of Pontianak in West Kalimantan is named after her — its founder is said to have been harassed by the spirits at the river junction where he settled in 1771.",
    ],
    threads: ["crossroads", "ward"],
    veil: { depth: "presence", role: "The dead of childbirth, returning near roads and groves" },
    entity: {
      kind: "folk",
      shape: "shade",
      names: [
        { name: "pontianak", lang: "Malay" },
        { name: "kuntilanak", lang: "Indonesian" },
        { name: "langsuir", lang: "Malay, a related figure" },
      ],
      earliest: "Attested in Malay tradition by the 18th century; first systematic record in W. W. Skeat's Malay Magic, 1900",
      earliestYear: 1771,
      range: "Malay Peninsula, Sumatra, Java, Borneo, Singapore",
      traits: ["Scent of frangipani, then decay", "White garment, unbound hair", "Cry inverted by distance", "Hole in the nape"],
      variants: ["Langsuir — died in childbirth, becomes a flying owl-like form", "Pocong — a related but distinct shrouded figure"],
      development:
        "Village belief and cinema now feed each other; the 1957 film Pontianak established much of the modern visual convention.",
    },
    tags: ["childbirth", "scent", "cinema"],
    sources: [
      {
        work: "skeat-1900",
        supports:
          "The first systematic record of the pontianak and the related langsuir, gathered in Selangor: death in childbirth, white garment and unbound hair, the hole in the nape, and the nail used to bind her.",
      },
      {
        work: "galt-2021",
        supports:
          "The 1957 Cathay-Keris film Pontianak and the visual conventions it fixed, and the traffic since then between village belief and Malay-language cinema.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "phi-ta-khon",
    title: "Phi Ta Khon",
    subtitle: "Masks made from rice steamers and coconut husk",
    plain: "For three days the villagers are spirits, in masks built from rice steamers, being as rude as they like.",
    culture: "Thai-Isan (Dan Sai)",
    place: { name: "Dan Sai, Loei", country: "Thailand", lat: 17.29, lng: 101.15 },
    continent: "Asia",
    source: "living",
    evidence: "Living local festival; earliest firm documentation 20th century",
    summary:
      "Villagers become spirits for three days — long-nosed masks, bells at the waist, processions that are loud, rude and funny.",
    body: [
      "Masks are built from the sticky-rice steamer basket and carved coconut-palm sheath, painted in bright patterns; dancers carry wooden phallic props and sound cowbells. The festival opens with the summoning of Phra Upakut, a spirit-monk from the river.",
      "It is tied to the Bun Luang merit festival and the Vessantara Jataka, in which the returning prince is greeted so joyously that even the spirits join the crowd. The date is set each year by the town's mediums, not by a fixed calendar.",
    ],
    threads: ["masks", "return", "flame"],
    remembrance: { cluster: "festival", role: "Community impersonation of the returning dead" },
    veil: { depth: "threshold", role: "Spirits invited into the village in daylight" },
    calendar: { start: 172, end: 188, label: "Set annually by local mediums (June–July)", drift: "variable", theme: "spirits" },
    tags: ["masks", "procession", "merit"],
    sources: [
      {
        work: "thailand-foundation-phitakhon",
        supports:
          "The mask built from a sticky-rice steamer with a carved wooden nose, the three-day Bun Luang frame, Phra Upakut the arahant invited to guard the celebration, and the Vessantara Jataka story the festival is hung on.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "manananggal",
    title: "Manananggal",
    subtitle: "A body left standing while the rest flies",
    plain: "It splits at the waist and the top half flies off to hunt. Find the legs before sunrise.",
    culture: "Filipino (Visayan)",
    place: { name: "Capiz, Panay", country: "Philippines", lat: 11.55, lng: 122.75 },
    continent: "Asia",
    source: "folklore",
    evidence: "Oral tradition; noted in Spanish colonial accounts from the late 16th century",
    summary:
      "A creature that severs at the waist and flies with its upper half, hunting; the lower half must be found before dawn.",
    body: [
      "Countermeasures are specific and practical: salt, ash or garlic spread on the abandoned lower body prevents rejoining, and daylight then destroys it. A dried stingray tail is a different tool entirely — a whip, for driving one off rather than trapping it. Pregnant women are the classic target, approached through the roof with a long thin tongue.",
      "The severing form is in the earliest Spanish account there is: Juan de Plasencia's relación of 1589 lists the magtatangal — from tanggal, 'to detach' — as one who shows itself at night without its head or entrails. Plasencia gave twelve numbered kinds and set osuang down as a separate one. The collapse of tiktik, sigbin, wakwak and the rest into a single 'aswang' category came later, in colonial and then popular usage.",
    ],
    threads: ["ward", "thresholds"],
    veil: { depth: "presence", role: "The neighbour who is not only a neighbour" },
    entity: {
      kind: "folk",
      shape: "winged",
      names: [
        { name: "manananggal", lang: "Tagalog / Visayan, 'one who separates'" },
        { name: "tiktik", lang: "named for the sound that means it is far away" },
      ],
      earliest: "Named as magtatangal in Juan de Plasencia's relación, 1589",
      earliestYear: 1589,
      range: "Visayas, especially Panay; reported across the Philippines",
      traits: ["Separates at the waist", "Bat-like wings", "Long tubular tongue", "Vulnerable lower half"],
      variants: ["Aswang — an umbrella term covering several distinct beings", "Wakwak", "Sigbin"],
      development:
        "Recorded as distinct kinds in 1589, then merged under 'aswang' across the colonial centuries; twentieth-century Philippine cinema and comics pulled them apart again and elaborated them.",
    },
    tags: ["aswang", "salt", "night"],
    sources: [
      {
        work: "plasencia-1589",
        supports:
          "The magtatangal as one of twelve numbered kinds in the earliest Spanish account — one who appears at night without head or entrails — recorded separately from osuang in the same list.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },

  // ───────────────────────────────── WEST & CENTRAL ASIA
  {
    id: "chinvat",
    title: "The Chinvat Bridge",
    subtitle: "A crossing that widens or narrows",
    plain: "Everyone crosses the same bridge. For some it is wide, and for others it turns sideways like a blade.",
    culture: "Zoroastrian",
    place: { name: "Yazd", country: "Iran", lat: 31.9, lng: 54.37 },
    continent: "West Asia",
    source: "historical",
    evidence: "Avestan and Pahlavi scripture; living tradition among Zoroastrians",
    summary:
      "Three days after death the soul reaches a bridge that broadens for the righteous and narrows to a blade's edge for the wicked.",
    body: [
      "At the bridge the soul meets the daēnā, its own conscience, appearing as a radiant young woman or a hag according to the life lived. The Hadhokht Nask describes the meeting in detail; the bridge is guarded and the crossing is judged.",
      "The image of a narrowing bridge over an abyss recurs later in Islamic and some Christian eschatology. Whether by transmission or independent development is genuinely debated by historians of religion.",
    ],
    note: "Zoroastrianism is a living faith with communities in Iran, India and diaspora. This entry describes scripture and current belief.",
    threads: ["water", "thresholds", "descent"],
    veil: { depth: "passage", role: "A judged crossing between worlds" },
    tags: ["bridge", "judgement", "conscience"],
    sources: [
      {
        work: "boyce-zoroastrians",
        supports:
          "The soul's three days beside the body, the crossing at the fourth dawn, the daēnā met at the bridge as the shape of one's own life, and the bridge that broadens or narrows to a blade.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "dakhma-sagdid",
    title: "Dakhma and Sagdīd",
    subtitle: "The gaze of the dog, and the open tower",
    plain: "A dog is brought in to look at the body. Then the body is laid out on an open tower.",
    culture: "Zoroastrian (Parsi)",
    place: { name: "Mumbai", country: "India", lat: 18.96, lng: 72.81 },
    continent: "Asia",
    source: "living",
    evidence: "Living practice under significant modern pressure",
    summary:
      "A dog is brought to look at the body; exposure on a tower then keeps death from polluting earth, fire or water.",
    body: [
      "Sagdīd, 'the sight of the dog', is performed shortly after death — a four-eyed dog, one with markings above the eyes, is preferred. Corpses are then carried by nasasalars to a dakhma, a circular tower open to the sky, where vultures reduce them within hours.",
      "The system depends on vultures. South Asian vulture populations fell by more than ninety-five per cent from the early 1990s; the cause was traced in 2004 to diclofenac, an anti-inflammatory given to cattle and fatal to any vulture that feeds on the carcass. The collapse has forced Parsi communities into painful debates over solar concentrators, aviaries and burial.",
    ],
    note: "A functioning religious practice currently under ecological strain, with active disagreement inside the community.",
    threads: ["animals", "thresholds"],
    remembrance: { cluster: "mourning", role: "Disposal of the body without polluting the elements" },
    tags: ["dogs", "vultures", "purity"],
    sources: [
      {
        work: "oaks-2004",
        supports:
          "The vulture collapse the practice depends on: Gyps populations down more than ninety-five per cent from the early 1990s, traced to diclofenac residues in cattle carcasses causing renal failure and visceral gout in birds that fed on them.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "amended" },
  },
  {
    id: "jinn",
    title: "Jinn and the Places Between",
    subtitle: "Another kind of creation, sharing the same world",
    plain: "Made from smokeless fire, living their own lives alongside ours — especially in doorways and empty places.",
    culture: "Islamic & pre-Islamic Arabian",
    place: { name: "Arabian Peninsula", country: "Saudi Arabia", lat: 24.5, lng: 44.0 },
    continent: "West Asia",
    source: "living",
    evidence: "Qur'anic scripture and continuous living belief",
    summary:
      "Beings created from smokeless fire, with free will and communities of their own, associated with thresholds and empty places.",
    body: [
      "In Islamic theology jinn are a distinct order of creation, morally accountable like humans: some believe, some do not. They are not the dead, and they are not demons by definition. Sūrat al-Jinn does not address them — it reports their own words on overhearing the Qur'an and believing it. The sura that speaks to jinn and humankind together is al-Raḥmān, which is also where the smokeless flame is named.",
      "Popular custom across the Muslim world associates them with ruins, deserts, bathhouses, wells and thresholds, and prescribes courtesies — a spoken bismillah before pouring hot water, not sitting in doorways at dusk.",
    ],
    note: "This is an article of faith for many Muslims. It is included here as belief about unseen beings, not as folklore about monsters.",
    threads: ["thresholds", "crossroads", "ward"],
    veil: { depth: "threshold", role: "A parallel population inhabiting liminal space" },
    entity: {
      kind: "sacred",
      shape: "light",
      names: [
        { name: "جن jinn", lang: "Arabic, 'the hidden'" },
        { name: "ifrit", lang: "Arabic, a powerful class" },
        { name: "peri / pari", lang: "Persian" },
      ],
      earliest: "Pre-Islamic Arabian poetry; Qur'anic revelation, 7th century CE",
      earliestYear: 620,
      range: "Across the Muslim world, with strong regional variation in custom",
      traits: ["Created from smokeless fire", "Possess free will", "Ordinarily unseen", "Associated with ruins and thresholds"],
      variants: ["Marid", "Ifrit", "Si'lat", "Regional figures often assimilated to the category"],
      development:
        "A pre-Islamic Arabian concept given theological structure by the Qur'an, then locally elaborated from West Africa to Indonesia.",
    },
    tags: ["unseen", "thresholds", "belief"],
    sources: [
      {
        work: "quran",
        supports:
          "Sūrat al-Raḥmān, which addresses jinn and humankind together and names the smokeless flame they are made from; and Sūrat al-Jinn, which reports the jinn's own account of hearing the Qur'an rather than addressing them.",
      },
      {
        work: "elzein-2009",
        supports:
          "Jinn as a distinct order of creation with free will and moral accountability — neither the dead nor demons by definition — and the local elaboration of that idea across the Muslim world.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "amended" },
  },
  {
    id: "inanna-descent",
    title: "Inanna's Descent",
    subtitle: "Seven gates, and something taken at each",
    plain: "She goes down through seven gates, and at each one they take something off her, until she has nothing left.",
    culture: "Sumerian",
    place: { name: "Uruk", country: "Iraq", lat: 31.32, lng: 45.64 },
    continent: "West Asia",
    source: "reconstructed",
    evidence: "Cuneiform tablets, c. 1900–1600 BCE, incomplete and variant",
    summary:
      "A goddess goes down into the kur; at each gate a garment or ornament is removed, until she arrives with nothing.",
    body: [
      "In the Sumerian text Inanna is stripped by degrees, judged, killed and hung on a hook. She is revived by creatures made from dirt under a god's fingernail — but the underworld does not release anyone without a substitute, and her consort Dumuzi is taken in her place, alternating with his sister.",
      "The Akkadian Descent of Ishtar is a shorter, differently emphasised version. Both survive in fragments, and reconstructions rely on damaged tablets and scholarly conjecture.",
    ],
    note: "One of the oldest recorded underworld journeys. Substantial portions are damaged; translations differ meaningfully.",
    threads: ["descent", "thresholds"],
    veil: { depth: "otherworld", role: "The archetypal descent and its price" },
    tags: ["descent", "gates", "substitution"],
    sources: [
      {
        work: "etcsl-inana-descent",
        supports:
          "The composite Sumerian text: the seven gates, the stripping at each, the judgement, and Dumuzi taken as substitute alternating with his sister.",
      },
      {
        work: "sladek-1974",
        supports:
          "The critical edition, and the damaged and variant state of the tablets any reconstruction rests on.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "arbaeen",
    title: "Arba'een",
    subtitle: "A walk that becomes the largest annual gathering on earth",
    plain: "Millions of people walk together to Karbala, to mourn someone who was killed in the year 680.",
    culture: "Shi'a Muslim",
    place: { name: "Karbala", country: "Iraq", lat: 32.61, lng: 44.02 },
    continent: "West Asia",
    source: "living",
    evidence: "Living observance; modern scale documented in detail",
    summary:
      "Forty days after Ashura, millions walk to Karbala to mourn a death that occurred in 680 CE.",
    body: [
      "Pilgrims walk for days along routes lined with mawakib — free rest stations offering food, foot massage and sleeping space, run by volunteers. Black is worn; elegies are recited; the mourning is deliberately public and collective.",
      "Around twenty million make the walk — roughly ten times the Hajj. The Kumbh Mela draws more, but not every year, which is what makes the superlative here a narrow one.",
      "Forty days is a widely used mourning interval across the region, marked in Shi'a, Orthodox Christian and many Middle Eastern and Balkan customs alike.",
    ],
    note: "A major act of contemporary religious devotion. Included as a living mourning tradition at very large scale.",
    threads: ["return", "food"],
    remembrance: { cluster: "mourning", role: "Collective public mourning renewed annually" },
    calendar: { start: 250, end: 253, label: "20 Safar (moves through the solar year)", drift: "lunar", theme: "remembrance" },
    tags: ["pilgrimage", "mourning", "forty days"],
    sources: [
      {
        work: "arbaeen-religions-2020",
        supports:
          "The scale — around twenty million walking — and the mawakib that make it possible, from interviews with pilgrims across the 2014 and 2019 observances.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "amended" },
  },

  // ───────────────────────────────── AFRICA
  {
    id: "weighing-heart",
    title: "The Weighing of the Heart",
    subtitle: "A feather on the other side of the scale",
    plain: "Your heart goes on the scales against a feather, while you list all the things you never did.",
    culture: "Ancient Egyptian",
    place: { name: "Thebes / Luxor", country: "Egypt", lat: 25.72, lng: 32.63 },
    continent: "Africa",
    source: "historical",
    evidence: "Funerary papyri and tomb painting, c. 1550–50 BCE",
    summary:
      "The heart is weighed against the feather of Ma'at while the deceased recites a list of things they did not do.",
    body: [
      "Spell 125 of the Book of Going Forth by Day gives the 'negative confession' — I have not stolen, I have not caused pain, I have not polluted the water. Thoth records the verdict; Ammit waits to devour the heart that fails, which means annihilation rather than punishment.",
      "The texts were personalised products: scribes left blanks for the buyer's name. Ordinary Egyptians could not afford them, so surviving evidence is skewed toward elites.",
    ],
    note: "Reconstructed from funerary texts written for the wealthy; how the general population understood the afterlife is much less clear.",
    threads: ["descent", "thresholds"],
    veil: { depth: "otherworld", role: "Judgement as a weighing, with annihilation as the risk" },
    tags: ["judgement", "papyrus", "maat"],
    sources: [
      {
        work: "book-of-the-dead",
        supports:
          "Spell 125 itself: the negative confession, the heart weighed against Ma'at's feather, Thoth recording, and Ammit waiting — annihilation rather than punishment. The blanks left for a buyer's name are visible in the surviving papyri.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "anubis",
    title: "Anubis",
    subtitle: "The jackal at the desert edge",
    plain: "The god who guards the dead has the head of the jackal that came sniffing round the graves.",
    culture: "Ancient Egyptian",
    place: { name: "Saqqara", country: "Egypt", lat: 29.87, lng: 31.22 },
    continent: "Africa",
    source: "historical",
    evidence: "Iconography and texts from c. 3100 BCE onward; millions of votive mummies",
    summary:
      "The embalmer god, protector of the necropolis, imagined in the shape of the animal that scavenged its edges.",
    body: [
      "Anubis presides over mummification, guards the tomb and steadies the scales at the weighing. Priests wore jackal masks during embalming. The Anubieion at Saqqara held vast catacombs of votive dog and jackal mummies — around eight million animals.",
      "The choice of animal is usually read as apotropaic: the creature most likely to disturb a shallow desert grave was made its guardian.",
      "Which creature, exactly, is unsettled. Egyptology has called it a jackal for two centuries, but the North African canid that name pointed at was shown in 2011 not to be a golden jackal at all, and was reclassified in 2015 as the African golden wolf. Some Egyptologists argue the Anubis animal was never one species but an idealised canid. The god is older than the taxonomy and has outlasted two versions of it.",
    ],
    threads: ["animals", "descent"],
    veil: { depth: "passage", role: "Guardian and guide at the boundary of the necropolis" },
    entity: {
      kind: "sacred",
      shape: "quadruped",
      names: [
        { name: "Inpu / Anpu", lang: "Egyptian" },
        { name: "Ἄνουβις Anoubis", lang: "Greek" },
      ],
      earliest: "First Dynasty tomb inscriptions, c. 3100 BCE",
      earliestYear: -3100,
      range: "Egypt, especially desert-edge necropoleis; later across the Roman Mediterranean",
      traits: ["Black canine head", "Presides over embalming", "Guards the scale", "Colour of fertile silt, signifying rebirth"],
      development:
        "Chief god of the dead in the Old Kingdom, later subordinated to Osiris while keeping the practical work of embalming and guarding.",
    },
    tags: ["jackal", "embalming", "necropolis"],
    sources: [
      {
        work: "rueness-2011",
        supports:
          "That the North African canid long called a golden jackal is neither a golden jackal nor endemic to Egypt — the finding that led to its 2015 reclassification as the African golden wolf, and to the wobble under the word 'jackal' in every account of Anubis.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "amended" },
  },
  {
    id: "famadihana",
    title: "Famadihana",
    subtitle: "The turning of the bones",
    plain: "Every few years the tomb is opened, the ancestors are wrapped in fresh silk, and everyone dances with them.",
    culture: "Merina & Betsileo",
    place: { name: "Central Highlands", country: "Madagascar", lat: -19.5, lng: 47.0 },
    continent: "Africa",
    source: "living",
    evidence: "Living practice, though declining; well documented since the 19th century",
    summary:
      "Every few years a family tomb is opened, the ancestors rewrapped in fresh silk, carried, spoken to and danced with.",
    body: [
      "The razana — ancestors — are brought into the sun, their names spoken, news of the family delivered. New lamba mena shrouds are wrapped on, then the bodies are carried around the tomb before being replaced, sometimes deliberately disoriented so they cannot easily return.",
      "It is festive and expensive: brass bands, cattle, hundreds of guests. Practice has declined with Christian discouragement, cost, and a 2017 plague outbreak that led authorities to restrict it.",
    ],
    threads: ["return", "food"],
    remembrance: { cluster: "grave", role: "Periodic reopening and re-clothing of the ancestors" },
    calendar: { start: 213, end: 274, label: "Dry season, roughly August–October", drift: "variable", theme: "remembrance" },
    tags: ["tombs", "silk", "dancing"],
    sources: [
      {
        work: "bloch-1971",
        supports:
          "The razana and the tomb as the organising fact of Merina kinship — which is why reopening it is a family event rather than a morbid one, and why the expense is the point.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "egungun",
    title: "Egúngún",
    subtitle: "The ancestors arrive wearing cloth",
    plain: "The ancestors come back wearing huge spinning cloth. You must not touch the cloth.",
    culture: "Yorùbá",
    place: { name: "Ọ̀yọ́", country: "Nigeria", lat: 7.85, lng: 3.93 },
    continent: "Africa",
    source: "living",
    evidence: "Living masquerade institution with hereditary lineages",
    summary:
      "Layered panels of costly cloth spin through the town; inside is a masker, and present in the cloth are the collective dead.",
    body: [
      "Egúngún costumes are built from strips of imported and local textile, sometimes decades in the making and continually added to. The masker must not be touched and must not be recognised; attendants with switches keep the crowd back. The ancestors bless, warn, and sometimes chastise by name.",
      "The institution survived transatlantic displacement: related masquerade practice continues in Bahia, Brazil, where Egum houses were established in the nineteenth century.",
    ],
    note: "An active religious institution of Yorùbá communities, with its own initiation and authority structures.",
    threads: ["masks", "return"],
    remembrance: { cluster: "festival", role: "Ancestors made physically present in the town" },
    veil: { depth: "threshold", role: "The dead moving among the living, in daylight, by invitation" },
    calendar: { start: 152, end: 213, label: "Annual festivals, commonly June–August", drift: "variable", theme: "ancestors" },
    tags: ["masquerade", "textile", "lineage"],
    sources: [
      {
        work: "drewal-1978",
        supports:
          "Egúngún as a classified institution rather than a single figure, the layered cloth built up over years, and the rule that the masker is neither touched nor recognised.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "abiku",
    title: "Àbíkú and Ogbanje",
    subtitle: "The child who keeps leaving",
    plain: "A child who dies young, and is believed to come back to the same mother again and again.",
    culture: "Yorùbá & Igbo",
    place: { name: "Southern Nigeria", country: "Nigeria", lat: 6.6, lng: 5.6 },
    continent: "Africa",
    source: "living",
    evidence: "Living belief; extensive ethnographic and literary treatment",
    summary:
      "A child who dies young and is believed to return to the same mother repeatedly, bound by a pact made before birth.",
    body: [
      "Names given to such children are pleas or insults meant to make them stay — Málọmọ́ ('do not go again'), Kòsọ́kọ́ ('there is no hoe to dig a grave'). Marks may be cut into the body so the returning child can be recognised. Diviners search for and destroy the iyi-uwa, the hidden object binding the pact.",
      "Wole Soyinka and Chinua Achebe both wrote on the theme; medical literature has associated some cases with sickle-cell disease, which the belief long predates and does not simply reduce to.",
    ],
    note: "A framework for surviving repeated child death. Treating it only as superstition misses the naming, the grief and the strategy.",
    threads: ["return", "thresholds"],
    veil: { depth: "presence", role: "A soul cycling between worlds" },
    tags: ["children", "naming", "grief"],
    sources: [
      {
        work: "nzewi-2001",
        supports:
          "Of 100 children identified as malevolent ogbanje, 70 had sickle cell disease — and 68 of the families used death-related names.",
      },
      {
        work: "achebe-1958",
        supports:
          "The ogbanje as lived family experience, including the search for and destruction of the iyi-uwa.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "fantasy-coffins",
    title: "Abebuu Adekai",
    subtitle: "Coffins in the shape of a life",
    plain: "A fisherman is buried inside a giant carved fish. A pilot gets an aeroplane.",
    culture: "Ga",
    place: { name: "Teshie, Accra", country: "Ghana", lat: 5.58, lng: -0.11 },
    continent: "Africa",
    source: "living",
    evidence: "Documented origin in the mid-20th century; thriving practice",
    summary:
      "A fisherman is buried in a carved fish; a cocoa farmer in a cocoa pod; a pilot in an aeroplane.",
    body: [
      "The form is older than the story usually told about it. Figurative palanquins were carried by Ga chiefs in Accra by 1930, and Ataa Oko was building figurative coffins by 1945 — before Seth Kane Kwei, who is widely credited outside Ghana with inventing them around the 1950s. Kane Kwei's actual achievement was to take a chiefly form and make it available to everybody. Abebuu adekai means 'proverb boxes' — each coffin is a statement about the person.",
      "Funerals among the Ga are large, expensive and public; the coffin is displayed, photographed and discussed. Examples now sit in museum collections, which the workshops regard as a sideline to the actual burials.",
    ],
    threads: ["return"],
    remembrance: { cluster: "object", role: "A commissioned object that states who the person was" },
    tags: ["coffins", "craft", "proverb"],
    sources: [
      {
        work: "tschumi-2014",
        supports:
          "The field research that dismantled the standard origin story: figurative palanquins carried by Ga chiefs in Accra by 1930, Ataa Oko building figurative coffins by 1945, and Kane Kwei's real contribution as the man who opened a chiefly form to everyone.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "amended" },
  },
  {
    id: "tokoloshe",
    title: "Tokoloshe",
    subtitle: "Why some beds stand on bricks",
    plain: "A short hairy thing that troubles you in your sleep — which is why some beds stand up on bricks.",
    culture: "Zulu, Xhosa & neighbouring peoples",
    place: { name: "KwaZulu-Natal", country: "South Africa", lat: -29.0, lng: 30.5 },
    continent: "Africa",
    source: "folklore",
    evidence: "Widespread contemporary belief; ethnographic records from the 19th century",
    summary:
      "A short hairy being sent by an ill-wisher, said to trouble sleepers — which is why beds are sometimes raised out of reach.",
    body: [
      "Descriptions vary: dwarfish, hairy, water-dwelling, sometimes invisible except to children. It is usually understood as an instrument of witchcraft rather than an independent monster, sent to harass, steal or worse.",
      "Raising a bed on bricks is a widely reported precaution. Cases involving tokoloshe accusations still appear in South African courts and newspapers, where they intersect uncomfortably with law and psychiatry.",
    ],
    note: "This belief has real consequences, including violence against people accused of witchcraft. It is not a light subject locally.",
    threads: ["ward", "thresholds"],
    veil: { depth: "presence", role: "Harm sent into the household at night" },
    entity: {
      kind: "folk",
      shape: "humanoid",
      names: [
        { name: "utikoloshe", lang: "isiZulu / isiXhosa" },
        { name: "hili", lang: "isiXhosa, a related figure" },
      ],
      earliest:
        "Recorded in 19th-century missionary and ethnographic accounts; no single first attestation has been established, and the year below is an approximate position, not a citation",
      earliestYear: 1850,
      range: "South Africa, Lesotho, Eswatini, Zimbabwe",
      traits: ["Short and hairy", "Associated with rivers and reeds", "Sent rather than self-directed", "Cannot reach a raised bed"],
      development:
        "Once a water-being of regional lore, increasingly framed within witchcraft accusation in the colonial and post-colonial periods.",
    },
    tags: ["witchcraft", "night", "protection"],
    sources: [
      {
        work: "ashforth-2005",
        supports:
          "The tokoloshe as an instrument of witchcraft rather than a free-standing monster, and the record's warning that this belief has real consequences — accusation falling on the envied, the disliked and the outsider, and rising with economic stress.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "flagged" },
  },
  {
    id: "dama",
    title: "Dama",
    subtitle: "Masks that end a period of mourning",
    plain: "Years after the funeral, masks come to walk the dead out of the village for good.",
    culture: "Dogon",
    place: { name: "Bandiagara Escarpment", country: "Mali", lat: 14.35, lng: -3.61 },
    continent: "Africa",
    source: "living",
    evidence: "Documented since the 1930s; practice affected by recent conflict",
    summary:
      "Years after a death, a masked festival is held to move the dead definitively out of the village and into the ancestors.",
    body: [
      "Dama gathers many deaths into one collective rite. Masks include the towering sirige plank mask, kanaga, and animal forms; dancers perform on rooftops and in the public square over several days. The stated purpose is to make the dead leave.",
      "Marcel Griaule's mid-century accounts made Dogon cosmology famous and are now heavily criticised for over-systematising what he was told. Insecurity in central Mali since 2012 has disrupted the festivals themselves.",
    ],
    note: "Much popular writing on the Dogon derives from contested twentieth-century ethnography. Treat neat cosmological schemes with care.",
    threads: ["masks", "return"],
    remembrance: { cluster: "mourning", role: "Formal end of mourning and transfer to ancestor status" },
    tags: ["masks", "mourning", "ethnography"],
    sources: [
      {
        work: "vanbeek-1991",
        supports:
          "The field restudy that could not replicate Griaule's cosmology, and which grounds this record's caution about neat Dogon schemes.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "zar",
    title: "Zār",
    subtitle: "Living with the spirit rather than expelling it",
    plain: "The spirit is not chased out. It is asked its name, and then everyone learns to live with it.",
    culture: "Sudanese, Ethiopian & Egyptian",
    place: { name: "Omdurman", country: "Sudan", lat: 15.65, lng: 32.48 },
    continent: "Africa",
    source: "living",
    evidence: "Living healing tradition, mostly led by and for women",
    summary:
      "A spirit that has attached itself to a person is not driven out but identified, negotiated with, and accommodated.",
    body: [
      "Ceremonies use drumming, incense and specific rhythms that call particular spirits — each with a character, a costume, a preferred drink and a way of speaking. The afflicted person becomes host, and a long-term arrangement is made rather than a cure.",
      "Zār circles have historically been one of the few autonomous female social spaces in the societies where they operate, and are viewed with suspicion by some religious authorities as a result.",
    ],
    note: "A therapeutic and social institution, not a spectacle. Practice differs considerably between Sudan, Ethiopia, Somalia and Egypt.",
    threads: ["masks", "flame"],
    veil: { depth: "presence", role: "Spirits as long-term companions, not intruders" },
    tags: ["healing", "possession", "women"],
    sources: [
      {
        work: "boddy-1989",
        supports:
          "Two years' fieldwork in northern Sudan: accommodation rather than exorcism, spirits with distinct characters and appetites, and zār circles as autonomous female space.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },

  // ───────────────────────────────── OCEANIA
  {
    id: "sorry-business",
    title: "Sorry Business",
    subtitle: "Protocols of mourning across many nations",
    plain: "The rules for how to mourn — who speaks, who does not, what is put away, and for how long.",
    culture: "Aboriginal Australian",
    place: { name: "Central Australia", country: "Australia", lat: -23.7, lng: 133.88 },
    continent: "Oceania",
    source: "living",
    evidence: "Living protocols; practices differ substantially between nations",
    summary:
      "An umbrella term in Aboriginal English for the mourning period, its obligations, and the restrictions that come with it.",
    body: [
      "Practices vary widely between hundreds of distinct nations and language groups. Common features include extended community obligation to attend, avoidance of the deceased's name and image for a period, sometimes relocation from the house where the death occurred, and use of a substitute term such as 'Kumanjayi' in place of the name.",
      "Australian broadcasters and publications routinely carry warnings that content may contain images or voices of people who have died, in recognition of these protocols.",
    ],
    note: "There is no single Aboriginal death tradition. Specific rites belong to specific nations, and some knowledge is restricted by gender or initiation and not appropriate to publish.",
    threads: ["return", "thresholds"],
    remembrance: { cluster: "mourning", role: "Community-wide obligations following a death" },
    tags: ["mourning", "naming", "protocol"],
    sources: [
      // Both sources are published protocols, addressed to outsiders, about how
      // to behave.  Nothing restricted is cited here and nothing was added to
      // this record: the checking confirmed its refusal, it did not fill it in.
      {
        work: "aiatsis-cultural-sensitivity",
        supports:
          "The warnings carried by Australian broadcasters and publishers, and why: hearing recordings, seeing images or reading the names of people who have died may offend against strongly held prohibitions.",
      },
      {
        work: "qld-sorry-business",
        supports:
          "Sorry Business as the Aboriginal English term for the mourning period and the obligations that follow it, the prohibition on naming the deceased, and the variation between communities that makes any single description partial.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "bunyip",
    title: "Bunyip",
    subtitle: "A word that changed hands",
    plain: "A water being from Aboriginal tradition — then settlers wrote it down wrong, and kept the word anyway.",
    culture: "Aboriginal Australian & colonial Australian",
    place: { name: "Murray River basin", country: "Australia", lat: -34.5, lng: 143.5 },
    continent: "Oceania",
    source: "contested",
    evidence: "Aboriginal accounts recorded by colonists; nineteenth-century press reports",
    summary:
      "A water being of southeastern Aboriginal tradition, recorded — and substantially rewritten — by settlers from the 1810s.",
    body: [
      "Colonial newspapers from 1812 onward reported a creature in swamps and billabongs, and in 1847 a skull taken from the Murrumbidgee the year before was exhibited in Sydney as a 'bunyip', drawing crowds before being identified as a deformed horse or calf. Settler descriptions were wildly inconsistent: seal-like, emu-necked, dog-faced.",
      "The underlying Aboriginal traditions, from Wemba-Wemba and neighbouring languages, are not one creature and not necessarily what colonists made of them. Much of what circulates today is a settler composite.",
    ],
    note: "A clear case of a name being detached from its source tradition. Sources for the original beliefs are largely second-hand colonial records.",
    threads: ["water", "lights"],
    veil: { depth: "threshold", role: "The danger attributed to still water" },
    entity: {
      kind: "cryptid",
      shape: "aquatic",
      names: [
        { name: "banib / bunyip", lang: "Wemba-Wemba and related languages" },
        { name: "kianpraty", lang: "recorded regional name" },
      ],
      earliest: "Colonial report, 1812; the word printed in English from 1845",
      earliestYear: 1812,
      range: "Swamps, billabongs and rivers of southeastern Australia",
      traits: ["Booming call at night", "Associated with still or stagnant water", "Descriptions mutually contradictory"],
      accounts: [
        { when: "1845", what: "The word first printed in English, in the Geelong Advertiser of 2 July" },
        { when: "1846", what: "A malformed skull taken from the Murrumbidgee near Balranald" },
        { when: "1847", what: "The skull shown at the Australian Museum for two days; identified as a foal or calf, and a wave of sighting reports followed" },
      ],
      development:
        "Aboriginal water-being → colonial newspaper monster → children's book character. The stages are documented, and they are not the same creature.",
    },
    tags: ["colonial", "water", "misrecording"],
    sources: [
      {
        work: "sydney-gazette-1812",
        supports:
          "The earliest colonial notice, describing 'a large black animal like a seal, with a terrible voice'.",
      },
      {
        work: "geelong-advertiser-1845",
        supports:
          "The first appearance of the word in English print, alongside fossil bones shown to an Aboriginal informant.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "tangihanga",
    title: "Tangihanga",
    subtitle: "Three days in which the dead are never left alone",
    plain: "For three days somebody is always with the body. It is never left alone, and everyone grieves out loud.",
    culture: "Māori",
    place: { name: "Rotorua", country: "Aotearoa New Zealand", lat: -38.14, lng: 176.25 },
    continent: "Oceania",
    source: "living",
    evidence: "Living practice, central to marae life",
    summary:
      "The body lies in the wharenui, open-casket, surrounded by family who stay with it, speak to it, and grieve loudly.",
    body: [
      "Mourners arrive in groups and are formally welcomed with karanga; speeches address the deceased directly in the second person. Photographs of relatives already dead are brought and set around the casket. Kirimate — the close bereaved — remain beside the body continuously, and food is provided by the host marae throughout.",
      "Tangihanga takes precedence over almost all other commitments; employers in New Zealand generally recognise it. Burial is usually at an urupā, a cemetery associated with the marae, and hands are washed on leaving.",
    ],
    note: "Central to Māori life today, with tikanga varying between iwi. Attendance at a tangihanga is by relationship, not curiosity.",
    threads: ["food", "return", "water"],
    remembrance: { cluster: "mourning", role: "Continuous presence with the body before burial" },
    tags: ["marae", "grief", "speech"],
    sources: [
      {
        work: "teara-tangihanga",
        supports:
          "The three days, the marae, the karanga that welcomes each group, speaking to the deceased directly, and Te Ara's own assessment — that of all Māori customary practice, the rituals for the dead stand closest to their pre-contact form.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "taniwha",
    title: "Taniwha",
    subtitle: "Guardian, hazard, and legal consideration",
    plain: "Powerful beings belonging to particular rivers and harbours. Roads have been moved for them.",
    culture: "Māori",
    place: { name: "Waikato River", country: "Aotearoa New Zealand", lat: -37.8, lng: 175.3 },
    continent: "Oceania",
    source: "living",
    evidence: "Living tradition, iwi-specific; recorded in whakapapa and oral history",
    summary:
      "Powerful beings associated with particular rivers, harbours and stretches of coast — protective to their own people, dangerous to others.",
    body: [
      "Taniwha are tied to specific places and specific iwi or hapū, often named in genealogy and treated as kaitiaki, guardians. Some are said to have guided migration canoes; others mark hazardous water — a bend where the current kills.",
      "They enter contemporary public life: in 2002 a proposed expressway route near Meremere was altered after Ngāti Naho raised the taniwha Karu Tahi, a decision that provoked national argument about how such claims should be weighed.",
    ],
    note: "Often mistranslated as 'monster'. Taniwha are better understood as place-bound authorities with genealogies, not as creatures to be catalogued.",
    threads: ["water", "ward"],
    veil: { depth: "threshold", role: "Authority residing in a particular stretch of water" },
    entity: {
      kind: "sacred",
      shape: "serpent",
      names: [{ name: "taniwha", lang: "te reo Māori" }],
      earliest: "Pre-contact oral tradition; first written records early 19th century",
      earliestYear: 1300,
      range: "Rivers, harbours, caves and coastal waters throughout Aotearoa",
      traits: ["Bound to a named location", "Named in whakapapa", "Guardian to kin, hazard to strangers", "Forms vary — reptilian, log-like, shark-like"],
      development:
        "A category of place-authority, not a species. Colonial dictionaries flattened it into 'water monster'; recent decades have seen the term reclaimed in resource-management debate.",
    },
    tags: ["guardian", "rivers", "place"],
    sources: [
      {
        work: "teara-taniwha",
        supports:
          "Taniwha as place-bound kaitiaki named in whakapapa rather than a species, and their standing in contemporary resource-management debate.",
      },
      {
        work: "nzherald-karutahi",
        supports:
          "The 2002 State Highway 1 realignment at Meremere after Ngāti Naho raised Karu Tahi — 'one eye' — whose swamp lay on the route.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "amended" },
  },
  {
    id: "moai",
    title: "Moai and the Ancestral Face",
    subtitle: "Statues that look inland, at the living",
    plain: "Nearly a thousand stone ancestors stand with their backs to the sea, watching the village.",
    culture: "Rapa Nui",
    place: { name: "Rapa Nui / Easter Island", country: "Rapa Nui (Chile)", lat: -27.12, lng: -109.37 },
    continent: "Oceania",
    source: "reconstructed",
    evidence: "Archaeology, oral history, and contested colonial-era interpretation",
    summary:
      "Nearly a thousand carved ancestors stand on platforms with their backs to the sea, facing the settlements they watch over.",
    body: [
      "Moai are understood as representations of lineage ancestors, carved at Rano Raraku and moved — probably walked upright with ropes — to ahu platforms holding burials. Their eyes, of coral and obsidian, were installed only once the statue was in place, activating its mana.",
      "The old story of ecological self-destruction has been substantially revised: rats, disease, slave raiding and colonial disruption now feature far more heavily in current accounts than 'ecocide'.",
    ],
    note: "Interpretations have shifted markedly in recent decades, and Rapa Nui people contest several long-standing outside narratives about their own past.",
    threads: ["return"],
    remembrance: { cluster: "object", role: "Monumental ancestors positioned to face the living" },
    tags: ["ancestors", "stone", "archaeology"],
    sources: [
      {
        work: "rapanui-2024",
        supports:
          "Ancient genomes showing no pre-European population collapse — the study that turned the record's cautious 'substantially revised' into the settled position. Rapa Nui held a small, stable population for centuries; the ecocide story was never in the DNA.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
];
