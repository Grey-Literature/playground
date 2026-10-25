import type { Record } from "./types.ts";

/** Europe and the Americas */
export const RECORDS_B: Record[] = [
  // ───────────────────────────────── EUROPE
  {
    id: "samhain",
    title: "Samhain",
    subtitle: "The end of the bright half of the year",
    plain: "The night summer ends, when the doors in the hills are said to stand open.",
    culture: "Irish & Gaelic",
    place: { name: "Tlachtga / Hill of Ward, Meath", country: "Ireland", lat: 53.58, lng: -6.83 },
    continent: "Europe",
    source: "reconstructed",
    evidence: "Medieval Irish manuscripts, later folklore collections, archaeology",
    summary:
      "A turning point between summer and winter when, in the tales, the boundary between worlds thins and the síd stand open.",
    body: [
      "Medieval literature places supernatural events at Samhain: the Otherworld mounds open, Fionn confronts a fire-breathing being, kings are killed. Nineteenth and twentieth-century folklore collections record divination games, apple and nut rituals, mummers going door to door, and food set aside for the dead.",
      "Much of what is confidently asserted about pre-Christian Samhain — Celtic priesthoods, festivals of a 'god of the dead' — comes from Victorian speculation rather than evidence. The medieval texts were written by Christian monks centuries after the fact.",
    ],
    note: "One of the most over-claimed dates in popular history. The medieval and folkloric record is real; the confident pagan reconstructions largely are not.",
    threads: ["thresholds", "masks", "food", "flame"],
    veil: { depth: "threshold", role: "A seasonal opening between this world and the síd" },
    calendar: { start: 304, end: 305, label: "31 October – 1 November", drift: "fixed", theme: "boundary" },
    tags: ["seasonal", "otherworld", "divination"],
    sources: [
      {
        work: "hutton-1996",
        supports:
          "The medieval Irish and later folkloric record, and the record's central caution — that the confident pagan reconstructions of Samhain are Victorian speculation. Hutton finds the evidence for a major 'Celtic' fire festival notably weaker than for Beltane.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "all-souls",
    title: "All Souls' Day and the Ossuary",
    subtitle: "The dead counted, prayed for, and stacked",
    plain: "One day a year for praying for every dead person — and in crowded graveyards, the bones got stacked up.",
    culture: "Western Christian",
    place: { name: "Sedlec, Kutná Hora", country: "Czechia", lat: 49.95, lng: 15.29 },
    continent: "Europe",
    source: "living",
    evidence: "Continuous observance since the 10th century; ossuaries documented from the medieval period",
    summary:
      "On 2 November the church prays for all the dead; in crowded burial grounds their bones were also, quite practically, rearranged.",
    body: [
      "Odilo of Cluny fixed the commemoration around 998, following All Saints on 1 November. Graves are visited and candles lit across Catholic Europe and Latin America; in Poland, Zaduszki fills cemeteries with tens of thousands of lights in a single night.",
      "Where ground was scarce, bones were exhumed and stored. The Sedlec ossuary holds the remains of perhaps 40,000 people, arranged into architecture in 1870 by the woodcarver František Rint — an act of decoration, but also of accounting.",
    ],
    threads: ["flame", "return"],
    remembrance: { cluster: "grave", role: "Prayer, candles and the management of bones" },
    calendar: { start: 306, label: "2 November", drift: "fixed", theme: "remembrance" },
    tags: ["candles", "bones", "catholic"],
    sources: [
      {
        work: "vatican-all-souls",
        supports:
          "That Odilo of Cluny made the 2 November commemoration obligatory across the Cluniac houses in 998, and that it spread from there into the Western Church at large.",
      },
      {
        work: "sedlec-ossuary",
        supports:
          "The Sedlec arrangement: bones of roughly 40,000 people, ordered into architecture by the woodcarver František Rint under a Schwarzenberg commission, his own signature laid out in bone by the door.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "parentalia",
    title: "Parentalia and Lemuria",
    subtitle: "Rome's two very different arrangements with the dead",
    plain: "In February Romans ate dinner at their family tombs. In May they threw beans over one shoulder at everyone else's.",
    culture: "Ancient Roman",
    place: { name: "Rome", country: "Italy", lat: 41.9, lng: 12.5 },
    continent: "Europe",
    source: "reconstructed",
    evidence: "Ovid's Fasti, inscriptions, tomb archaeology; details uncertain",
    summary:
      "In February families dined at the tombs of their own dead. In May the householder threw beans over his shoulder to get rid of everyone else's.",
    body: [
      "Parentalia (13–21 February) was affectionate and domestic: offerings of wine, bread, violets and milk brought to family tombs on the roads out of the city, closing on the 21st with the Feralia. The Caristia came the day after, on the 22nd, and turned the other way — a banquet for the living members of the household, a reconciliation dinner. Ovid notes drily that the peace was kept by leaving the troublesome relatives off the list. Some tombs had pipes built in for pouring libations directly to the remains.",
      "Lemuria (9, 11, 13 May) was its opposite. Ovid describes the father of the household rising at midnight, walking barefoot, spitting out black beans and repeating nine times: 'With these I redeem me and mine.' Restless lemures were to take the beans and leave.",
    ],
    note: "Ovid is a poet, not a field ethnographer, and is our main source for Lemuria. The rite may have been less tidy than his verse suggests.",
    threads: ["food", "ward", "thresholds"],
    remembrance: { cluster: "offering", role: "Feeding one's own dead; expelling the rest" },
    calendar: { start: 44, end: 52, label: "Parentalia 13–21 Feb; Lemuria 9–13 May", drift: "fixed", theme: "ancestors" },
    tags: ["rome", "beans", "tombs"],
    sources: [
      {
        work: "ovid-fasti",
        supports:
          "The Lemuria rite in Book V — the father rising at midnight, barefoot, spitting black beans and repeating the formula nine times — and the Parentalia offerings in Book II. Ovid is the main source for Lemuria and he is a poet, which the record says out loud.",
      },
      {
        work: "scullard-1981",
        supports:
          "The Roman festival calendar: Parentalia 13–21 February closing with the Feralia on the 21st, the Caristia falling separately on the 22nd, and Lemuria on 9, 11 and 13 May.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "anthesteria",
    title: "Anthesteria",
    subtitle: "Wine, doorposts and pitch",
    plain: "Three days of wine with pitch smeared on the doorposts, and on the last day the dead were told out loud to leave.",
    culture: "Ancient Athenian",
    place: { name: "Athens", country: "Greece", lat: 37.98, lng: 23.73 },
    continent: "Europe",
    source: "reconstructed",
    evidence: "Scattered classical references and vase painting; substantially conjectural",
    summary:
      "A three-day spring wine festival whose final day belonged to the dead — after which they were told, out loud, to leave.",
    body: [
      "Day one opened the new wine; day two involved a silent drinking contest, each person at their own table, and a rite of pollution and separation. On the third day, Chytroi, pots of grain and seed were cooked for the dead and for Hermes Chthonios.",
      "Households are said to have chewed buckthorn and smeared pitch on the doorposts to keep spirits out, and to have ended the festival with the cry 'Out, keres, the Anthesteria is over.' The formula is recorded late and may be a scholiast's invention.",
    ],
    note: "Reconstructed from fragmentary sources centuries apart. Confident modern descriptions of Anthesteria smooth over considerable scholarly disagreement.",
    threads: ["thresholds", "food", "return", "ward"],
    veil: { depth: "threshold", role: "Doorways treated as the point of entry for the dead" },
    calendar: { start: 42, end: 44, label: "11–13 Anthesterion (Feb–Mar)", drift: "variable", theme: "spirits" },
    tags: ["athens", "wine", "doorposts"],
    sources: [
      {
        work: "parker-2005",
        supports:
          "The three days — Pithoigia, Choes, Chytroi — the silent drinking at separate tables, the pots cooked for Hermes Chthonios, and the fragmentary state of the evidence that the record's note warns about. The closing cry is transmitted by scholiasts, and even its wording is contested: keres, spirits, or Kares, Carians.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "charon-obol",
    title: "Charon's Obol",
    subtitle: "A coin for the ferryman",
    plain: "A coin in the mouth of the dead, so they can pay the ferryman.",
    culture: "Ancient Greek & Roman",
    place: { name: "Attica & the Mediterranean", country: "Greece", lat: 38.2, lng: 23.5 },
    continent: "Europe",
    source: "historical",
    evidence: "Literary references plus coins recovered from burials across the Mediterranean",
    summary:
      "A small coin placed in or on the mouth of the dead to pay for passage across the Acheron.",
    body: [
      "Aristophanes jokes about the fare in The Frogs, and archaeologists have recovered coins in the mouths, hands and eye-sockets of burials from Greece, Italy, Iberia and Roman Britain. The practice was never universal — most excavated burials of the period contain no coin at all.",
      "In many graves the coin is worthless or foreign, suggesting the gesture mattered more than the amount. Later Christian burials in the same regions occasionally continue it, which has been read as habit rather than belief.",
    ],
    note: "A well-attested but inconsistent practice. The tidy literary image of Charon and his fare is more uniform than the archaeological record.",
    threads: ["water", "descent"],
    veil: { depth: "passage", role: "A paid crossing by water" },
    remembrance: { cluster: "object", role: "A small object placed with the body" },
    tags: ["ferry", "coins", "burial"],
    sources: [
      {
        work: "stevens-1991",
        supports:
          "The gap between the literary image and the excavated record: coins found in mouths, hands and eye-sockets across the Mediterranean, but absent from most burials of the period, and frequently worthless or foreign where they do appear.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "psychosavvato",
    title: "Psychosavvato and Kollyva",
    subtitle: "Boiled wheat, and the names read aloud",
    plain: "A dish of boiled wheat brought to church, with a list of names to be read out.",
    culture: "Greek Orthodox",
    place: { name: "Greece", country: "Greece", lat: 39.0, lng: 22.0 },
    continent: "Europe",
    source: "living",
    evidence: "Living liturgical practice with Byzantine roots",
    summary:
      "On Souls' Saturdays families bring a dish of boiled wheat, sugar and pomegranate to church, with a list of names to be read.",
    body: [
      "Kollyva is decorated with icing sugar, silver dragées and often the initials of the deceased. The wheat grain is explained by reference to the seed that must die to bear fruit; after the memorial service the dish is shared out among the congregation.",
      "Similar boiled-grain dishes appear across the Orthodox and post-Ottoman world — koljivo in Serbia, colivă in Romania, ashure with a different emphasis in Turkey — a broad regional habit of feeding the living in the name of the dead.",
    ],
    threads: ["food", "return"],
    remembrance: { cluster: "offering", role: "A shared dish attached to a list of names" },
    calendar: { start: 55, end: 62, label: "Souls' Saturdays before Lent and at Pentecost", drift: "variable", theme: "remembrance" },
    tags: ["wheat", "liturgy", "names"],
    sources: [
      {
        work: "danforth-1982",
        supports:
          "Kollyva and the memorial services it belongs to, the reading of names, and the distribution of food as the mechanism by which a village keeps its dead in circulation.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "sin-eating",
    title: "Sin-Eating",
    subtitle: "A meal taken across the coffin",
    plain: "A poor man was paid to eat bread passed over the coffin, and take the dead person's sins with it.",
    culture: "Welsh Marches & English border counties",
    place: { name: "Shropshire & Herefordshire", country: "United Kingdom", lat: 52.36, lng: -2.75 },
    continent: "Europe",
    source: "historical",
    evidence: "Antiquarian accounts from 1686 onward; a small number of documented individuals",
    summary:
      "A poor person was paid to eat bread and drink ale passed over the corpse, taking on the sins of the deceased.",
    body: [
      "John Aubrey described the custom in 1686, naming a sin-eater in Herefordshire and setting the fee at sixpence. Later accounts add a bowl of ale, a loaf, and the sin-eater's immediate departure. Richard Munslow of Ratlinghope, who died in 1906, is often called the last, though he was a farmer performing it as a revival rather than for pay.",
      "How widespread the custom really was is disputed. It appears mainly in antiquarian writing, which had a documented appetite for picturesque survivals from the peasantry.",
    ],
    note: "Attested, but by a small number of observers with an interest in curiosities. Its frequency is genuinely uncertain.",
    threads: ["food", "thresholds"],
    remembrance: { cluster: "mourning", role: "Transfer of moral burden through a meal" },
    tags: ["bread", "sin", "antiquarian"],
    sources: [
      {
        work: "aubrey-1686",
        supports:
          "The 1686 description, the Herefordshire sin-eater, the sixpence fee, and the mazard bowl one woman is said to have kept ready for years before her death.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "ankou",
    title: "Ankou",
    subtitle: "The cart heard before it is seen",
    plain: "The last person to die each year drives the cart. You hear the wheels before you see anything.",
    culture: "Breton",
    place: { name: "Finistère, Brittany", country: "France", lat: 48.25, lng: -4.1 },
    continent: "Europe",
    source: "folklore",
    evidence: "Breton oral tradition; church carving; systematically collected at the end of the 19th century",
    summary:
      "The last person to die in a parish each year becomes its Ankou, driving a creaking cart to collect the dead for the next twelve months.",
    body: [
      "The karrigell an Ankou is heard at night — a badly greased axle. Two companions walk beside it; the Ankou itself is tall, thin, wide-hatted, and carries a scythe fitted to cut on the upstroke. To see it, or to help lift the fallen, is to die soon.",
      "Ankou appears carved on ossuary walls and church porches across Brittany, particularly in the Enclos Paroissiaux of Finistère, where it is shown as a skeleton with a spear rather than a scythe.",
    ],
    threads: ["crossroads", "animals"],
    veil: { depth: "passage", role: "A rotating parish office of collecting the dead" },
    entity: {
      kind: "folk",
      shape: "humanoid",
      names: [
        { name: "an Ankou", lang: "Breton" },
        { name: "karrigell an Ankou", lang: "Breton, 'the cart of the Ankou'" },
      ],
      earliest: "Church carvings from the 15th–17th centuries; systematically collected by Anatole Le Braz, fieldwork from 1886, published 1893",
      earliestYear: 1450,
      range: "Brittany, with related figures in Cornwall and Ireland",
      traits: ["Broad-brimmed hat", "Creaking cart heard at night", "Scythe that cuts upward", "Office passes to the year's last dead"],
      development:
        "A Breton personification distinct from the pan-European Danse Macabre skeleton, though church art blurred the two.",
    },
    tags: ["cart", "parish", "brittany"],
    sources: [
      {
        work: "lebraz-1893",
        supports:
          "The Ankou as the parish's last dead of the year, the creaking karrigell heard before it is seen, the two walking companions, and the rule that to see it or help it is to die soon. Le Braz collected these in Trégor and Cornouaille from 1886.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "amended" },
  },
  {
    id: "wild-hunt",
    title: "The Wild Hunt",
    subtitle: "Something passing overhead in the dark of the year",
    plain: "Riders and hounds pass overhead in the winter storms. If you see them, lie face-down.",
    culture: "Germanic, Nordic, Slavic & British",
    place: { name: "Northern Europe", country: "Germany", lat: 51.5, lng: 10.0 },
    continent: "Europe",
    source: "folklore",
    evidence: "Chronicle accounts from the 12th century; extensive 19th-century folklore collection",
    summary:
      "A spectral procession of riders, hounds and the dead, heard in midwinter storms; those who see it are warned to lie face-down.",
    body: [
      "The Peterborough Chronicle records a sighting in 1127: black huntsmen on black horses, blowing horns through the night. Local traditions name the leader variously — Wotan, Herne, King Arthur, Perchta, Herlathing, Gwyn ap Nudd — reflecting local figures rather than a single myth.",
      "In many regions the hunt gathers the recently dead, or the unbaptised. Leaving food out, staying indoors, and not answering when called are the standard precautions.",
    ],
    note: "Jacob Grimm assembled scattered regional traditions into one 'Wild Hunt' in 1835. That synthesis shaped everything written since, and may be tidier than the sources.",
    threads: ["crossroads", "return", "ward"],
    veil: { depth: "presence", role: "The dead in motion, above the roads" },
    calendar: { start: 356, end: 6, label: "Midwinter nights, chiefly the Twelve Nights", drift: "fixed", theme: "boundary" },
    tags: ["midwinter", "riders", "storm"],
    sources: [
      {
        work: "grimm-1835",
        supports:
          "The 1835 synthesis itself — the book that gathered scattered regional processions under one name and gave the Wild Hunt its Wotan. The record's note is a caution about this source, not a citation of it as fact.",
      },
      {
        work: "hutton-2014",
        supports:
          "That the regional traditions are more various than Grimm's assembly suggests, and that the named leaders are local figures rather than survivals of one myth.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "will-o-wisp",
    title: "Ignis Fatuus",
    subtitle: "The light that goes out when you reach it",
    plain: "A small flame out on the marsh. Walk towards it and it goes out, and lights somewhere else.",
    culture: "European & worldwide",
    place: { name: "Fenland & Northern Europe", country: "United Kingdom", lat: 52.6, lng: 0.1 },
    continent: "Europe",
    source: "folklore",
    evidence: "Reports across many centuries; competing natural explanations, none conclusive",
    summary:
      "A pale flame over marsh and bog, said to lead travellers off the path — sometimes a soul, sometimes a trickster, sometimes gas.",
    body: [
      "Names are local and numerous: will-o'-the-wisp, jack-o'-lantern, hobby lantern, corpse candle in Wales, feu follet in France and Quebec, aleya in Bengal, boi-tatá in Brazil. Many traditions identify the light as a soul barred from both heaven and hell, or as a marker of a death to come.",
      "Proposed causes include phosphine and methane ignition, bioluminescent fungi, and misidentified barn owls, whose plumage can glow faintly. Laboratory reproduction has been partial at best, and sightings have declined with the draining of wetlands.",
    ],
    note: "A rare case where a folk phenomenon has plausible physical explanations that remain unproven, and where the belief and the observation are both real.",
    threads: ["lights", "crossroads"],
    veil: { depth: "threshold", role: "A light off the path, and the decision to follow it" },
    entity: {
      kind: "folk",
      shape: "light",
      names: [
        { name: "ignis fatuus", lang: "Latin, 'foolish fire'" },
        { name: "canwyll corff", lang: "Welsh, 'corpse candle'" },
        { name: "feu follet", lang: "French" },
        { name: "aleya", lang: "Bengali" },
      ],
      earliest: "Medieval references; systematic collection from the 17th century",
      earliestYear: 1200,
      range: "Marsh, bog, fen and graveyard worldwide",
      traits: ["Pale blue or yellow", "Recedes as approached", "Low over wet ground", "Reported most in still, damp conditions"],
      development:
        "Sightings declined sharply through the 19th and 20th centuries as wetlands were drained — an unusual correlation between a folklore figure and a land-use change.",
    },
    tags: ["marsh", "lights", "travellers"],
    sources: [
      {
        work: "mills-2000",
        supports:
          "The proposed physical causes and how far each survives testing — phosphine and methane ignition chief among them — and the record's central point, that laboratory reproduction has never been more than partial.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "krampus-perchten",
    title: "Krampus and the Perchten",
    subtitle: "Midwinter visitors with bells and carved faces",
    plain: "In December, carved wooden faces and heavy bells come through the town after dark.",
    culture: "Alpine (Austrian, Bavarian, Slovenian)",
    place: { name: "Salzburg & the Eastern Alps", country: "Austria", lat: 47.5, lng: 13.0 },
    continent: "Europe",
    source: "living",
    evidence: "Living practice; earliest firm documentation 17th century onward",
    summary:
      "Costumed figures in carved wooden masks and heavy bells move through Alpine towns in December and early January.",
    body: [
      "Krampus accompanies St Nicholas on 5 December, threatening children with birch switches. The Perchtenlauf, associated with Frau Perchta and running through the Twelve Nights to Epiphany, is older in feel and often understood as driving out winter. Masks are individually carved and can weigh several kilos.",
      "The church repeatedly attempted suppression; the runs continued. Nineteenth-century Krampuskarten postcards popularised the imagery, and the last two decades have seen deliberate revival — and export — of the tradition.",
    ],
    note: "Claims of unbroken pagan descent are common and largely unevidenced. The documented history is early modern, which does not make it shallow.",
    threads: ["masks", "flame", "ward"],
    remembrance: { cluster: "festival", role: "Masked visitors admitted to the town in midwinter" },
    calendar: { start: 339, end: 5, label: "5 December; Perchtenlauf through the Twelve Nights", drift: "fixed", theme: "boundary" },
    tags: ["masks", "bells", "alpine"],
    sources: [
      {
        work: "unesco-at-inventory",
        supports:
          "The living Alpine practice as Austria records it on its own national inventory: Perchten in Gastein (inscribed 2011), the Öblarner Krampusspiel (2014), and St Nicholas plays at Reith (2014) and Bad Mitterndorf (2020), the latter held each year on 5 December.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "dziady",
    title: "Dziady and Radunitsa",
    subtitle: "Setting a place at the table for the grandfathers",
    plain: "You lay an extra place at the table for the grandfathers, and nobody clears it until morning.",
    culture: "Belarusian, Polish, Lithuanian & Ukrainian",
    place: { name: "Belarusian countryside", country: "Belarus", lat: 53.9, lng: 27.6 },
    continent: "Europe",
    source: "living",
    evidence: "19th-century ethnography; Radunitsa continues as a public holiday",
    summary:
      "Ancestors are invited to eat, a portion is set aside, and no one clears the table until morning.",
    body: [
      "Ethnographic accounts describe an extra place laid, food and vodka poured onto the floor or a corner, doors and windows left ajar, and the dead addressed by name. Adam Mickiewicz's drama Dziady (1823) made the rite a national symbol in partitioned Poland.",
      "Radunitsa — in Belarus also called the spring Dziady — falls on the Tuesday of St Thomas week, nine days after Orthodox Easter, and remains a state holiday there: families eat at the graveside, leave eggs and bread on the graves, and treat the visit as a meal with relatives rather than a solemn duty.",
    ],
    threads: ["food", "return", "thresholds"],
    remembrance: { cluster: "offering", role: "A place set at the family table" },
    calendar: { start: 111, end: 113, label: "Radunitsa, ninth day after Orthodox Easter; autumn Dziady in November", drift: "variable", theme: "ancestors" },
    tags: ["table", "graves", "eggs"],
    sources: [
      {
        work: "mickiewicz-1823",
        supports:
          "The 1823 drama that made the rite a national symbol in partitioned Poland — Parts II and IV appeared that year, Part III in 1832.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "amended" },
  },
  {
    id: "rusalka",
    title: "Rusalka",
    subtitle: "In the water in summer, in the rye in Rusalnaya week",
    plain: "Girls who drowned. In summer they are in the water, and for one week of the year they are out in the rye.",
    culture: "East Slavic",
    place: { name: "Dnieper basin", country: "Ukraine", lat: 50.45, lng: 30.52 },
    continent: "Europe",
    source: "folklore",
    evidence: "Village tradition recorded from the 18th century; regionally variable",
    summary:
      "Spirits of women and girls who drowned or died unmarried, associated with water, birch trees and the growing grain.",
    body: [
      "In northern Russian tradition rusalki are dangerous and dishevelled; in Ukrainian and southern tradition they are often beautiful and connected to the fertility of the fields. During Rusalnaya week after Trinity Sunday they were said to leave the water, swing in birch branches and walk through the rye — and swimming was avoided.",
      "The week ended with a ritual 'seeing off': a straw effigy carried out of the village and destroyed. Nineteenth-century opera and ballet reshaped the rusalka into a romantic water-maiden, a version now more familiar than the village one.",
    ],
    threads: ["water", "lights"],
    veil: { depth: "presence", role: "The unmarried and drowned dead, seasonally abroad" },
    entity: {
      kind: "folk",
      shape: "aquatic",
      names: [
        { name: "русалка rusalka", lang: "Russian / Ukrainian" },
        { name: "mavka", lang: "Ukrainian, a related figure" },
      ],
      earliest: "First written references 18th century; substantial collection from the 1840s",
      earliestYear: 1750,
      range: "Ukraine, Belarus, Russia, eastern Poland",
      traits: ["Loose unbound hair", "Associated with birch and rye", "Active during Rusalnaya week", "Laughs, sings, and tickles"],
      variants: ["Northern Russian: hostile and hag-like", "Ukrainian: youthful and field-associated"],
      development:
        "A field-and-water spirit reworked into a romantic figure by Pushkin, Dvořák and the ballet stage.",
    },
    tags: ["drowning", "rye", "birch"],
    sources: [
      {
        work: "ivanits-1989",
        supports:
          "The north–south split between the hag-like Russian rusalka and the youthful field-associated Ukrainian one, Rusalnaya week following Trinity, and the provody rusalki that closes it — an effigy carried out of the village and destroyed.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "draugr",
    title: "Draugr",
    subtitle: "The one who stays in the mound",
    plain: "The dead man stays inside his grave mound, swollen and blue-black, guarding his things.",
    culture: "Old Norse & Icelandic",
    place: { name: "Iceland & Norway", country: "Iceland", lat: 64.5, lng: -19.0 },
    continent: "Europe",
    source: "historical",
    evidence: "Icelandic sagas, 13th–14th century, describing earlier centuries",
    summary:
      "A corpse that remains animate in its grave mound, heavy, swollen and blue-black, guarding its goods and troubling the farm.",
    body: [
      "Grettis saga's Glámr and Eyrbyggja saga's Þórólfr are the classic cases: livestock die, shepherds are found broken, the household sickens. The remedy is physical — reopen the mound, behead the corpse, lay the head at the thigh, and burn the remains, scattering the ash at sea.",
      "Eyrbyggja saga also records a 'door-court', a formal legal summons served on the dead, who then file out of the house one by one. Even hauntings were subject to procedure.",
    ],
    note: "Written down by Christian authors two or more centuries after the events described. The sagas are literature about the past, not transcripts of belief.",
    threads: ["return", "ward", "thresholds"],
    veil: { depth: "presence", role: "The dead who stay physically present" },
    entity: {
      kind: "legend",
      shape: "humanoid",
      names: [
        { name: "draugr", lang: "Old Norse" },
        { name: "haugbúi", lang: "Old Norse, 'mound-dweller'" },
        { name: "aptrgangr", lang: "Old Norse, 'again-walker'" },
      ],
      earliest: "Icelandic sagas written c. 1200–1350",
      earliestYear: 1250,
      range: "Iceland, Norway, the Norse North Atlantic",
      traits: ["Corporeal and immensely heavy", "Hel-blár — corpse-blue", "Can swell in size", "Guards grave goods"],
      development:
        "A saga figure, later a fixture of fantasy games. The medieval draugr is a physical problem for a farm, not a wraith.",
    },
    tags: ["sagas", "mounds", "iceland"],
    sources: [
      {
        work: "armann-2009",
        supports:
          "Glámr in Grettis saga as the type case, the draugr as a corporeal problem rather than a wraith, and the record's own warning — that these are Christian texts written centuries after the events, and that reading the draugr as a 'vampire' is a Victorian import dating to Andrew Lang in 1897.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "huldufolk",
    title: "Huldufólk",
    subtitle: "Rocks that road crews are asked to work around",
    plain: "Hidden people live inside certain rocks. Road crews have been asked to build around them.",
    culture: "Icelandic",
    place: { name: "Reykjavík & rural Iceland", country: "Iceland", lat: 64.14, lng: -21.9 },
    continent: "Europe",
    source: "contested",
    evidence: "Folk tradition; documented modern planning disputes; belief levels much argued over",
    summary:
      "Hidden people said to live inside particular stones and outcrops, whose homes are occasionally routed around by construction projects.",
    body: [
      "Nineteenth-century collections by Jón Árnason record huldufólk as a parallel society — farming, marrying, holding church services — visible only when they choose. Specific rocks are known locally as their houses.",
      "Road projects at Álftanes in 2013 and elsewhere have been redirected after protest. Icelanders frequently note that headline claims about widespread literal belief are exaggerated by foreign media; the more common position is a reluctance to be the one who bulldozes the rock.",
    ],
    note: "Survey figures on belief are frequently misquoted abroad. Cultural attachment to specific places is easier to document than the belief itself.",
    threads: ["thresholds", "ward"],
    veil: { depth: "threshold", role: "A parallel population attached to specific stones" },
    tags: ["stones", "planning", "belief"],
    sources: [
      {
        work: "arnason-1862",
        supports:
          "The nineteenth-century collection recording huldufólk as a parallel society — farming, marrying, holding church services.",
      },
      {
        work: "cbc-galgahraun-2013",
        supports:
          "The 2013 road dispute at Gálgahraun near Álftanes, and the protest and legal action that halted it.",
      },
      {
        work: "smithsonian-galgahraun-2013",
        supports: "Independent contemporary coverage of the same dispute.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "vampire-reports",
    title: "The Habsburg Vampire Reports",
    subtitle: "Military paperwork about the walking dead",
    plain: "Army officers were sent to villages where the dead were said to be walking, and filed signed reports about it.",
    culture: "Serbian & Habsburg frontier",
    place: { name: "Medveđa, Serbia", country: "Serbia", lat: 42.84, lng: 21.58 },
    continent: "Europe",
    source: "historical",
    evidence: "Official Austrian medical and military reports, 1725–1732",
    summary:
      "Imperial officials were sent to investigate villages reporting that the dead were returning — and filed formal, signed reports.",
    body: [
      "The 1732 report Visum et Repertum, signed by regimental surgeon Johann Flückinger, describes the exhumation of seventeen bodies at Medveđa, noting which appeared 'unverwest' — undecayed — and recording the villagers' account of Arnold Paole. The bodies were beheaded and burned.",
      "The reports circulated across European newspapers and set off a decade of learned argument, from Dom Augustin Calmet's treatise to Maria Theresa's physician Gerard van Swieten, who dismissed the whole business. The Serbian word vampir entered German, then French and English, from these documents.",
    ],
    note: "The documents are genuine and detailed. What they record is villagers' testimony and officials' observations of ordinary decomposition, not evidence of revenants.",
    threads: ["return", "ward"],
    veil: { depth: "presence", role: "An administrative encounter with the returning dead" },
    entity: {
      kind: "folk",
      shape: "humanoid",
      names: [
        { name: "вампир vampir", lang: "Serbian" },
        { name: "strigoi", lang: "Romanian" },
        { name: "upír", lang: "West Slavic" },
      ],
      earliest: "Slavic folk belief long predates the documents; the reports date from 1725 and 1732",
      earliestYear: 1725,
      range: "Balkans and Carpathians; the literary vampire spread from here",
      traits: ["Body reported undecayed", "Blood at the mouth", "Nocturnal visits to relatives", "Destroyed by beheading and burning"],
      accounts: [
        { when: "1725", what: "Report on Petar Blagojević, Kisiljevo — nine deaths attributed to a revenant" },
        { when: "1732", what: "Visum et Repertum, Medveđa — seventeen exhumations described in clinical detail" },
      ],
      development:
        "Village belief → Habsburg medical report → Enlightenment controversy → Polidori and Stoker. The literary vampire is downstream of a bureaucratic document.",
    },
    tags: ["archive", "exhumation", "enlightenment"],
    sources: [
      {
        work: "fluckinger-1732",
        supports:
          "The report itself: the exhumations at Medveđa, the villagers' account of Arnold Paole, and the beheading and burning of the bodies.",
      },
      {
        work: "barber-1988",
        supports:
          "The standard English translation of the report, and the forensic reading of the 'undecayed' bodies as ordinary decomposition.",
      },
      {
        work: "magia-posthuma-vetr",
        supports: "That the commission opened seventeen graves at Medveđa.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 9, status: "amended" },
  },
  {
    id: "kelpie",
    title: "Kelpie and Each-uisge",
    subtitle: "The horse at the loch side is a poor idea",
    plain: "The horse by the water wants you to get on. Its skin is sticky, and it goes straight under.",
    culture: "Scottish Gaelic & Lowland Scots",
    place: { name: "Highlands", country: "United Kingdom", lat: 57.2, lng: -4.6 },
    continent: "Europe",
    source: "folklore",
    evidence: "Widespread Scottish tradition; the name recorded from the 17th century, the tales collected from the 18th",
    summary:
      "A water horse that offers a ride; its hide is adhesive, and it takes the rider under.",
    body: [
      "The kelpie belongs to rivers, the each-uisge to sea lochs and deep freshwater — the latter is the more lethal of the two in most accounts. Children are the usual victims, sometimes a whole group whose hands stick to its back one after another. The liver is said to wash ashore afterwards.",
      "The tales cluster around genuinely dangerous water and were plainly used to keep children away from it. The kelpie also carried a moral: a stranger offering an easy ride is not offering a favour.",
    ],
    threads: ["water", "lights", "ward"],
    veil: { depth: "threshold", role: "A hazard given a face and a persuasive manner" },
    entity: {
      kind: "folk",
      shape: "quadruped",
      names: [
        { name: "kelpie", lang: "Scots" },
        { name: "each-uisge", lang: "Scottish Gaelic, 'water horse'" },
        { name: "ceffyl dŵr", lang: "Welsh, related" },
      ],
      earliest: "'Kelpie hoall' in the Kirkcudbright burgh records, 1674; first literary use in Collins's Odes, 1747",
      earliestYear: 1674,
      range: "Scottish rivers, lochs and sea inlets",
      traits: ["Appears as a fine horse, sometimes a young man", "Adhesive hide", "Dripping weed in its mane", "Drowns and devours"],
      development:
        "Village water-warning turned national emblem — two thirty-metre steel kelpies now stand at Falkirk.",
    },
    tags: ["water", "horses", "warning"],
    sources: [
      {
        work: "dsl-kelpie",
        supports:
          "The definition — a water demon of rivers and fords in horse form, which could also be harnessed to work a mill — the Gaelic cailpeach etymology, and the dated attestations: 'Kelpie hoall' in the Kirkcudbright burgh records of 1674, then Collins in 1747 and Burns in 1786.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "amended" },
  },
  {
    id: "loch-ness",
    title: "The Loch Ness Monster",
    subtitle: "A modern creature with an old address",
    plain: "One newspaper report in 1933 turned a Highland lake into the most watched water in the world.",
    culture: "Scottish & global",
    place: { name: "Loch Ness", country: "United Kingdom", lat: 57.32, lng: -4.42 },
    continent: "Europe",
    source: "report",
    evidence: "Press reports from 1933; sonar surveys; several exposed fabrications",
    summary:
      "A sighting reported in the Inverness Courier in 1933 turned a Highland loch into the most surveyed body of water in folklore.",
    body: [
      "The modern era begins on 2 May 1933. The famous 'surgeon's photograph' of 1934 was admitted in 1994 to have been a toy submarine with a head and neck moulded from plastic wood. Operation Deepscan in 1987 swept the loch with sonar and found three unexplained contacts; an environmental DNA survey sampled the loch in 2018 and reported in 2019 — no reptile sequences, and a great deal of eel.",
      "Adomnán's seventh-century Life of Columba does describe the saint repelling a beast in the River Ness — a hagiographic miracle story about a river, regularly cited as though it were a sighting log entry.",
    ],
    note: "The reports are real reports. The creature is unevidenced, several key images are known fabrications, and the medieval 'precedent' is a different kind of text entirely.",
    threads: ["water"],
    entity: {
      kind: "cryptid",
      shape: "serpent",
      names: [
        { name: "Loch Ness Monster", lang: "English" },
        { name: "Niseag", lang: "Scottish Gaelic" },
      ],
      earliest: "Inverness Courier report, 2 May 1933",
      earliestYear: 1933,
      range: "Loch Ness, Inverness-shire — 56 km² of peat-stained water",
      traits: ["Long neck reported", "Humps in line", "Wake without a boat", "Sightings cluster on calm days with road traffic"],
      accounts: [
        { when: "1933", what: "Aldie Mackay's report published; the road along the loch had just been improved" },
        { when: "1934", what: "The 'surgeon's photograph' published; confessed as a hoax in 1994" },
        { when: "1987", what: "Operation Deepscan sonar sweep; three unidentified mid-water contacts" },
        { when: "2018–19", what: "Environmental DNA survey; sampled 2018, reported September 2019. No reptilian DNA, abundant eel DNA" },
      ],
      development:
        "A press story that became an economy. Its folklore ancestry is often overstated: Highland water-horse lore is related but not the same tradition.",
    },
    tags: ["sightings", "sonar", "hoax"],
    sources: [
      {
        work: "otago-lochness-edna",
        supports:
          "The environmental DNA survey: 250 samples taken through 2018, results announced 5 September 2019. No reptile sequences, no catfish, no sturgeon — and eel DNA at very nearly every location sampled.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 8, status: "amended" },
  },
  {
    id: "victorian-mourning",
    title: "Mourning Dress and Hair Jewellery",
    subtitle: "Grief with a dress code",
    plain: "Grief had rules about what cloth you wore and for how long, and the dead were woven into jewellery by their hair.",
    culture: "British & American Victorian",
    place: { name: "London", country: "United Kingdom", lat: 51.51, lng: -0.13 },
    continent: "Europe",
    source: "historical",
    evidence: "Etiquette manuals, surviving objects, photographs, retail records",
    summary:
      "Nineteenth-century mourning was regulated in fabric and duration, and the dead were kept close in woven hair.",
    body: [
      "A widow wore full mourning in dull black crape for a year and a day, then second mourning, then half-mourning in grey, mauve and white. Jay's London General Mourning Warehouse opened in 1841 to supply the whole system. Jet from Whitby became a major industry.",
      "Hair was plaited into bracelets and set into brooches and rings; post-mortem photography, especially of children, gave many families their only image of a person. Both practices read as morbid now and did not then.",
    ],
    note: "An unusually well-documented mourning culture, because it was commercial. Its objects survive precisely because they were manufactured at scale.",
    threads: ["return"],
    remembrance: { cluster: "object", role: "Wearable, photographic and textile memory" },
    tags: ["victorian", "jet", "photography"],
    sources: [
      {
        work: "jalland-1996",
        supports:
          "The graduated stages of mourning dress and their durations, drawn from the correspondence and diaries of fifty-five families between 1830 and 1920.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "kekri",
    title: "Kekri",
    subtitle: "The old Finnish year's end",
    plain: "The year ends, the dead come home, and the sauna is heated up for them.",
    culture: "Finnish",
    place: { name: "Eastern Finland", country: "Finland", lat: 62.6, lng: 29.76 },
    continent: "Europe",
    source: "historical",
    evidence: "19th-century ethnography; recently revived",
    summary:
      "The end of the agricultural year: the dead came home, the sauna was heated for them, and a masked figure went door to door.",
    body: [
      "Kekri marked the completion of harvest and slaughter, when the year's work was done and servants changed employment. The household sauna was heated and left for the dead, food set out overnight, and a place kept at the table. Kekripukki, a straw-and-hide masked figure, visited houses demanding food.",
      "The festival was displaced by All Saints' Day and by Christmas, which absorbed several of its features — including the goat figure that survives in the Nordic Yule goat. Finnish museums and villages have revived Kekri since the 1990s.",
    ],
    threads: ["food", "masks", "return"],
    remembrance: { cluster: "festival", role: "Year's-end hospitality extended to the dead" },
    calendar: { start: 300, end: 306, label: "End of the harvest year, late October–November", drift: "variable", theme: "harvest" },
    tags: ["harvest", "sauna", "straw"],
    sources: [
      {
        work: "sks-kekri",
        supports:
          "Kekri as the close and the opening of the old agricultural year — fieldwork finished, livestock brought in — with feasting, a place kept for the dead, and the festival's later displacement by All Saints' and Christmas.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },

  // ───────────────────────────────── AMERICAS
  {
    id: "dia-de-muertos",
    title: "Día de Muertos",
    subtitle: "Two days, and a household that expects visitors",
    plain: "The children come back on the first day and the grown-ups on the second, and everything they liked to eat is waiting.",
    culture: "Mexican",
    place: { name: "Nationwide", country: "Mexico", lat: 19.43, lng: -99.13 },
    continent: "Americas",
    source: "living",
    evidence: "Living national tradition; UNESCO-listed; regionally very diverse",
    summary:
      "1 November for children who have died, 2 November for adults — cleaned graves, built altars, and food the dead actually liked.",
    body: [
      "Practice differs sharply by region: overnight vigils in the pantheon at Mixquic; candlelit boats and butterfly-season altars on Lake Pátzcuaro; the calaveras literarias, mocking verse epitaphs written for the living, in newspapers everywhere.",
      "José Guadalupe Posada's 1910s etching of La Catrina was political satire about Mexicans aping European fashion; Diego Rivera named her and put her at the centre of a 1947 mural. The skeleton in the big hat is a modern national symbol, not an ancient one.",
    ],
    note: "The often-repeated claim of a direct unbroken line from Mexica festivals is contested. Colonial Catholic practice, nineteenth-century satire and twentieth-century nation-building all shaped what exists now.",
    threads: ["food", "return", "flame", "lights"],
    remembrance: { cluster: "festival", role: "Household and civic reception of the returning dead" },
    calendar: { start: 305, end: 306, label: "1–2 November", drift: "fixed", theme: "ancestors" },
    tags: ["ofrenda", "graves", "catrina"],
    sources: [
      {
        work: "brandes-2006",
        supports:
          "The record's central caution — that the unbroken line from Mexica festivals is contested, and that colonial Catholic practice, nineteenth-century satire and twentieth-century nation-building all shaped what exists now — along with the regional variation the record describes.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "clean" },
  },
  {
    id: "ofrenda",
    title: "The Ofrenda",
    subtitle: "Built in levels, and stocked for a specific person",
    plain: "An altar built in levels: water, salt, bread, sweet smoke, a photograph, and that person's favourite thing.",
    culture: "Mexican",
    place: { name: "Oaxaca", country: "Mexico", lat: 17.06, lng: -96.72 },
    continent: "Americas",
    source: "living",
    evidence: "Living household practice with wide regional variation",
    summary:
      "An altar of two, three or seven tiers, holding water, salt, bread, copal smoke, photographs and whatever the dead person liked.",
    body: [
      "Water for the thirst of the journey; salt for preservation; copal to clear the air; papel picado moving in the draught to show that spirits are present. Cempasúchil marigolds are torn and scattered in a path from the street to the altar, their scent understood to guide.",
      "The specificity matters: a pack of cigarettes, a bottle of mezcal, a football shirt, a favourite dish cooked exactly as they liked it. An ofrenda for a child carries toys and sweet bread instead.",
    ],
    threads: ["food", "lights", "flame", "return"],
    remembrance: { cluster: "altar", role: "A structured domestic altar built for named individuals" },
    tags: ["marigold", "copal", "altar"],
    sources: [
      {
        work: "brandes-2006",
        supports:
          "The tiered altar and its standard elements — water, salt, copal, papel picado, cempasúchil — and the regional variation that makes any single description of an ofrenda partial.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "hanal-pixan",
    title: "Hanal Pixán",
    subtitle: "Food of the souls, buried and steamed",
    plain: "The food for the souls is a huge tamal, baked in an oven dug into the ground.",
    culture: "Yucatec Maya",
    place: { name: "Yucatán", country: "Mexico", lat: 20.7, lng: -89.1 },
    continent: "Americas",
    source: "living",
    evidence: "Living Maya tradition, distinct from central Mexican practice",
    summary:
      "In Yucatán the dead are fed mucbipollo, a large tamal baked in an earth oven, and the altar is dressed in embroidered cloth.",
    body: [
      "The name means 'food of the souls'. Days are divided: children on 31 October, adults on 1 November, and a mass for all souls on 2 November. Pib, the earth oven, is dug in the yard; the mucbipollo is wrapped in banana leaves and buried with hot stones.",
      "Altars use white embroidered cloth, jícaras of water, and a cross of green wood. Some households tie a black ribbon at the door for a recent death, and lay a path of candles from the road to the house.",
    ],
    note: "Frequently absorbed into 'Day of the Dead' generally. Yucatec practice has its own vocabulary, foods and timing.",
    threads: ["food", "return", "flame"],
    remembrance: { cluster: "offering", role: "Cooked food prepared specifically for returning souls" },
    calendar: { start: 304, end: 306, label: "31 October – 2 November", drift: "fixed", theme: "ancestors" },
    tags: ["maya", "pib", "tamal"],
    sources: [
      {
        work: "uady-hanal-pixan",
        supports:
          "The name as 'food of the souls', the division of the days across 31 October, 1 and 2 November, mucbipollo baked in the pib, and the altar's white embroidered cloth, green cross, jícaras and candles lit to show the way. Some communities keep it going for eight days.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "clean" },
  },
  {
    id: "mictlan",
    title: "The Road to Mictlan",
    subtitle: "Four years, nine layers, and a dog at the river",
    plain: "A four-year journey down through nine layers, ending at a river you cannot cross on your own.",
    culture: "Mexica (Aztec)",
    place: { name: "Tenochtitlan", country: "Mexico", lat: 19.44, lng: -99.13 },
    continent: "Americas",
    source: "reconstructed",
    evidence: "Colonial-era codices and Nahua testimony recorded by Spanish friars",
    summary:
      "Those who died ordinary deaths travelled four years through nine layers, ending at a river they could not cross alone.",
    body: [
      "The Florentine Codex describes obstacles: clashing mountains, a wind of obsidian blades, a place where banners are seized. At the last of them, the nine-fold river Chiconahuapan, the dead are carried across by a reddish dog, which is why a dog was cremated with the body. Other retellings name that river Apanohuaya and set it at the start of the road rather than the end; the schemes genuinely disagree. The destination, Mictlan, is rest rather than punishment.",
      "Destination depended on manner of death, not conduct: the drowned and lightning-struck went to Tlalocan, warriors and women who died in childbirth accompanied the sun, infants went to a tree that dripped milk.",
    ],
    note: "Known almost entirely through sources produced under colonial rule, by friars with an agenda and Nahua informants with their own. The schema is likely tidier on the page than in life.",
    threads: ["descent", "water", "animals"],
    veil: { depth: "otherworld", role: "A long journey with a required companion" },
    tags: ["nahua", "codex", "journey"],
    sources: [
      {
        work: "florentine-codex",
        supports:
          "Book III on the four-year road and its obstacles, and on the river crossed with a dog's help at the end of it — Sahagún names that river Chiconahuapan and places it last, which is the ordering this record follows.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "xolo",
    title: "The Xoloitzcuintli",
    subtitle: "A dog bred for a river crossing",
    plain: "A hairless dog, buried with you, whose job is to carry you over that last river.",
    culture: "Mesoamerican",
    place: { name: "Colima & west Mexico", country: "Mexico", lat: 19.24, lng: -103.72 },
    continent: "Americas",
    source: "historical",
    evidence:
      "Grave goods, ceramic figures and colonial texts; ancient DNA confirms a pre-contact lineage since largely replaced",
    summary:
      "The hairless dog of Mexico, buried with the dead to carry them across the last river of the road to Mictlan.",
    body: [
      "Ceramic dogs from Colima shaft tombs date to roughly 200 BCE–500 CE and are among the most recognisable objects of west Mexican archaeology. Dog remains recur in burials across Mesoamerica. Colour mattered in some accounts: a white dog would refuse, saying it had just washed.",
      "The breed nearly disappeared in the twentieth century; a 1954–56 expedition sanctioned by the Mexican Kennel Club found ten surviving dogs in the Río Balsas country of Guerrero. It is now Mexico's national dog.",
    ],
    threads: ["animals", "water", "descent"],
    veil: { depth: "passage", role: "An animal escort for the crossing" },
    entity: {
      kind: "sacred",
      shape: "quadruped",
      names: [
        { name: "xōlōitzcuintli", lang: "Nahuatl, from Xolotl + itzcuintli, 'dog'" },
        { name: "perro pelón", lang: "Spanish" },
      ],
      earliest: "Ceramic representations from c. 300 BCE; textual accounts 16th century",
      earliestYear: -300,
      range: "Central and western Mexico, Central America",
      traits: ["Hairless, warm to the touch", "Buried with the dead", "Associated with Xolotl, twin of Quetzalcoatl"],
      development:
        "A ritual companion that became an endangered breed and then a national symbol — a living animal with a mythological job description.",
    },
    tags: ["dogs", "burial", "colima"],
    sources: [
      {
        work: "nileathlobhair-2018",
        supports:
          "Pre-contact American dogs formed a single lineage that arrived with people from Siberia — and were almost entirely replaced after European contact, leaving little genetic legacy in modern breeds.",
      },
      {
        work: "xca-about",
        supports:
          "The 1954–56 expedition sanctioned by the Mexican Kennel Club and led by Norman Pelham Wright, which found ten dogs in the Río Balsas region of Guerrero.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 8, status: "amended" },
  },
  {
    id: "la-llorona",
    title: "La Llorona",
    subtitle: "Heard along the water, always at a distance",
    plain: "You hear her crying near the water. She is looking for the children she drowned.",
    culture: "Mexican & Central American",
    place: { name: "Central Mexico", country: "Mexico", lat: 19.7, lng: -99.5 },
    continent: "Americas",
    source: "folklore",
    evidence: "Widespread oral tradition; earliest firm print references 19th century",
    summary:
      "A weeping woman searching for the children she drowned, encountered near rivers, canals and irrigation ditches at night.",
    body: [
      "Versions differ on whether she was abandoned, betrayed, or punished, and on whether she drowned the children deliberately. What is constant is the sound, the water, and the warning against being out late — this is a story adults tell children and men tell each other.",
      "The Florentine Codex records an omen before the conquest of a woman heard weeping at night for her children, and some writers connect her to Cihuacóatl. The link is suggestive rather than established. Her first appearance in print is an 1849 sonnet by Manuel Carpio — and the codices said to hold her origins were themselves unpublished until the nineteenth century, which makes the direction of influence harder to argue than it looks.",
    ],
    note: "The claim of direct Mexica descent is widely repeated and only weakly evidenced. Similar weeping-woman figures also existed in early modern Spain.",
    threads: ["water", "crossroads", "return"],
    veil: { depth: "presence", role: "Grief that has not stopped moving along the water" },
    entity: {
      kind: "folk",
      shape: "shade",
      names: [
        { name: "La Llorona", lang: "Spanish, 'the weeping woman'" },
        { name: "La Malogra", lang: "New Mexican Spanish, a related figure" },
      ],
      earliest: "First in print in Manuel Carpio's sonnet 'La Llorona', 1849; oral tradition older",
      earliestYear: 1849,
      range: "Mexico, Central America, the US Southwest; strong in New Mexico and Texas",
      traits: ["White dress", "Heard before seen", "Near canals, rivers and acequias", "Cry loudest when far away"],
      development:
        "A durable and adaptable warning story, now also a film franchise and a staple of borderlands literature.",
    },
    tags: ["water", "children", "warning"],
    sources: [
      {
        work: "carpio-1849",
        supports:
          "The legend's earliest known appearance in print, where the weeping woman is Rosalía, murdered by her husband.",
      },
      {
        work: "perez-2008",
        supports:
          "The variability of the story, its use as a warning told to children, its spread through the US Southwest, and the weakness of the direct-Mexica-descent claim.",
      },
      {
        work: "florentine-codex",
        supports:
          "Book XII's sixth omen — a woman heard weeping at night, 'my children, where am I to take you?' — which is the passage the descent claim rests on.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "amended" },
  },
  {
    id: "santa-muerte",
    title: "Santa Muerte",
    subtitle: "A saint who does not judge her petitioners",
    plain: "A skeleton saint who is asked for protection, and who does not ask what you have done.",
    culture: "Mexican & Mexican-American",
    place: { name: "Tepito, Mexico City", country: "Mexico", lat: 19.45, lng: -99.12 },
    continent: "Americas",
    source: "living",
    evidence: "Rapidly growing devotion since the 1990s; colonial-era precursors",
    summary:
      "A skeletal folk saint petitioned for protection, healing and justice, especially by people the institutional church has not served.",
    body: [
      "Public devotion dates from Halloween 2001, when Enriqueta Romero set a life-size figure on the pavement outside her house in Tepito. Offerings include cigarettes, tequila, apples and flowers; robes are colour-coded — white for cleansing, red for love, gold for prosperity. Estimates run into the millions of devotees across Mexico, Central America and the United States.",
      "The Vatican has condemned the cult; Mexican authorities have destroyed roadside shrines. Devotees frequently identify as Catholic and see no contradiction. An Inquisition file of 1797, on the superstitions of the Indians of San Luis de la Paz, carries the earliest known use of the name: a figure called Santa Muerte, bound and flogged to compel a miracle. The roots run deeper than the shrine, but what is recorded down there is not simple veneration.",
    ],
    note: "Frequently reduced in reporting to 'the narco saint'. Most devotees are ordinary working people; the association is real but not representative.",
    threads: ["ward", "flame"],
    remembrance: { cluster: "altar", role: "Street and household shrines to a personified death" },
    tags: ["folk saint", "shrines", "devotion"],
    sources: [
      {
        work: "chesnut-2012",
        supports:
          "Doña Queta's Tepito shrine as the start of public devotion, the colour-coded robes, the scale of the following, the Vatican's condemnation, and the record's own correction — that most devotees are ordinary working people and the 'narco saint' framing is real but unrepresentative.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "alebrijes",
    title: "Alebrijes",
    subtitle: "Invented in a fever, in 1936",
    plain: "One man dreamed them while he was ill in 1936, and then built them out of papier-mâché.",
    culture: "Mexican",
    place: { name: "Mexico City & Oaxaca", country: "Mexico", lat: 19.36, lng: -99.16 },
    continent: "Americas",
    source: "historical",
    evidence: "Documented single-author origin; well-recorded diffusion",
    summary:
      "Brightly painted composite creatures invented by one papier-mâché artisan, now often mistaken for ancient tradition.",
    body: [
      "Pedro Linares López, a cartonería maker in Mexico City, described a fever dream in 1936 full of impossible animals shouting a nonsense word: alebrijes. He built them in papier-mâché. Diego Rivera and Frida Kahlo commissioned pieces, and the form spread.",
      "The carved wooden versions from San Martín Tilcajete and Arrazola in Oaxaca are a separate lineage — copal-wood tallas, an existing craft, which adopted the name and palette from the 1980s.",
    ],
    note: "A useful control case: a fully documented modern invention, frequently described online as pre-Hispanic spirit guides. It is neither ancient nor connected to Mictlan.",
    threads: [],
    entity: {
      kind: "literary",
      shape: "composite",
      names: [{ name: "alebrije", lang: "Spanish, coined by Pedro Linares" }],
      earliest: "Pedro Linares López, Mexico City, 1936",
      earliestYear: 1936,
      range: "Mexico City cartonería; Oaxacan woodcarving from the 1980s",
      traits: ["Composite anatomy", "Saturated colour and fine dot-work", "No traditional narrative attached"],
      development:
        "Single-artisan invention → family workshop → national craft → misattributed folklore. The misattribution is itself now part of the story.",
    },
    tags: ["craft", "invention", "oaxaca"],
    sources: [
      {
        work: "bronowski-1975",
        supports:
          "Linares describing the 1936 fever dream and the coining of the word, filmed in his own workshop.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "clean" },
  },
  {
    id: "fet-gede",
    title: "Fèt Gede",
    subtitle: "The Gede arrive loud, rude and useful",
    plain: "In November the spirits of the dead arrive at the cemetery — loud, rude, in purple and black.",
    culture: "Haitian Vodou",
    place: { name: "Port-au-Prince", country: "Haiti", lat: 18.54, lng: -72.34 },
    continent: "Americas",
    source: "living",
    evidence: "Living religion, extensively documented; frequently misrepresented",
    summary:
      "In November the lwa of the dead are honoured at cemeteries in purple and black, with rum steeped in chilli peppers.",
    body: [
      "The Gede are spirits of the dead and of fertility at once: obscene, funny, and impossible to intimidate. Baron Samedi and Manman Brigitte preside at the cemetery's first cross and first female grave. Devotees wear black and purple, dance the banda, and drink kleren infused with scotch bonnet.",
      "Their humour is functional. Because the Gede are already dead, they can say what the living cannot — commenting on power, sex and death with a freedom that is part of the point.",
    ],
    note: "Vodou is a religion with clergy, theology and congregations. Popular media portrayals bear almost no relation to it.",
    threads: ["return", "food", "masks"],
    remembrance: { cluster: "festival", role: "Cemetery-centred honouring of the collective dead" },
    veil: { depth: "presence", role: "Spirits of the dead present, embodied and speaking" },
    calendar: { start: 305, end: 306, label: "1–2 November", drift: "fixed", theme: "spirits" },
    tags: ["lwa", "cemetery", "humour"],
    sources: [
      {
        work: "cosentino-1995",
        supports:
          "The Gede as spirits of death and fertility at once, Baron Samedi and Manman Brigitte at the cemetery's first cross and first female grave, and the working purpose of their obscenity.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "natitas",
    title: "Fiesta de las Ñatitas",
    subtitle: "Skulls with names, hats and requests",
    plain: "Human skulls kept at home, with names and hats, given cigarettes and taken out once a year to be blessed.",
    culture: "Aymara & La Paz urban",
    place: { name: "La Paz", country: "Bolivia", lat: -16.5, lng: -68.15 },
    continent: "Americas",
    source: "living",
    evidence: "Living urban practice; increasingly public over the later twentieth century",
    summary:
      "Human skulls kept in households are crowned with flowers, given cigarettes and coca, and taken to the cemetery for a blessing.",
    body: [
      "A ñatita — 'little snub-nosed one' — may be an ancestor, an anonymous skull from an old cemetery, or one that arrived by inheritance. Each has a name and a specialty: protection, legal matters, finding work. They are consulted in dreams and repaid with cigarettes, alcohol, coca leaves and knitted hats.",
      "On 8 November thousands are carried to the Cementerio General in La Paz. The Catholic church has objected for decades; priests nonetheless bless them at the gates, and the crowds grow.",
    ],
    note: "Related to Andean traditions of caring for ancestral remains, but the modern urban festival is a twentieth-century development, not an unbroken survival.",
    threads: ["ward", "food"],
    remembrance: { cluster: "object", role: "Named human remains kept and cared for at home" },
    calendar: { start: 312, label: "8 November", drift: "fixed", theme: "remembrance" },
    tags: ["skulls", "aymara", "household"],
    sources: [
      {
        work: "smithsonian-natitas",
        supports:
          "The 8 November gathering at the Cementerio General, the range of ways a household acquires a ñatita, and the twentieth-century growth of the public festival.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 4, status: "amended" },
  },
  {
    id: "mallqui",
    title: "Mallqui",
    subtitle: "Ancestors who were carried out to watch the festival",
    plain: "Preserved ancestors who owned land, were brought food and drink, and were carried out to watch the festival.",
    culture: "Inca & Andean",
    place: { name: "Cusco", country: "Peru", lat: -13.53, lng: -71.97 },
    continent: "Americas",
    source: "reconstructed",
    evidence: "Spanish chronicles, extirpation records, archaeology",
    summary:
      "Preserved ancestral bodies held land, received food and drink, and were brought out into the plaza on the right occasions.",
    body: [
      "Royal mummies retained their households, servants and estates after death; chroniclers describe them being seated in the plaza at Cusco, consulted, and offered chicha. Community mallqui were kept in chullpa towers and caves, visited and fed.",
      "Colonial extirpation campaigns in the seventeenth century specifically hunted and burned mallqui, recognising them as the anchor of local religion. Those campaign records are now a major source for what was destroyed.",
    ],
    note: "Reconstructed largely from the documents of the people who suppressed it — a systematic bias that runs through most Andean religious history.",
    threads: ["food", "return"],
    remembrance: { cluster: "grave", role: "Ancestral bodies retained as active members of the community" },
    tags: ["andes", "mummies", "extirpation"],
    sources: [
      {
        work: "mills-1997",
        supports:
          "The seventeenth-century extirpation campaigns in the Archdiocese of Lima, and the way their own records became the main surviving evidence for what they destroyed.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "curupira",
    title: "Curupira",
    subtitle: "Footprints that lead the wrong way",
    plain: "A forest guardian whose feet point backwards, so his footprints lead you the wrong way.",
    culture: "Tupi-Guarani & Brazilian",
    place: { name: "Amazon basin", country: "Brazil", lat: -3.1, lng: -60.0 },
    continent: "Americas",
    source: "folklore",
    evidence: "Recorded by Jesuit missionaries from 1560; continuous oral tradition",
    summary:
      "A forest guardian with backwards feet who punishes hunters that take more than they need.",
    body: [
      "Described as small, red-haired, with heels facing forward so that its tracks mislead pursuers. It whistles to disorient, and can leave a hunter walking in circles for days. Offerings of tobacco and cachaça are left at the forest edge to keep on good terms.",
      "José de Anchieta mentioned the Curupira in a letter of 1560, making it one of the earliest recorded Indigenous South American beings in European writing. It functions as a rule about hunting limits rather than a story about a monster.",
    ],
    threads: ["ward", "crossroads"],
    veil: { depth: "threshold", role: "Authority over the forest, enforced by disorientation" },
    entity: {
      kind: "folk",
      shape: "humanoid",
      names: [
        { name: "Curupira", lang: "Tupi, from kuru'pir, 'covered in blisters'" },
        { name: "Caipora", lang: "Portuguese / Tupi, a related figure" },
      ],
      earliest: "Letter of José de Anchieta, 1560",
      earliestYear: 1560,
      range: "Amazonia and much of Brazil",
      traits: ["Feet turned backwards", "Bright red hair", "Whistles to confuse", "Protects game animals"],
      variants: ["Caipora — rides a peccary", "Mapinguari — a separate and larger figure"],
      development:
        "An Indigenous forest-guardian concept that entered Brazilian national folklore, and is now used in conservation education.",
    },
    tags: ["forest", "hunting", "tracks"],
    sources: [
      {
        work: "anchieta-1560",
        supports:
          "The first European record of the Curupira, written from São Vicente on 31 May 1560 — a Tupinambá being that fitted none of the categories Anchieta had brought with him.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "jazz-funeral",
    title: "The Jazz Funeral",
    subtitle: "Slow on the way out, hot on the way back",
    plain: "The band plays slow all the way to the grave, and hot all the way back.",
    culture: "Black New Orleans",
    place: { name: "New Orleans, Louisiana", country: "United States", lat: 29.95, lng: -90.07 },
    continent: "Americas",
    source: "living",
    evidence: "Living tradition, documented from 1819; the name 'jazz funeral' is far younger than the practice",
    summary:
      "A brass band walks the body out with dirges, then cuts loose the moment the deceased is released.",
    body: [
      "The band plays hymns and dirges to the cemetery — 'Nearer My God to Thee', 'Just a Closer Walk with Thee'. After the body is 'cut loose', the snare drum snaps into a second line rhythm and the crowd behind the band dances the rest of the way back.",
      "The practice grew from benevolent societies and Social Aid and Pleasure Clubs, which provided burial insurance to Black New Orleanians excluded from other institutions. Second line parading continues weekly, independent of funerals.",
      "It is much older than its name. The architect Benjamin Latrobe watched a Black funeral in New Orleans in 1819 and wrote down the same shape — loud lamentation on the way out, noise and laughter coming back — a century before there was any jazz to name it after. 'Jazz funeral' is a twentieth-century label attached to a nineteenth-century practice.",
    ],
    threads: ["return", "flame"],
    remembrance: { cluster: "festival", role: "Music as the structure of a funeral procession" },
    tags: ["brass band", "second line", "mutual aid"],
    sources: [
      {
        work: "64p-jazz-funerals",
        supports:
          "Benjamin Latrobe's 1819 account of a Black New Orleans funeral — lamentation out, noise and laughter back — the benevolent societies that arranged the bands and collected dues for burial, the dirge-then-up-tempo structure, and that the funerals only 'eventually became known' as jazz funerals.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "amended" },
  },
  {
    id: "decoration-day",
    title: "Decoration Day",
    subtitle: "A whole community turns up with flowers and a lawnmower",
    plain: "Everyone turns up at the cemetery with flowers and a lawnmower, and stays to sing and eat.",
    culture: "Appalachian & Upland South",
    place: { name: "Southern Appalachia", country: "United States", lat: 36.6, lng: -83.3 },
    continent: "Americas",
    source: "living",
    evidence: "Living rural practice, documented since the 19th century",
    summary:
      "An annual gathering at a family or church cemetery: clean the graves, cover them in flowers, sing, and eat together.",
    body: [
      "Each cemetery has its own fixed Sunday, and families travel back for it, often from other states. Graves are mounded fresh, headstones scrubbed, and every grave — including those with no living relatives — is covered in flowers. Dinner is spread on the ground and singing follows.",
      "The practice predates the Civil War in the region and is distinct from the national Memorial Day that grew out of wartime grave decoration, although the two have influenced each other.",
    ],
    threads: ["food", "return"],
    remembrance: { cluster: "grave", role: "Collective annual maintenance of a whole cemetery" },
    calendar: { start: 145, end: 250, label: "A fixed Sunday, varying by cemetery (May–September)", drift: "variable", theme: "remembrance" },
    tags: ["cemetery", "flowers", "singing"],
    sources: [
      {
        work: "jabbour-2010",
        supports:
          "The fixed Sunday per cemetery, families travelling back for it, mounding and scrubbing the graves, flowers on every grave including the unvisited ones, dinner on the ground and singing — and that these traditions run back before the post-war grave decoration that produced national Memorial Day.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 5, status: "clean" },
  },
  {
    id: "spiritualism",
    title: "The Hydesville Rappings",
    subtitle: "A movement founded on a sound, ended by a confession",
    plain: "In 1848 two sisters said knocking sounds were answering questions. Millions believed it. Later they showed how they did it.",
    culture: "American & British",
    place: { name: "Hydesville, New York", country: "United States", lat: 43.07, lng: -77.16 },
    continent: "Americas",
    source: "historical",
    evidence: "Contemporary press, investigations, and a signed public confession",
    summary:
      "In 1848 two sisters reported knocking sounds answering questions; within a decade Spiritualism had millions of adherents.",
    body: [
      "Kate and Maggie Fox, aged eleven and fourteen, produced raps that seemed to answer yes-or-no questions in their Hydesville farmhouse. Public demonstrations followed, then séances, mediums, spirit photography and a transatlantic movement that drew in Conan Doyle and, briefly, serious scientific investigation.",
      "In 1888 Maggie demonstrated at the New York Academy of Music how she produced the raps by cracking her toe joints, and publicly confessed. She partially recanted the following year. Spiritualist churches continue today.",
    ],
    note: "Fraudulent in origin and sincere in much of its practice. Its appeal is inseparable from mass bereavement — cholera, the Civil War, and later the First World War.",
    threads: ["return", "thresholds"],
    veil: { depth: "presence", role: "An attempt to make contact into a procedure" },
    tags: ["seance", "confession", "grief"],
    sources: [
      {
        work: "braude-2008",
        supports:
          "The scale and speed of the movement after 1848, its entanglement with mass bereavement, and the record's harder point — that a thing fraudulent in origin can be sincere in most of its practice.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "mothman",
    title: "Mothman",
    subtitle: "Thirteen months, then a bridge collapsed",
    plain: "Thirteen months of people seeing something winged with red eyes. Then the bridge came down.",
    culture: "American",
    place: { name: "Point Pleasant, West Virginia", country: "United States", lat: 38.84, lng: -82.14 },
    continent: "Americas",
    source: "report",
    evidence: "Newspaper reports from November 1966; a single influential 1975 book",
    summary:
      "Sightings of a large winged figure with red eyes around an abandoned munitions site, later tied to a disaster.",
    body: [
      "On 15 November 1966 two young couples reported a grey winged figure near the 'TNT area' outside Point Pleasant. The Point Pleasant Register ran the story; more than a hundred reports followed over the next year. Wildlife officials suggested a sandhill crane, which is large, red-faced and out of its normal range there.",
      "On 15 December 1967 the Silver Bridge collapsed, killing 46 people — a failure caused by a single cracked eyebar. John Keel's The Mothman Prophecies (1975) linked the two, and the connection has been inseparable from the story since.",
    ],
    note: "The reports are documented; the causal link to the bridge collapse is an interpretation added afterwards, by one author, eight years later.",
    threads: ["lights"],
    entity: {
      kind: "cryptid",
      shape: "winged",
      names: [
        { name: "Mothman", lang: "coined by an Ohio newspaper copy editor, 1966" },
      ],
      earliest: "Point Pleasant Register, 16 November 1966",
      earliestYear: 1966,
      range: "Point Pleasant and the Ohio River valley, West Virginia",
      traits: ["Two metres tall, grey", "Wingspan reported at three metres", "Red glowing eyes", "Keeps pace with cars"],
      accounts: [
        { when: "Nov 1966", what: "Scarberry and Mallette couples report a winged figure near the TNT area" },
        { when: "1966–67", what: "Over 100 reports logged; sandhill crane offered as an explanation" },
        { when: "Dec 1967", what: "Silver Bridge collapse; retroactively associated with the sightings" },
      ],
      development:
        "Local sighting flap → regional legend → 1975 book → film → an annual festival and a chrome statue.",
    },
    tags: ["1966", "wings", "disaster"],
    sources: [
      {
        work: "ntsb-silver-bridge",
        supports:
          "The collapse of 15 December 1967, the death toll, and the single fractured eyebar identified as the cause.",
      },
      {
        work: "keel-1975",
        supports:
          "The book that tied the sightings to the collapse — cited as the origin of that link, not as evidence for it.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 8, status: "clean" },
  },
  {
    id: "chupacabra",
    title: "Chupacabras",
    subtitle: "A creature that changed shape between countries",
    plain: "In Puerto Rico it had spines and stood upright. By the time it reached Texas it was a hairless dog.",
    culture: "Puerto Rican, Mexican & US Latino",
    place: { name: "Canóvanas", country: "Puerto Rico", lat: 18.38, lng: -65.9 },
    continent: "Americas",
    source: "report",
    evidence: "Traceable to March 1995; a documented and unusually rapid transformation",
    summary:
      "First described in Puerto Rico as a spined bipedal creature; within a few years it had become a hairless dog in Texas.",
    body: [
      "Livestock deaths were reported in Puerto Rico from March 1995. The creature got its face that August, when Madelyne Tolentino of Canóvanas described something grey and bipedal, with large black eyes and spines along its back. Folklorist Benjamin Radford noticed the description matched the creature in the film Species — which had opened on 7 July, five weeks before she saw it.",
      "The name migrated to Mexico and the US Southwest, where it attached to hairless canids. Several were tested: coyotes and dogs with advanced sarcoptic mange, which causes hair loss, thickened skin and altered gait.",
    ],
    note: "A rare case where the emergence, transformation and probable explanation of a cryptid are all documented within thirty years.",
    threads: [],
    entity: {
      kind: "cryptid",
      shape: "quadruped",
      names: [
        { name: "chupacabras", lang: "Spanish, 'goat-sucker'" },
      ],
      earliest: "Livestock deaths in Puerto Rico from March 1995; the Canóvanas sighting that fixed its appearance came in August",
      earliestYear: 1995,
      range: "Puerto Rico, Mexico, Texas and the US Southwest; reports as far as Chile",
      traits: ["Puerto Rico: bipedal, spined, large eyes", "Mainland: hairless quadruped", "Blamed for exsanguinated livestock"],
      accounts: [
        { when: "Mar 1995", what: "First livestock deaths reported in Puerto Rico" },
        { when: "Aug 1995", what: "Madelyne Tolentino's sighting at Canóvanas; the composite sketch that fixed the creature's appearance" },
        { when: "2004–2010", what: "Texas specimens recovered; genetic testing identifies coyotes with severe mange" },
      ],
      development:
        "Two distinct creatures under one name. The shift from biped to canid happened within roughly five years and can be tracked in the press.",
    },
    tags: ["1995", "mange", "media"],
    sources: [
      {
        work: "radford-2011",
        supports:
          "The chronology this record turns on: livestock deaths from March 1995, Species released 7 July, Madelyne Tolentino's Canóvanas sighting in the second week of August. Also the mainland shift and the mange-afflicted canids recovered in Texas.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "jersey-devil",
    title: "The Jersey Devil",
    subtitle: "A regional legend given a week of headlines",
    plain: "A winged, hoofed thing said to be a thirteenth child born in 1735 — and front-page news for a week in 1909.",
    culture: "South Jersey (Pine Barrens)",
    place: { name: "Pine Barrens, New Jersey", country: "United States", lat: 39.75, lng: -74.55 },
    continent: "Americas",
    source: "contested",
    evidence: "Local legend of uncertain date; a documented 1909 press event, partly fabricated",
    summary:
      "A winged, hoofed creature said to have been born as a thirteenth child in 1735 — and a newspaper sensation in January 1909.",
    body: [
      "The legend centres on 'Mother Leeds' of Burlington County, whose thirteenth child was said to transform and escape up the chimney. The Leeds family were real, and their almanac-publishing feud with Benjamin Franklin may have contributed to their reputation.",
      "In January 1909 hundreds of tracks and sightings were reported across Pennsylvania and New Jersey over about a week. On the 24th, as the flap subsided, the Ninth and Arch Street Museum in Philadelphia announced it had the creature alive. The publicist Norman Jefferies had painted green stripes on a kangaroo and strapped fake wings to it; he admitted the whole thing years later.",
    ],
    note: "The 1909 flap is documented; a deliberate hoax formed part of it. How old the underlying legend is remains unclear.",
    threads: ["ward"],
    entity: {
      kind: "hoax",
      shape: "winged",
      names: [
        { name: "Jersey Devil", lang: "English" },
        { name: "Leeds Devil", lang: "older regional name" },
      ],
      earliest: "Legend of uncertain age; the name in print from the 19th century; flap January 1909",
      earliestYear: 1909,
      range: "New Jersey Pine Barrens and the Delaware Valley",
      traits: ["Horse-like head", "Bat wings", "Cloven hooves", "High scream"],
      accounts: [
        { when: "Jan 1909", what: "Tracks and sightings reported across two states in roughly a week" },
        { when: "24 Jan 1909", what: "The Ninth and Arch Street Museum, Philadelphia, exhibits a striped kangaroo with fitted wings" },
      ],
      development:
        "Local family reputation → regional legend → newspaper flap with a commercial hoax attached → the name of a hockey team.",
    },
    tags: ["1909", "press", "kangaroo"],
    sources: [
      {
        work: "regal-2018",
        supports:
          "The Leeds family as real people, the almanac feud with Benjamin Franklin, the January 1909 flap across two states, and Norman Jefferies's kangaroo at the Ninth and Arch Street Museum — announced on 24 January 1909 and confessed to years afterwards.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 7, status: "amended" },
  },
  {
    id: "sasquatch",
    title: "Sasquatch",
    subtitle: "A borrowed word, and what it was borrowed from",
    plain: "The English word was borrowed from Halkomelem, but the being it named there is not the one in the sighting reports.",
    culture: "Coast Salish & North American settler",
    place: { name: "Fraser Valley, British Columbia", country: "Canada", lat: 49.3, lng: -121.9 },
    continent: "Americas",
    source: "contested",
    evidence: "Coast Salish oral tradition; a 1929 coinage; a large body of disputed modern reports",
    summary:
      "The English word comes from Halkomelem sásq'ets, but the being it names in Sts'ailes tradition is not the creature of the sighting reports.",
    body: [
      "J. W. Burns, a teacher at the Chehalis (Sts'ailes) reserve, anglicised sásq'ets in the late 1920s for magazine articles. In Sts'ailes tradition the being is a relative and a protector of the land, with obligations attached — not a specimen to be catalogued.",
      "The settler cryptid took shape after 1958, when tracks at Bluff Creek, California produced the word 'Bigfoot'. In 2002 the family of Ray Wallace stated he had made those tracks with carved wooden feet. The 1967 Patterson–Gimlin film remains disputed.",
    ],
    note: "Two things share one name: an Indigenous tradition and a mid-century North American phenomenon. Conflating them misrepresents both.",
    threads: ["ward"],
    entity: {
      kind: "cryptid",
      shape: "humanoid",
      names: [
        { name: "sásq'ets", lang: "Halkomelem (Sts'ailes)" },
        { name: "Sasquatch", lang: "English, anglicised c. 1929" },
        { name: "Bigfoot", lang: "English, coined 1958" },
      ],
      earliest: "Coast Salish oral tradition; the English name from 1929; the modern cryptid from 1958",
      earliestYear: 1929,
      range: "Pacific Northwest; reports across North America",
      traits: ["Two to three metres tall", "Heavy footprints", "Strong odour reported", "Vocalisations described as whoops or knocks"],
      accounts: [
        { when: "1958", what: "Tracks at Bluff Creek, California; 'Bigfoot' coined in the Humboldt Times" },
        { when: "1967", what: "Patterson–Gimlin film shot at Bluff Creek; authenticity still disputed" },
        { when: "2002", what: "Wallace family states Ray Wallace made the 1958 tracks with carved wooden feet" },
      ],
      development:
        "A specific Coast Salish being, a 1929 magazine coinage, and a post-1958 mass phenomenon — three overlapping histories under one word.",
    },
    tags: ["pacific northwest", "tracks", "naming"],
    sources: [
      {
        work: "burns-1929",
        supports:
          "The article that put the word into English, published 1 April 1929 — Burns relaying Sts'ailes accounts rather than claiming a sighting himself.",
      },
      {
        work: "canencyc-sasquatch",
        supports:
          "sásq'ets as Halkomelem for 'hairy man', Burns's position as teacher at the Chehalis reserve, and the separate post-1958 Bigfoot phenomenon.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 8, status: "clean" },
  },
  {
    id: "cottingley",
    title: "The Cottingley Fairies",
    subtitle: "Five photographs, and sixty-six years",
    plain: "Two girls photographed paper cut-outs in 1917, and grown-ups believed it for sixty-six years.",
    culture: "English",
    place: { name: "Cottingley, West Yorkshire", country: "United Kingdom", lat: 53.83, lng: -1.83 },
    continent: "Europe",
    source: "historical",
    evidence: "Original photographs, published debate, and a signed confession in 1983",
    summary:
      "Two girls photographed paper cut-outs in a garden beck in 1917; the images convinced a great many adults for decades.",
    body: [
      "Elsie Wright, sixteen, and Frances Griffiths, nine, borrowed a camera and produced photographs of small winged figures. Arthur Conan Doyle, grieving and deeply committed to Spiritualism, published them in The Strand in 1920 as evidence of the supernatural.",
      "In 1983 both women confirmed the figures were cardboard cut-outs copied from Princess Mary's Gift Book and held up with hatpins. Frances maintained to the end that the fifth photograph was genuine.",
    ],
    note: "Included as a study in how belief is sustained: the deception was simple, and the desire to believe it was not.",
    threads: ["lights"],
    entity: {
      kind: "hoax",
      shape: "winged",
      names: [{ name: "the Cottingley Fairies", lang: "English" }],
      earliest: "First two photographs taken July and September 1917; published 1920",
      earliestYear: 1917,
      range: "A garden stream in West Yorkshire",
      traits: ["Paper cut-outs on hatpins", "Fashionable 1910s hairstyles", "Perfectly in focus while the girls blur"],
      accounts: [
        { when: "1920", what: "Conan Doyle publishes them in The Strand Magazine as evidence of fairy life" },
        { when: "1983", what: "Elsie Wright and Frances Griffiths confirm the images were faked" },
      ],
      development:
        "A children's prank that became a test case in Spiritualist controversy, then a permanent example in the study of photographic credulity.",
    },
    tags: ["photography", "1917", "belief"],
    sources: [
      {
        work: "nsmm-cottingley",
        supports:
          "The five photographs, the cut-outs copied from Princess Mary's Gift Book and pinned with hatpins, Elsie's 1983 letter of confession, and Frances's insistence to the end of her life that the fifth photograph was real.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 8, status: "clean" },
  },
  {
    id: "cthulhu",
    title: "The Cthulhu Mythos",
    subtitle: "An invented mythology with a publication date",
    plain: "Invented gods and invented forbidden books, written from 1917 onward, still mistaken online for real ancient lore.",
    culture: "American literary",
    place: { name: "Providence, Rhode Island", country: "United States", lat: 41.82, lng: -71.41 },
    continent: "Americas",
    source: "historical",
    evidence: "Published fiction, correspondence and manuscripts with exact dates",
    summary:
      "A body of invented gods and forbidden books written from 1917 onward, frequently mistaken online for genuine ancient lore.",
    body: [
      "H. P. Lovecraft wrote The Call of Cthulhu in 1926 and invented the Necronomicon as a fictional grimoire, later enjoying the confusion when readers wrote to libraries asking for it. Friends and correspondents added to the shared setting, and Lovecraft encouraged them.",
      "Lovecraft's fiction is also saturated with the racism of his time, and that is not incidental to it. Contemporary writers have both critiqued and rewritten the mythos from the inside.",
    ],
    note: "A deliberately manufactured mythology, still occasionally cited as ancient. Its inclusion here marks the boundary between invented and inherited tradition.",
    threads: [],
    entity: {
      kind: "literary",
      shape: "composite",
      names: [
        { name: "Cthulhu", lang: "invented by H. P. Lovecraft, 1926" },
        { name: "Necronomicon", lang: "fictional book, coined 1922" },
      ],
      earliest: "'Dagon', 1917; 'The Call of Cthulhu', written 1926, published 1928",
      earliestYear: 1926,
      range: "Fiction. Frequently relocated to Massachusetts, Antarctica and the South Pacific",
      traits: ["Composite cephalopod anatomy", "Attributed to a fabricated ancient corpus", "Deliberately open shared setting"],
      development:
        "Invented, credited, dated — and nonetheless absorbed into occult bookshops and internet folklore as though inherited.",
    },
    tags: ["fiction", "invention", "attribution"],
    sources: [
      {
        work: "lovecraft-cthulhu",
        supports:
          "The story itself, and its dates: written in 1926, published in Weird Tales in February 1928. This is a record about a thing with a publication date, so the publication is the citation.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "vanishing-hitchhiker",
    title: "The Vanishing Hitchhiker",
    subtitle: "A passenger who is not in the back seat",
    plain: "You give a girl a lift, she tells you an address, and then the back seat is empty.",
    culture: "Widespread contemporary",
    place: { name: "Chicago, Illinois", country: "United States", lat: 41.79, lng: -87.83 },
    continent: "Americas",
    source: "folklore",
    evidence: "Collected in hundreds of variants, the earliest dated to 1912; older analogues debated",
    summary:
      "A driver gives a lift to a young woman who provides an address, then disappears from the moving car before arriving.",
    body: [
      "Richard Beardsley and Rosalie Hankey catalogued 79 versions in 1942. The Chicago variant, 'Resurrection Mary', attaches to a specific cemetery on Archer Avenue and a specific dance hall. Others end with a borrowed coat found folded on a grave.",
      "Analogous tales predate the motor car — a rider on horseback, a passenger in a cart — but the automobile version spread through a new set of conditions: private cars, night driving, and strangers alone together in an enclosed space.",
    ],
    note: "The claim that this is an ancient story in modern dress is often overstated. The older analogues are real but thinner than usually implied.",
    threads: ["crossroads", "return"],
    veil: { depth: "presence", role: "The dead met on the road, indistinguishable from the living" },
    entity: {
      kind: "urban",
      shape: "shade",
      names: [
        { name: "the vanishing hitchhiker", lang: "English" },
        { name: "Resurrection Mary", lang: "Chicago variant" },
        { name: "la muchacha de la curva", lang: "Spanish variant" },
      ],
      earliest: "Variants dated as far back as 1912; catalogued by Beardsley and Hankey, 1942",
      earliestYear: 1912,
      range: "North America, Europe, Latin America, East Asia — adapted to local roads",
      traits: ["Requests a specific address", "Disappears from a moving vehicle", "Sometimes leaves a borrowed garment"],
      variants: ["Resurrection Mary, Chicago", "The lady of the curve, Spain and Latin America", "Roadside variants adapted to taxis"],
      development:
        "The most thoroughly documented contemporary legend, and the standard example used to show how legends localise.",
    },
    tags: ["roads", "cars", "variants"],
    sources: [
      {
        work: "beardsley-hankey-1942",
        supports:
          "The 79 variants, gathered from New York to Hawaii and dated between 1912 and 1942, and the classification built from them. The paper also coined the name this record uses.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "amended" },
  },
  {
    id: "slender-man",
    title: "Slender Man",
    subtitle: "A legend with a timestamp",
    plain: "Made in a photo-editing thread on 10 June 2009, then passed around until it behaved like something old.",
    culture: "Internet",
    place: { name: "Origin: Something Awful forums", country: "United States", lat: 39.1, lng: -94.6 },
    continent: "Americas",
    source: "report",
    evidence: "Original forum posts, timestamps and authorship all preserved",
    summary:
      "Created in a photo-editing thread on 10 June 2009, then developed collectively until it behaved like inherited folklore.",
    body: [
      "Eric Knudsen posted two doctored black-and-white photographs with invented captions. Within weeks, hundreds of contributors had added sightings, mythology and fabricated historical woodcuts, producing a legend with false antiquity built in on purpose.",
      "In 2014 two twelve-year-olds in Waukesha, Wisconsin stabbed a classmate, later saying they believed it would appease Slender Man. The case forced an uncomfortable public conversation about the difference between participating in a fiction and believing one.",
    ],
    note: "A modern legend whose entire creation is documented — including the deliberate manufacture of fake historical sources.",
    threads: ["crossroads"],
    veil: { depth: "threshold", role: "A figure at the treeline, watching" },
    entity: {
      kind: "urban",
      shape: "humanoid",
      names: [{ name: "Slender Man", lang: "English, coined 2009" }],
      earliest: "Something Awful forum thread, 10 June 2009",
      earliestYear: 2009,
      range: "Internet-native; localised to woodland and playgrounds in imagery",
      traits: ["Unnaturally tall and thin", "Featureless face", "Dark suit", "Appears at the edge of photographs"],
      accounts: [
        { when: "2009", what: "Two edited photographs posted with invented captions; collaborative expansion follows" },
        { when: "2014", what: "Waukesha stabbing; the case becomes central to debate about online legend and children" },
      ],
      development:
        "Deliberate collaborative fiction that acquired the behaviour of folklore, including variant traditions and manufactured 'historical' antecedents.",
    },
    tags: ["2009", "internet", "authorship"],
    sources: [
      {
        work: "knudsen-2009",
        supports:
          "The origin, exactly: two doctored black-and-white photographs with invented witness captions, posted to a Something Awful thread on 10 June 2009 whose brief was to make paranormal images. The thread is the claim, which is why one source is enough here and nowhere else.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "clean" },
  },
  {
    id: "wendigo",
    title: "Wīhtikō",
    subtitle: "A serious concept, widely misused",
    plain: "In Algonquian thought, a hunger that comes with winter and being alone. It is not a costume.",
    culture: "Algonquian (Cree, Ojibwe, Innu and others)",
    place: { name: "Subarctic boreal forest", country: "Canada", lat: 51.0, lng: -88.0 },
    continent: "Americas",
    source: "living",
    evidence: "Algonquian oral tradition; historical court records; extensive contested psychiatric literature",
    summary:
      "In Algonquian thought, an insatiability associated with winter, isolation and the consumption of others — moral, social and physical at once.",
    body: [
      "The concept concerns appetite that cannot be satisfied: the person who eats and is never full, who takes from the community without limit. In severe northern winters, where starvation cannibalism was a genuine possibility, it named the worst outcome imaginable and the social collapse around it. Wīhtikō is also used today as a critique of extraction and greed.",
      "Colonial-era Canadian courts prosecuted killings framed by defendants as preventing a person from becoming wīhtikō — the 1907 arrest of Jack and Joseph Fiddler among the most cited — Jack died in custody before trial; Joseph was convicted. The 'wendigo psychosis' diagnosis built on such cases has been substantially discredited.",
    ],
    note: "Not a monster for a bestiary. Many Algonquian people object to its use in games and horror fiction, and to the antlered-skull image invented for those media in the 2000s.",
    threads: ["ward"],
    veil: { depth: "presence", role: "A named limit on what a person can become" },
    entity: {
      kind: "sacred",
      shape: "humanoid",
      names: [
        { name: "wīhtikō", lang: "Cree" },
        { name: "wiindigoo", lang: "Ojibwe" },
        { name: "atshen", lang: "Innu, related concept" },
      ],
      earliest: "Oral tradition; first European records from Jesuit accounts in the 17th century",
      earliestYear: 1636,
      range: "Subarctic and Great Lakes Algonquian territories",
      traits: ["Associated with winter, famine and isolation", "Insatiable hunger", "Ice at the heart", "Grows with what it consumes"],
      development:
        "A moral and social concept, later pathologised by outside psychiatry and then commercialised as a horror creature — a chain that Algonquian writers have documented and criticised in detail.",
    },
    tags: ["algonquian", "appetite", "misuse"],
    sources: [
      {
        work: "johnston-1995",
        supports:
          "The concept described from inside the tradition, by an Anishinaabe author writing about his own people.",
      },
      {
        work: "brightman-1988",
        supports:
          "The historical depth of the windigo complex, and the documented cases — including the 1907 Fiddler prosecution — behind it.",
      },
      {
        work: "marano-1982",
        supports: "The dismantling of 'windigo psychosis' as a diagnostic category.",
      },
    ],
    verified: { checked: "2026-08-14", claims: 6, status: "amended" },
  },
];
