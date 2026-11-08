// Writes assets/fresh/scoreboard.manifest.json (run from the repo root).
const fs = require("fs");
const m = require("../../../../../assets/manifest.json");
const A = "2026-11-01 founder, in chat: generate whatever assets you want";
const grade =
  "Colour grade for the whole set: neutral overcast daylight, quiet and precise, muted greys, charcoal, slate navy and off-white, warm natural skin, one small ochre or mustard accent in clothing where it fits, soft contrast, no orange and teal look. Tight editorial crop, shallow depth of field, 85mm lens.";
const d = {
  ...m.defaults,
  stillSuffix:
    grade +
    " " +
    m.defaults.stillSuffix +
    " Hands have five fingers each and hold devices naturally. Nobody is holding a pencil, paper, a notebook or a calculator. Laptop lids and phone backs are plain, with no logo of any kind.",
};
const S = (id, route, ratio, where, prompt) => ({
  id: "scoreboard-" + id,
  status: "approved",
  approved: A,
  route,
  ratio,
  where,
  prompt,
});
const stills = [
  S("focus-girl", "flux-3", "3:2", "hero side / test section",
    "Close portrait of a 17-year-old girl with dark curly hair tied back, wearing a grey crewneck sweatshirt and white AirPods Pro, sitting at a pale oak kitchen table on a Saturday morning, working on a silver laptop seen from behind its lid so the screen faces away from the camera. Her face is lit softly by the window to her left, eyes down on the screen, completely focused, mouth relaxed. Crop from just above her head to her hands resting on the laptop keyboard. Plain off-white wall behind her."),
  S("hands-laptop", "flux-3", "3:2", "demo section",
    "Tight close-up of a 16-year-old boy's hands on a silver laptop keyboard and trackpad, the sleeves of a navy hoodie pushed up, a plain glass of water at the edge of frame, pale oak desk, morning window light from the left. The laptop screen is out of frame. Only the hands, wrists and keyboard are visible, sharp focus on the fingers."),
  S("bench-phone", "flux-3", "3:2", "daily 10 / method section",
    "A 16-year-old boy in a plain charcoal training jacket sitting on a metal bench beside an empty high school soccer field during a practice break, overcast afternoon, holding his phone in both hands with the back of the phone toward the camera, looking down at it with calm focus. Tight crop from the top of his head to his hands, the field soft and grey-green behind him."),
  S("tutor-zoom", "flux-3", "3:2", "tutor section",
    "A woman tutor in her late twenties with short dark hair, wearing a slate grey sweater and a slim headset with a small microphone, sitting alone at a desk in her own quiet home office with white shelves softly out of focus behind her, looking into her laptop camera and explaining something with one open hand, a small warm smile. The laptop is seen from the side so its screen is not visible. Tight crop on her face, hands and the laptop edge."),
  S("student-zoom", "flux-3", "3:2", "tutor section",
    "A 17-year-old boy with short black hair in a mustard yellow crewneck sweater, alone in his own bedroom at a white desk in the evening, a desk lamp lighting him warmly, wearing over-ear headphones, leaning toward his laptop and listening carefully during a video call. The laptop is seen from behind its lid. Tight crop on his face, shoulders and hands on the desk."),
  S("parent-phone", "flux-3", "3:2", "parent update section",
    "A mother in her late forties with grey-streaked dark hair pinned up, wearing a navy cardigan, standing at a kitchen counter in early evening, reading her phone held in one hand with the back of the phone toward the camera, a calm, attentive expression, reading glasses on. Tight crop from her head to her hand and the phone. Soft window light, plain wall."),
  S("parent-dad", "flux-3", "3:2", "parent update / faq",
    "A father in his early fifties with short salt-and-pepper hair and a light blue oxford shirt, sitting at a dining table at night under one warm pendant lamp, reading on his phone held in both hands with its back toward the camera, thoughtful, a mug beside him. Tight crop from his head to the phone and the table edge."),
  S("bus-phone", "flux-3", "2:3", "daily 10 phone crop",
    "A 16-year-old girl with long straight black hair in a dark green coat, sitting by the window of a city bus in grey morning light, white AirPods Pro in, looking down at her phone held in both hands, back of the phone toward the camera, quietly focused. Vertical frame, tight crop from her head to her hands, rain-streaked window softly behind her."),
  S("library-laptop", "flux-3", "3:2", "plans section",
    "A 17-year-old girl with a short brown bob and a cream knit sweater studying alone at a long wooden library table by a tall window on an overcast afternoon, chin resting lightly on one hand, eyes on her silver laptop seen from behind its lid, deeply focused. Tight crop on her face, hand and the top edge of the laptop lid."),
  S("weekend-desk", "flux-3", "3:2", "free test close",
    "A 16-year-old boy with curly brown hair in a plain heather grey t-shirt at a white desk in his bedroom on a bright Saturday morning, sitting upright and composed in front of his silver laptop, seen from behind its lid, starting a timed test, hands ready on the keyboard, calm serious expression. Tight crop from above his head to his hands."),
  S("two-hands-phone", "ideogram-4.5", "3:2", "method close-up",
    "Extreme close-up of a teenager's two hands holding a black phone, back of the phone toward the camera, thumbs resting on its edges, the cuff of a grey hoodie at the wrists, a soft out-of-focus kitchen behind. Natural morning light. Photograph."),
  S("girl-window", "ideogram-4.5", "2:3", "phone hero crop",
    "Vertical close portrait of a 17-year-old girl with a dark braid and a slate blue hoodie sitting by a window in soft grey daylight, white AirPods Pro, looking down at a silver laptop at the bottom edge of the frame seen from behind its lid, focused and still. Photograph."),
];
const out = {
  about:
    "Scoreboard direction (fresh round, 2026-11-01): stills for .impeccable/mocks/fresh/scoreboard. Founder approved all image creation in chat on 2026-11-01.",
  defaults: d,
  cast: {},
  shots: [],
  plates: [],
  stills,
};
fs.writeFileSync("assets/fresh/scoreboard.manifest.json", JSON.stringify(out, null, 2));
console.log("wrote", stills.length);
