import type { Work } from "./types.ts";

/**
 * Works cited by the records.
 *
 * One entry per work, referenced from any number of records by its key —
 * Yanagita 1910 backs both `kappa` and `yurei`, and should only ever be
 * written down once.  What each source supports *in a given record* lives on
 * that record's `sources` array, not here.
 *
 * ── house rules ──────────────────────────────────────────────────────────
 * · DOIs, ISBNs and URLs appear ONLY when checked against the source itself.
 *   A plausible-looking wrong identifier is worse than no identifier, and it
 *   is the exact failure this pass exists to remove.  Where a work is real
 *   but its identifier was not verified, the work is cited plainly.
 * · URLs are absolute https.  The build is a single self-contained file that
 *   has to work opened straight from disk.
 * · tier "reference" is for encyclopaedia-style overviews.  Never the sole
 *   support for a hard claim.
 * · Never cite content farms, SEO blogspam, or AI-generated aggregators.
 */
export const WORKS = {
  // ── Japan ───────────────────────────────────────────────────────────────
  "nihon-shoki": {
    title: "Nihon Shoki (Chronicles of Japan)",
    year: 720,
    tier: "primary",
  },
  "smith-1974": {
    author: "Robert J. Smith",
    title: "Ancestor Worship in Contemporary Japan",
    year: 1974,
    publisher: "Stanford University Press",
    tier: "scholarly",
  },
  "britannica-bon": {
    title: "Bon (Japanese festival)",
    publisher: "Encyclopædia Britannica",
    url: "https://www.britannica.com/topic/Bon-Japanese-festival",
    tier: "reference",
  },
  "yanagita-1910": {
    author: "Yanagita Kunio",
    title: "Tōno Monogatari (The Legends of Tōno)",
    year: 1910,
    tier: "primary",
  },
  "davisson-2015": {
    author: "Zack Davisson",
    title: "Yūrei: The Japanese Ghost",
    year: 2015,
    publisher: "Chin Music Press",
    tier: "scholarly",
  },
  "hyakumonogatari-footless": {
    author: "Zack Davisson",
    title: "Ashinonai Yūrei — The Footless Yūrei",
    year: 2015,
    publisher: "Hyakumonogatari Kaidankai",
    url: "https://hyakumonogatari.com/2015/04/27/ashinonai-yurei-%E8%B6%B3%E3%81%AE%E3%81%AA%E3%81%84%E5%B9%BD%E9%9C%8A-the-footless-yurei/",
    tier: "scholarly",
  },

  "manyoshu": {
    title: "Man'yōshū (Collection of Ten Thousand Leaves)",
    year: 759,
    tier: "primary",
  },
  "foster-2015": {
    author: "Michael Dylan Foster",
    title: "The Book of Yōkai: Mysterious Creatures of Japanese Folklore",
    year: 2015,
    publisher: "University of California Press",
    isbn: "9780520271029",
    tier: "scholarly",
  },
  "glassman-2012": {
    author: "Hank Glassman",
    title: "The Face of Jizō: Image and Cult in Medieval Japanese Buddhism",
    year: 2012,
    publisher: "University of Hawai'i Press",
    isbn: "9780824835811",
    tier: "scholarly",
  },
  "jta-toro-nagashi": {
    title: "Toro Nagashi",
    publisher: "Japan Tourism Agency, Ministry of Land, Infrastructure, Transport and Tourism",
    url: "https://www.mlit.go.jp/tagengo-db/en/R1-00499.html",
    tier: "institutional",
  },

  // ── Korea ───────────────────────────────────────────────────────────────
  "nfm-jesa": {
    title: "What is Jesa (Ancestral Rite)?",
    publisher: "National Folk Museum of Korea",
    url: "https://www.nfm.go.kr/english/subIndex/1049.do",
    tier: "institutional",
  },
  "folkency": {
    title: "Encyclopedia of Korean Folk Culture",
    publisher: "National Folk Museum of Korea",
    url: "https://folkency.nfm.go.kr",
    tier: "institutional",
  },
  "khs-jindo-ssitgimgut": {
    title: "Jindo Ssitgimgut (Purification Ritual of Jindo)",
    publisher: "Korea Heritage Service",
    url: "https://english.khs.go.kr/chaen/search/selectGeneralSearchDetail.do?mn=EN_02_02&sCcebKdcd=17&ccebAsno=0000720000000&sCcebCtcd=36",
    tier: "institutional",
  },

  // ── China ───────────────────────────────────────────────────────────────
  "blake-2011": {
    author: "C. Fred Blake",
    title: "Burning Money: The Material Spirit of the Chinese Lifeworld",
    year: 2011,
    publisher: "University of Hawai'i Press",
    isbn: "9780824835323",
    tier: "scholarly",
  },
  "teiser-1994": {
    author: "Stephen F. Teiser",
    title: "The Scripture on the Ten Kings and the Making of Purgatory in Medieval Chinese Buddhism",
    year: 1994,
    publisher: "University of Hawai'i Press",
    isbn: "9780824815875",
    tier: "scholarly",
  },
  "teiser-1988": {
    // No identifier: the 1988 Princeton edition was not verified this session.
    author: "Stephen F. Teiser",
    title: "The Ghost Festival in Medieval China",
    year: 1988,
    publisher: "Princeton University Press",
    tier: "scholarly",
  },
  "faure-2007": {
    author: "David Faure",
    title: "Emperor and Ancestor: State and Lineage in South China",
    year: 2007,
    publisher: "Stanford University Press",
    isbn: "9780804753180",
    tier: "scholarly",
  },
  "holzman-1986": {
    author: "Donald Holzman",
    title: "The Cold Food Festival in Early Medieval China",
    year: 1986,
    publisher: "Harvard Journal of Asiatic Studies 46 (1), 51–79",
    doi: "10.2307/2719075",
    tier: "scholarly",
  },
  "chan-1998": {
    author: "Leo Tak-hung Chan",
    title: "The Discourse on Foxes and Ghosts: Ji Yun and Eighteenth-Century Literati Storytelling",
    year: 1998,
    publisher: "University of Hawai'i Press",
    isbn: "9780824820510",
    tier: "scholarly",
  },
  "moi-keelung-zhongyuan": {
    title: "Keelung Zhongyuan Ghost Festival",
    publisher: "Taiwan Religious Culture Map, Ministry of the Interior (Taiwan)",
    url: "https://taiwangods.moi.gov.tw/html/landscape_EN/1_0011.aspx?i=1",
    tier: "institutional",
  },
  "klctb-ghost-festival": {
    title: "Keelung Mid-summer Ghost Festival",
    publisher: "Culture and Tourism Bureau, Keelung City",
    url: "https://klctb.klcg.gov.tw/en/cp.aspx?n=7732",
    tier: "institutional",
  },

  // ── Southeast Asia ──────────────────────────────────────────────────────
  "davis-2016": {
    author: "Erik W. Davis",
    title: "Deathpower: Buddhism's Ritual Imagination in Cambodia",
    year: 2016,
    publisher: "Columbia University Press",
    isbn: "9780231169189",
    tier: "scholarly",
  },
  "volkman-1985": {
    author: "Toby Alice Volkman",
    title: "Feasts of Honor: Ritual and Change in the Toraja Highlands",
    year: 1985,
    publisher: "University of Illinois Press",
    isbn: "9780252011832",
    tier: "scholarly",
  },
  "skeat-1900": {
    author: "Walter William Skeat",
    title: "Malay Magic: Being an Introduction to the Folklore and Popular Religion of the Malay Peninsula",
    year: 1900,
    publisher: "Macmillan",
    url: "https://www.gutenberg.org/ebooks/47873",
    tier: "primary",
  },
  "galt-2021": {
    author: "Rosalind Galt",
    title: "Alluring Monsters: The Pontianak and Cinemas of Decolonization",
    year: 2021,
    publisher: "Columbia University Press",
    isbn: "9780231201339",
    tier: "scholarly",
  },
  "plasencia-1589": {
    // Plasencia's Relación is translated in Blair & Robertson vol. VII (1588–1591).
    author: "Juan de Plasencia",
    title: "Customs of the Tagalogs (1589), in Blair & Robertson, The Philippine Islands, 1493–1898, vol. VII",
    year: 1589,
    publisher: "Arthur H. Clark Company, 1903",
    url: "https://www.gutenberg.org/ebooks/13701",
    tier: "primary",
  },
  "thailand-foundation-phitakhon": {
    title: "Phi Ta Khon: The Happy Ghost Parade",
    publisher: "Thailand Foundation",
    url: "https://www.thailandfoundation.or.th/culture_heritage/phi-ta-khon/",
    tier: "institutional",
  },

  // ── West Asia ───────────────────────────────────────────────────────────
  "quran": {
    title: "The Qur'an — Sūrat al-Raḥmān (55) and Sūrat al-Jinn (72)",
    tier: "primary",
  },
  "elzein-2009": {
    author: "Amira El-Zein",
    title: "Islam, Arabs, and the Intelligent World of the Jinn",
    year: 2009,
    publisher: "Syracuse University Press",
    isbn: "9780815632009",
    tier: "scholarly",
  },
  "arbaeen-religions-2020": {
    title:
      "From Attachment to a Sacred Figure to Loyalty to a Sacred Route: The Walking Pilgrimage of Arbaeen",
    year: 2020,
    publisher: "Religions 11 (3), 145",
    doi: "10.3390/rel11030145",
    tier: "scholarly",
  },
  "etcsl-inana-descent": {
    title: "Inana's descent to the nether world (ETCSL t.1.4.1)",
    publisher: "Electronic Text Corpus of Sumerian Literature, University of Oxford",
    url: "https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.4.1",
    tier: "institutional",
  },
  "sladek-1974": {
    author: "William R. Sladek",
    title: "Inanna's Descent to the Netherworld",
    year: 1974,
    publisher: "PhD dissertation, Johns Hopkins University",
    tier: "scholarly",
  },

  // ── Europe ──────────────────────────────────────────────────────────────
  "fluckinger-1732": {
    author: "Johann Flückinger",
    title: "Visum et Repertum",
    year: 1732,
    publisher: "Signed at Belgrade, 26 January 1732",
    tier: "primary",
  },
  "barber-1988": {
    author: "Paul Barber",
    title: "Vampires, Burial, and Death: Folklore and Reality",
    year: 1988,
    publisher: "Yale University Press",
    isbn: "9780300164817",
    tier: "scholarly",
  },
  "magia-posthuma-vetr": {
    author: "Niels K. Petersen",
    title: "Visum et repertum",
    year: 2008,
    publisher: "Magia Posthuma",
    url: "https://magiaposthuma.blogspot.com/2008/09/visum-et-repertum.html",
    tier: "scholarly",
  },
  "arnason-1862": {
    author: "Jón Árnason",
    title: "Íslenzkar þjóðsögur og æfintýri",
    year: 1862,
    tier: "primary",
  },
  "cbc-galgahraun-2013": {
    title: "Elf advocates protest highway project in Iceland",
    year: 2013,
    publisher: "CBC News",
    url: "https://www.cbc.ca/news/world/elf-advocates-protest-highway-project-in-iceland-1.2473799",
    tier: "press",
  },
  "smithsonian-galgahraun-2013": {
    title: "Icelanders Protest a Road That Would Disturb Fairies",
    year: 2013,
    publisher: "Smithsonian Magazine",
    url: "https://www.smithsonianmag.com/smart-news/icelanders-protest-road-would-disturb-fairies-180949359/",
    tier: "press",
  },

  "hutton-1996": {
    author: "Ronald Hutton",
    title: "The Stations of the Sun: A History of the Ritual Year in Britain",
    year: 1996,
    publisher: "Oxford University Press",
    isbn: "9780198205708",
    tier: "scholarly",
  },
  "aubrey-1686": {
    // Written 1686–87; first printed in full by the Folklore Society, 1881.
    author: "John Aubrey",
    title: "Remaines of Gentilisme and Judaisme",
    year: 1686,
    tier: "primary",
  },
  "jalland-1996": {
    author: "Pat Jalland",
    title: "Death in the Victorian Family",
    year: 1996,
    publisher: "Oxford University Press",
    isbn: "9780198201885",
    tier: "scholarly",
  },
  "dsl-kelpie": {
    title: "kelpie, n.",
    publisher: "Dictionaries of the Scots Language / Scottish National Dictionary",
    url: "https://www.dsl.ac.uk/entry/snd/kelpie",
    tier: "institutional",
  },
  "otago-lochness-edna": {
    title: "First eDNA Study of Loch Ness Points to Something Fishy",
    year: 2019,
    publisher: "University of Otago",
    url: "https://www.otago.ac.nz/news/newsroom/first-edna-study-of-loch-ness-points-to-something-fishy",
    tier: "institutional",
  },
  "nsmm-cottingley": {
    title: "The story of the Cottingley Fairies shows that image manipulation is nothing new",
    publisher: "National Science and Media Museum, Bradford — which holds the Cottingley collection",
    url: "https://blog.scienceandmediamuseum.org.uk/the-story-of-the-cottingley-fairies-shows-that-image-manipulation-is-nothing-new/",
    tier: "institutional",
  },
  "ovid-fasti": {
    // No `year`: a bare "(8)" beside the title reads as a typo rather than a date.
    author: "Ovid",
    title: "Fasti",
    publisher: "c. 8 CE; Books II and V",
    tier: "primary",
  },
  "scullard-1981": {
    author: "H. H. Scullard",
    title: "Festivals and Ceremonies of the Roman Republic",
    year: 1981,
    publisher: "Thames & Hudson",
    tier: "scholarly",
  },
  "parker-2005": {
    author: "Robert Parker",
    title: "Polytheism and Society at Athens",
    year: 2005,
    publisher: "Oxford University Press",
    tier: "scholarly",
  },
  "stevens-1991": {
    // No DOI located this session; cited by volume, issue and pages instead.
    author: "Susan T. Stevens",
    title: "Charon's Obol and Other Coins in Ancient Funerary Practice",
    year: 1991,
    publisher: "Phoenix 45 (3), 215–229",
    tier: "scholarly",
  },
  "danforth-1982": {
    author: "Loring M. Danforth",
    title: "The Death Rituals of Rural Greece",
    year: 1982,
    publisher: "Princeton University Press",
    isbn: "9780691000275",
    tier: "scholarly",
  },

  "lebraz-1893": {
    author: "Anatole Le Braz",
    title: "La Légende de la mort en Basse-Bretagne — L'Ankou",
    year: 1893,
    publisher: "Honoré Champion; fieldwork in Trégor and Cornouaille from 1886",
    url: "https://fr.wikisource.org/wiki/La_L%C3%A9gende_de_la_mort_en_Basse-Bretagne/L%E2%80%99Ankou",
    tier: "primary",
  },
  "hutton-2014": {
    author: "Ronald Hutton",
    title: "The Wild Hunt and the Witches' Sabbath",
    year: 2014,
    publisher: "Folklore 125 (2), 161–178",
    doi: "10.1080/0015587X.2014.896968",
    tier: "scholarly",
  },
  "grimm-1835": {
    author: "Jacob Grimm",
    title: "Deutsche Mythologie",
    year: 1835,
    tier: "primary",
  },
  "armann-2009": {
    author: "Ármann Jakobsson",
    title:
      "The Fearless Vampire Killers: A Note about the Icelandic Draugr and Demonic Contamination in Grettis Saga",
    year: 2009,
    publisher: "Folklore 120 (3), 307–316",
    doi: "10.1080/00155870903219771",
    tier: "scholarly",
  },
  "ivanits-1989": {
    author: "Linda J. Ivanits",
    title: "Russian Folk Belief",
    year: 1989,
    publisher: "M. E. Sharpe",
    isbn: "9780873324229",
    tier: "scholarly",
  },
  "mills-2000": {
    author: "A. A. Mills",
    title: "Will-o'-the-wisp revisited",
    year: 2000,
    publisher: "Weather 55 (7)",
    doi: "10.1002/j.1477-8696.2000.tb04067.x",
    tier: "scholarly",
  },
  "mickiewicz-1823": {
    author: "Adam Mickiewicz",
    title: "Dziady (Parts II and IV)",
    year: 1823,
    tier: "primary",
  },
  "vatican-all-souls": {
    title: "Commemoration of All the Faithful Departed (All Souls' Day)",
    publisher: "Vatican News",
    url: "https://www.vaticannews.va/en/liturgical-holidays/commemoration-of-all-the-faithful-departed--all-souls-day-.html",
    tier: "institutional",
  },
  "sedlec-ossuary": {
    title: "Sedlec Ossuary — The Church of Bones",
    publisher: "Sedlec Ossuary, Kutná Hora",
    url: "https://sedlecossuary.com/",
    tier: "institutional",
  },
  "unesco-at-inventory": {
    title: "National Inventory of Intangible Cultural Heritage in Austria",
    publisher: "Austrian Commission for UNESCO",
    url: "https://www.unesco.at/en/culture/intangible-cultural-heritage/inventory",
    tier: "institutional",
  },
  "sks-kekri": {
    title: "Kekri ja halloween (Juhlakalenteri)",
    publisher: "Suomalaisen Kirjallisuuden Seura — the Finnish Literature Society",
    url: "https://tietava.finlit.fi/juhlakalenteri/kekri-ja-halloween/",
    tier: "institutional",
  },

  // ── South Asia ──────────────────────────────────────────────────────────
  "claus-1979": {
    author: "Peter J. Claus",
    title:
      "Spirit Possession and Spirit Mediumship from the Perspective of Tulu Oral Traditions",
    year: 1979,
    publisher: "Culture, Medicine and Psychiatry 3 (1), 29–52",
    doi: "10.1007/BF00114691",
    tier: "scholarly",
  },

  "rigveda": {
    title: "Rigveda, Maṇḍala 10, hymn 14",
    publisher: "composed c. 1500–1200 BCE",
    tier: "primary",
  },
  "crooke-1896": {
    author: "William Crooke",
    title: "The Popular Religion and Folk-lore of Northern India",
    year: 1896,
    publisher: "A. Constable & Co.",
    url: "https://www.gutenberg.org/cache/epub/43682/pg43682-images.html",
    tier: "primary",
  },
  "eck-1982": {
    author: "Diana L. Eck",
    title: "Banaras: City of Light",
    year: 1982,
    publisher: "Alfred A. Knopf",
    isbn: "9780394519715",
    tier: "scholarly",
  },
  "sayers-2015": {
    author: "Matthew R. Sayers",
    title: "The Śrāddha: The Development of Ancestor Worship in Classical Hinduism",
    year: 2015,
    publisher: "Religion Compass 9 (6)",
    doi: "10.1111/rec3.12155",
    tier: "scholarly",
  },
  "oaks-2004": {
    author: "J. Lindsay Oaks and others",
    title: "Diclofenac residues as the cause of vulture population decline in Pakistan",
    year: 2004,
    publisher: "Nature 427, 630–633",
    doi: "10.1038/nature02317",
    tier: "scholarly",
  },
  "boyce-zoroastrians": {
    // No year: the second edition is dated 2000 by the publisher and 2001 in
    // most citations, and neither was verified against the book itself.
    author: "Mary Boyce",
    title: "Zoroastrians: Their Religious Beliefs and Practices",
    publisher: "Routledge, 2nd edition",
    isbn: "9780415239028",
    tier: "scholarly",
  },

  // ── Africa ──────────────────────────────────────────────────────────────
  "book-of-the-dead": {
    title: "The Book of Going Forth by Day, spell 125",
    publisher: "New Kingdom to Ptolemaic funerary papyri, c. 1550–50 BCE",
    tier: "primary",
  },
  "rueness-2011": {
    author: "Eli Knispel Rueness and others",
    title: "The Cryptic African Wolf: Canis aureus lupaster Is Not a Golden Jackal and Is Not Endemic to Egypt",
    year: 2011,
    publisher: "PLOS ONE 6 (1)",
    doi: "10.1371/journal.pone.0016385",
    tier: "scholarly",
  },
  "drewal-1978": {
    author: "Margaret Thompson Drewal and Henry John Drewal",
    title: "More Powerful than Each Other: An Egbado Classification of Egungun",
    year: 1978,
    publisher: "African Arts 11 (3)",
    tier: "scholarly",
  },
  "ashforth-2005": {
    author: "Adam Ashforth",
    title: "Witchcraft, Violence, and Democracy in South Africa",
    year: 2005,
    publisher: "University of Chicago Press",
    tier: "scholarly",
  },
  "bloch-1971": {
    author: "Maurice Bloch",
    title:
      "Placing the Dead: Tombs, Ancestral Villages, and Kinship Organization in Madagascar",
    year: 1971,
    publisher: "Seminar Press",
    tier: "scholarly",
  },
  "tschumi-2014": {
    author: "Regula Tschumi",
    title: "Concealed Art: The Figurative Palanquins and Coffins of Ghana",
    year: 2014,
    publisher: "Benteli",
    isbn: "9783038280996",
    tier: "scholarly",
  },
  "vanbeek-1991": {
    author: "Walter E. A. van Beek",
    title: "Dogon Restudied: A Field Evaluation of the Work of Marcel Griaule",
    year: 1991,
    publisher: "Current Anthropology 32 (2), 139–158",
    url: "https://www.jstor.org/stable/2743641",
    tier: "scholarly",
  },
  "boddy-1989": {
    author: "Janice Boddy",
    title: "Wombs and Alien Spirits: Women, Men, and the Zār Cult in Northern Sudan",
    year: 1989,
    publisher: "University of Wisconsin Press",
    isbn: "9780299123147",
    tier: "scholarly",
  },
  "nzewi-2001": {
    author: "Esther Nzewi",
    title: "Malevolent ogbanje: recurrent reincarnation or sickle cell disease?",
    year: 2001,
    publisher: "Social Science & Medicine 52 (9), 1403–1416",
    url: "https://pubmed.ncbi.nlm.nih.gov/11286364/",
    tier: "scholarly",
  },
  "achebe-1958": {
    author: "Chinua Achebe",
    title: "Things Fall Apart",
    year: 1958,
    publisher: "William Heinemann",
    tier: "primary",
  },

  // ── Oceania ─────────────────────────────────────────────────────────────
  "rapanui-2024": {
    title: "Ancient Rapanui genomes reveal resilience and pre-European contact with the Americas",
    year: 2024,
    publisher: "Nature 633",
    doi: "10.1038/s41586-024-07881-4",
    tier: "scholarly",
  },
  "teara-tangihanga": {
    author: "Rawinia Higgins",
    title: "Tangihanga — death customs",
    year: 2011,
    publisher: "Te Ara — the Encyclopedia of New Zealand, Manatū Taonga",
    url: "https://teara.govt.nz/en/tangihanga-death-customs",
    tier: "institutional",
  },
  "aiatsis-cultural-sensitivity": {
    title: "Cultural sensitivity",
    publisher:
      "Australian Institute of Aboriginal and Torres Strait Islander Studies (AIATSIS)",
    url: "https://aiatsis.gov.au/cultural-sensitivity",
    tier: "institutional",
  },
  "qld-sorry-business": {
    title: "Sad news, sorry business: guidelines for caring for Aboriginal and Torres Strait Islander people through death and dying",
    publisher: "Queensland Health",
    url: "https://www.health.qld.gov.au/__data/assets/pdf_file/0023/151736/sorry_business.pdf",
    tier: "institutional",
  },
  "teara-taniwha": {
    title: "Taniwha",
    publisher: "Te Ara — the Encyclopedia of New Zealand, Manatū Taonga",
    url: "https://teara.govt.nz/en/taniwha/page-8",
    tier: "institutional",
  },
  "nzherald-karutahi": {
    title: "Work to resume near one-eyed taniwha",
    year: 2002,
    publisher: "The New Zealand Herald",
    url: "https://www.nzherald.co.nz/nz/work-to-resume-near-one-eyed-taniwha/PRZGHC5CQQRFK423UATKFOTGAY/",
    tier: "press",
  },
  "sydney-gazette-1812": {
    title: "Report of a 'bahnyip' in the Sydney Gazette",
    year: 1812,
    publisher: "The Sydney Gazette and New South Wales Advertiser",
    tier: "primary",
  },
  "geelong-advertiser-1845": {
    title: "Wonderful Discovery of a New Animal",
    year: 1845,
    publisher: "Geelong Advertiser, 2 July 1845",
    tier: "primary",
  },

  // ── Americas ────────────────────────────────────────────────────────────
  "brandes-2006": {
    author: "Stanley Brandes",
    title: "Skulls to the Living, Bread to the Dead: The Day of the Dead in Mexico and Beyond",
    year: 2006,
    publisher: "Blackwell",
    isbn: "9781405152488",
    tier: "scholarly",
  },
  "chesnut-2012": {
    // No identifier: the 2012 first edition's ISBN was not verified this
    // session, and the ones in circulation belong to later editions.
    author: "R. Andrew Chesnut",
    title: "Devoted to Death: Santa Muerte, the Skeleton Saint",
    year: 2012,
    publisher: "Oxford University Press",
    tier: "scholarly",
  },
  "radford-2011": {
    author: "Benjamin Radford",
    title: "Tracking the Chupacabra: The Vampire Beast in Fact, Fiction, and Folklore",
    year: 2011,
    publisher: "University of New Mexico Press",
    isbn: "9780826350152",
    tier: "scholarly",
  },
  "perez-2008": {
    author: "Domino Renee Perez",
    title: "There Was a Woman: La Llorona from Folklore to Popular Culture",
    year: 2008,
    publisher: "University of Texas Press",
    isbn: "9780292718128",
    tier: "scholarly",
  },
  "florentine-codex": {
    author: "Bernardino de Sahagún and his Nahua collaborators",
    title: "Florentine Codex (Books III and XII)",
    publisher: "compiled c. 1545–1590; Getty digital edition",
    url: "https://florentinecodex.getty.edu/",
    tier: "primary",
  },
  "anchieta-1560": {
    author: "José de Anchieta",
    title: "Letter to Ignatius of Loyola, 31 May 1560",
    year: 1560,
    tier: "primary",
  },
  "carpio-1849": {
    author: "Manuel Carpio",
    title: "La Llorona (sonnet)",
    year: 1849,
    tier: "primary",
  },
  "uady-hanal-pixan": {
    title: "Hanal Pixán",
    publisher:
      "Centro de Investigaciones Regionales \"Dr. Hideyo Noguchi\", Universidad Autónoma de Yucatán",
    url: "https://www.mayas.uady.mx/articulos/pixan.html",
    tier: "institutional",
  },
  "regal-2018": {
    author: "Brian Regal and Frank J. Esposito",
    title:
      "The Secret History of the Jersey Devil: How Quakers, Hucksters, and Benjamin Franklin Created a Monster",
    year: 2018,
    publisher: "Johns Hopkins University Press",
    isbn: "9781421424897",
    tier: "scholarly",
  },
  "jabbour-2010": {
    author: "Alan Jabbour and Karen Singer Jabbour",
    title:
      "Decoration Day in the Mountains: Traditions of Cemetery Decoration in the Southern Appalachians",
    year: 2010,
    publisher: "University of North Carolina Press",
    isbn: "9780807833971",
    tier: "scholarly",
  },
  "beardsley-hankey-1942": {
    author: "Richard K. Beardsley and Rosalie Hankey",
    title: "The Vanishing Hitchhiker",
    year: 1942,
    publisher: "California Folklore Quarterly 1 (4), 303–335",
    doi: "10.2307/1495600",
    tier: "scholarly",
  },
  "braude-2008": {
    // Second edition; the 1989 Beacon Press first edition was not verified.
    author: "Ann Braude",
    title: "Radical Spirits: Spiritualism and Women's Rights in Nineteenth-Century America",
    year: 2008,
    publisher: "Indiana University Press, 2nd edition",
    isbn: "9780253215024",
    tier: "scholarly",
  },
  "64p-jazz-funerals": {
    title: "Jazz Funerals and Second Line Parades",
    publisher: "64 Parishes, Louisiana Endowment for the Humanities",
    url: "https://64parishes.org/entry/jazz-funerals-and-second-line-parades",
    tier: "institutional",
  },
  "knudsen-2009": {
    // The thread itself is the claim; no stable archival URL verified this session.
    author: "Eric Knudsen, as \"Victor Surge\"",
    title: "Two doctored photographs posted to the Something Awful forums, 10 June 2009",
    year: 2009,
    tier: "primary",
  },
  "lovecraft-cthulhu": {
    author: "H. P. Lovecraft",
    title: "The Call of Cthulhu",
    year: 1928,
    publisher: "written 1926; published in Weird Tales, February 1928",
    tier: "primary",
  },
  "burns-1929": {
    author: "J. W. Burns",
    title: "Introducing B.C.'s Hairy Giants",
    year: 1929,
    publisher: "Maclean's, 1 April 1929",
    url: "https://archive.macleans.ca/article/1929/4/1/introducing-b-cs-hairy-giants",
    tier: "primary",
  },
  "canencyc-sasquatch": {
    title: "Sasquatch",
    publisher: "The Canadian Encyclopedia",
    url: "https://www.thecanadianencyclopedia.ca/en/article/sasquatch",
    tier: "institutional",
  },
  "mills-1997": {
    author: "Kenneth Mills",
    title: "Idolatry and Its Enemies: Colonial Andean Religion and Extirpation, 1640–1750",
    year: 1997,
    publisher: "Princeton University Press",
    isbn: "9780691029795",
    tier: "scholarly",
  },
  "cosentino-1995": {
    author: "Donald J. Cosentino (ed.)",
    title: "Sacred Arts of Haitian Vodou",
    year: 1995,
    publisher: "UCLA Fowler Museum of Cultural History",
    isbn: "9780930741471",
    tier: "scholarly",
  },
  "smithsonian-natitas": {
    title: "Meet the Celebrity Skulls of Bolivia's Fiesta de las Ñatitas",
    publisher: "Smithsonian Magazine",
    url: "https://www.smithsonianmag.com/arts-culture/meet-celebrity-skulls-bolivias-fiesta-de-las-natitas-180957289/",
    tier: "press",
  },

  "nileathlobhair-2018": {
    author: "Máire Ní Leathlobhair et al.",
    title: "The evolutionary history of dogs in the Americas",
    year: 2018,
    publisher: "Science 361 (6397), 81–85",
    doi: "10.1126/science.aao4776",
    tier: "scholarly",
  },
  "xca-about": {
    title: "About Xolos",
    publisher: "Xoloitzcuintli Club of America",
    url: "https://www.xoloitzcuintliclubofamerica.org/about-xolos",
    tier: "institutional",
  },
  "bronowski-1975": {
    author: "Judith Bronowski",
    title: "Pedro Linares: Artesano de Cartón",
    year: 1975,
    publisher: "documentary film",
    tier: "primary",
  },
  "keel-1975": {
    author: "John A. Keel",
    title: "The Mothman Prophecies",
    year: 1975,
    publisher: "Saturday Review Press",
    tier: "press",
  },
  "ntsb-silver-bridge": {
    title:
      "Collapse of U.S. 35 Highway Bridge, Point Pleasant, West Virginia, December 15, 1967",
    year: 1971,
    publisher: "National Transportation Safety Board",
    tier: "institutional",
  },
  "marano-1982": {
    author: "Lou Marano",
    title: "Windigo Psychosis: The Anatomy of an Emic-Etic Confusion",
    year: 1982,
    publisher: "Current Anthropology 23 (4)",
    doi: "10.1086/202868",
    tier: "scholarly",
  },
  "brightman-1988": {
    author: "Robert A. Brightman",
    title: "The Windigo in the Material World",
    year: 1988,
    publisher: "Ethnohistory 35 (4), 337–379",
    doi: "10.2307/482140",
    tier: "scholarly",
  },
  "johnston-1995": {
    author: "Basil Johnston",
    title: "The Manitous: The Spiritual World of the Ojibway",
    year: 1995,
    publisher: "HarperCollins",
    tier: "primary",
  },
} as const satisfies globalThis.Record<string, Work>;

/** Every valid citation key. Typos become compile errors. */
export type WorkKey = keyof typeof WORKS;

export const workCount = Object.keys(WORKS).length;
