/** Assign each English gloss to one topic tag (no Spanish). */

const EXACT = {
  hello: "basics",
  goodbye: "basics",
  please: "basics",
  "thank you": "basics",
  yes: "basics",
  no: "basics",
  bank: "civic",
  answer: "school",
  advantage: "work",
  advice: "phrases",
  agreement: "work",
  badly: "adjectives",
  "bad luck": "phrases",
  "at least": "phrases",
  certainly: "phrases",
  boring: "adjectives",
  bitter: "adjectives",
  brief: "adjectives",
  airline: "travel",
  "boarding pass": "travel",
  boarding: "travel",
  backpack: "travel",
  bicycle: "travel",
  ATM: "shopping",
  banknote: "shopping",
  bargain: "shopping",
  cashier: "shopping",
  boots: "clothes",
  calculator: "tech",
  century: "time",
  ankle: "body",
  wrist: "body",
  broom: "home",
  candle: "home",
  chalk: "school",
  athlete: "sports",
  championship: "sports",
  "bell peppers": "food",
  building: "everyday",
  box: "everyday",
  bag: "everyday",
  branch: "nature",
  cave: "nature",
  cactus: "nature",
  captain: "civic",
  celebration: "phrases",
  boredom: "feelings",
};

const PHRASE_START =
  /^(i |i'm |you |we |they |he |she |my |your |our |can you|do you|how |what |where |when |why |nice |good |have a|see you|bless|excuse|sorry|congrat)/i;

export function classifyEnTag(en) {
  const e = String(en).trim();
  const low = e.toLowerCase();
  const primary = low.split(/\s*\/\s*/)[0].trim();

  if (EXACT[low] || EXACT[primary]) return EXACT[low] || EXACT[primary];

  if (/^to\s+/i.test(e)) return "verbs";

  if (PHRASE_START.test(e) || e.includes("?") || e.includes("…")) return "phrases";

  if (
    /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred|thousand|million|first|second|third|half|quarter|zero)$/.test(
      primary
    )
  )
    return "numbers";

  if (
    /^(red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey|gold|silver|beige|navy|turquoise)$/.test(
      primary
    )
  )
    return "colors";

  if (
    /\b(today|tomorrow|yesterday|now|morning|afternoon|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|hour|minute|week|month|year|spring|summer|autumn|winter|early|late|always|never|sometimes|soon|later|before|after)\b/i.test(
      e
    )
  )
    return "time";

  if (
    /\b(chicken|beef|pork|lamb|fish|rice|bread|soup|salad|egg|cheese|milk|butter|sugar|salt|pepper|oil|vinegar|coffee|tea|juice|water|wine|beer|fruit|apple|banana|orange|lemon|tomato|potato|onion|garlic|carrot|meat|food|meal|breakfast|lunch|dinner|restaurant|kitchen|cook|bake|flour|honey|jam|chocolate|candy|cookie|biscuit|cake|pizza|pasta|sandwich|burger|steak|sausage|bacon|ham|shrimp|tuna|salmon|nut|bean|lentil|olive|yogurt|cream|ice cream|snack|dessert|spice|herb|mushroom|lettuce|corn|pea|avocado|coconut|ginger|cinnamon|mint|parsley|cilantro|watermelon|grape|strawberry|peach|pear|plum|cherry|melon|pineapple|mango|omelette|paella)\b/i.test(
      e
    )
  )
    return "food";

  if (
    /\b(dog|cat|bird|horse|cow|pig|sheep|goat|chicken|duck|mouse|rat|rabbit|deer|bear|lion|tiger|elephant|monkey|snake|fish|shark|whale|dolphin|insect|bee|ant|spider|butterfly|animal|pet|zoo|farm)\b/i.test(
      e
    )
  )
    return "animals";

  if (
    /\b(head|face|eye|ear|nose|mouth|tooth|teeth|lip|neck|shoulder|arm|elbow|hand|finger|chest|back|stomach|leg|knee|foot|toe|heart|brain|blood|bone|skin|hair|beard|body|muscle|nerve)\b/i.test(
      e
    )
  )
    return "body";

  if (
    /\b(doctor|hospital|medicine|pharmacy|pain|fever|cold|flu|sick|ill|health|nurse|surgery|patient|symptom|vaccine|allergy|injury|wound|bandage|pill|tablet|treatment|therapy|dentist|ambulance|emergency)\b/i.test(
      e
    )
  )
    return "health";

  if (
    /\b(shirt|pants|trousers|dress|skirt|jacket|coat|shoe|boot|sock|hat|glove|scarf|belt|tie|suit|uniform|jeans|sweater|underwear|pajama|wear|clothing|clothes|fashion)\b/i.test(
      e
    )
  )
    return "clothes";

  if (
    /\b(house|home|apartment|room|bedroom|bathroom|kitchen|door|window|wall|floor|ceiling|roof|bed|pillow|blanket|sheet|towel|soap|shower|bath|toilet|mirror|fridge|oven|stove|curtain|furniture|table|chair|sofa|lamp|cup|plate|knife|fork|spoon|bottle|glass|shelf|garage|garden|yard|stairs|elevator|key|lock)\b/i.test(
      e
    )
  )
    return "home";

  if (
    /\b(shop|store|market|price|cost|buy|sell|pay|money|cash|card|credit|discount|sale|receipt|customer|shopping|mall|supermarket|grocer)\b/i.test(
      e
    )
  )
    return "shopping";

  if (
    /\b(car|bus|train|plane|airport|ticket|passport|hotel|travel|trip|taxi|station|map|direction|left|right|straight|north|south|east|west|border|customs|luggage|suitcase|visa|flight|road|highway|bridge|traffic|driver|passenger|fuel|gas|petrol|parking)\b/i.test(
      e
    )
  )
    return "travel";

  if (
    /\b(rain|snow|wind|storm|cloud|sun|sunny|hot|cold|warm|cool|weather|temperature|forecast|humid|dry|fog|ice|degree|climate)\b/i.test(
      e
    )
  )
    return "weather";

  if (
    /\b(tree|flower|plant|forest|mountain|river|lake|sea|ocean|beach|island|desert|valley|hill|rock|stone|sand|grass|leaf|nature|sky|star|moon|earth|environment|park)\b/i.test(
      e
    )
  )
    return "nature";

  if (
    /\b(school|university|student|teacher|class|lesson|homework|exam|test|grade|book|notebook|pen|pencil|paper|desk|library|study|education|learn|principal|subject|math|science|history|language)\b/i.test(
      e
    )
  )
    return "school";

  if (
    /\b(work|job|office|boss|employee|company|business|meeting|salary|wage|career|interview|resume|colleague|manager|project|deadline|contract|client|profit|loss|trade|industry|factory|union|strike)\b/i.test(
      e
    )
  )
    return "work";

  if (
    /\b(computer|phone|internet|wifi|email|website|app|software|hardware|keyboard|screen|mouse|file|folder|data|network|password|download|upload|code|program|digital|tech|technology|battery|charger|cable|usb|robot|ai)\b/i.test(
      e
    )
  )
    return "tech";

  if (
    /\b(film|movie|cinema|tv|television|show|series|episode|music|song|radio|news|newspaper|magazine|book|novel|story|actor|actress|director|camera|photo|video|game|play|theater|concert|media|channel|podcast|stream)\b/i.test(
      e
    )
  )
    return "media";

  if (
    /\b(government|law|police|court|judge|lawyer|crime|prison|vote|election|president|minister|parliament|tax|citizen|rights|duty|army|war|peace|flag|country|nation|state|city|town|village|capital|border|civic|public|society|community|religion|church|mosque)\b/i.test(
      e
    )
  )
    return "civic";

  if (
    /\b(sport|football|soccer|basketball|tennis|golf|baseball|volleyball|swim|run|gym|fitness|exercise|team|player|coach|stadium|match|goal|ball|win|lose|score|champion|olympic|race|yoga|boxing|wrestling|ski|skate|bike|cycle)\b/i.test(
      e
    )
  )
    return "sports";

  if (
    /\b(happy|sad|angry|afraid|scared|worried|tired|bored|excited|nervous|calm|proud|shy|brave|lonely|love|hate|feel|emotion|mood|stress|relax|cry|laugh|smile)\b/i.test(
      e
    )
  )
    return "feelings";

  if (
    /\b(mother|father|parent|son|daughter|brother|sister|family|child|baby|man|woman|boy|girl|friend|husband|wife|uncle|aunt|cousin|grandfather|grandmother|people|person|neighbor|guest|host|human)\b/i.test(
      e
    )
  )
    return "people";

  if (
    /^(big|small|large|little|long|short|tall|high|low|wide|narrow|thick|thin|heavy|light|fast|slow|new|old|young|good|bad|nice|ugly|beautiful|pretty|easy|hard|difficult|simple|complex|clean|dirty|full|empty|open|closed|hot|cold|warm|cool|wet|dry|hard|soft|loud|quiet|strong|weak|rich|poor|cheap|expensive|safe|dangerous|same|different|important|possible|necessary|ready|busy|free|right|wrong|true|false|clear|dark|bright|deep|shallow|near|far|early|late|first|last|next|previous|main|special|general|public|private|national|international|local|global|modern|ancient|similar|equal|whole|half|enough|too|very|more|less|most|least|better|best|worse|worst|such|own|other|another|each|every|all|both|few|many|much|some|any|no|same)$/.test(
      primary
    ) ||
    /\b(adj|quality|size|shape|color|colour)\b/i.test(e)
  )
    return "adjectives";

  if (
    /\b(airline|boarding|runway|pilot|flight attendant|baggage|suitcase)\b/i.test(e)
  )
    return "travel";
  if (/\b(athlete|championship|tournament|medal|referee|league|goalkeeper)\b/i.test(e))
    return "sports";
  if (/\b(ankle|wrist|elbow|hip|thigh|heel|palm|thumb|waist|chest)\b/i.test(e)) return "body";
  if (/\b(calculator|database|server|browser|pixel|emoji|hashtag)\b/i.test(e)) return "tech";
  if (/\b(cashier|checkout|coupon|refund|banknote|ATM)\b/i.test(e)) return "shopping";
  if (/\b(century|decade|millennium)\b/i.test(e)) return "time";
  if (/\b(candle|broom|mop|vacuum|hammer|screwdriver|wrench|ladder)\b/i.test(e)) return "home";
  if (/\b(cave|canyon|volcano|waterfall|cliff|meadow)\b/i.test(e)) return "nature";
  if (/\b(bicycle|scooter|motorcycle|highway|tunnel)\b/i.test(e)) return "travel";
  if (/\b(boots|sneaker|sandal|heel|pajamas|hoodie)\b/i.test(e)) return "clothes";
  if (/\b(boredom|loneliness|jealousy|stress|relief)\b/i.test(e)) return "feelings";
  if (/\b(almost never|as soon as|at least|bad luck|good luck)\b/i.test(e)) return "phrases";

  if (
    /^(the|a|an|and|or|but|if|so|as|at|by|for|in|of|on|to|up|it|its|be|is|are|was|were|been|being|have|has|had|do|does|did|will|would|can|could|should|may|might|must|shall|not|no|yes|all|any|some|many|few|more|most|less|least|much|such|than|then|there|here|when|where|why|how|what|which|who|whom|whose|this|that|these|those|each|every|both|either|neither|one|two|other|another|same|own|only|just|also|too|very|quite|rather|almost|nearly|about|around|again|once|ever|never|always|often|usually|sometimes|already|still|yet|even|perhaps|maybe|well|now|soon|later|before|after|during|while|until|since|from|into|through|across|along|over|under|above|below|between|among|against|without|within|throughout|upon|toward|towards|despite|although|though|because|unless|whether|either|neither)$/i.test(
      primary
    )
  )
    return "basics";

  return "everyday";
}
