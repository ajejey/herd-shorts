# SPEC: C1 "The dial"

GOAL:    the viewer picks a side, watches the needle fight its way to dead centre, and comments their side.
OUTPUT:  HyperFrames, 1080 x 1920, 30 fps
TIME:    16.5 s x 30 = 495 frames. No music bed (no source here); ratchet ticks, a riser and one impact carry it.

DATA (data.json, Daily Hot Takes 4 Nov 2026, take "pizza"):
  "Pineapple on pizza?"  Absolutely 3,981 (52%)  ·  Never 3,702 (48%)  ·  7,683 players.

LOOK:    ground: the site's meadow (radial wash #CFE6F3 -> #FFF6E2 -> #FFE6A6, cow-spot dots #B9CCD8 at 35%).
         the dial = Spectrum's scale as a physical gauge: a 860 px half-disc, left half green #3D8B5A ("Absolutely"),
         right half pink #E84A8B ("Never"), 10 px #2D1810 rim, white tick marks every 10%.
         needle: 16 px #2D1810 bar, 380 px long, pivot covered by a pizza slice (cheese #F9C74F, crust #C98A12,
         pepperoni #D7263D, pineapple #FFE45C cubes) 150 px.
         display Fredoka 700: "Pineapple on pizza?" 120 px; result numbers 170 px; labels Quicksand 600 42 px.
OBJECTS: the dial, the needle with the pizza slice hub, cow mascot SVG on the end card.
MOTION:  the needle is a damped spring around its final angle (-3.2 deg = 51.8% Absolutely):
         angle(t) = -3.2 + 72 * e^(-0.42 (t - 0.4)) * cos(2.35 (t - 0.4)), closed form, from 0.4 s to 7.0 s; it already swings at frame 0.
         numbers land expo.out 0.5 s; words blur-in 0.13 s, 0.067 s apart.
SHOTS:
  0.0-3.0   Frame 0 = thumbnail: "Pineapple on pizza?" + the dial with the needle mid-swing + "7,683 people answered. Where did they land?"
            Ratchet tick each time the needle crosses centre.
  3.0-7.0   "Comment your guess" replaces the subline; swings narrow; the riser builds.
  7.0-7.6   Needle settles just left of centre; impact.
  7.6-11.6  "52%" lands under Absolutely in green, "48%" under Never in pink, counts under each (3,981 / 3,702).
            9.6: "Split almost exactly in half."
  11.6-12.9 "Which side are you on? Comment it."
  12.9-16.5 End card: cow rises (spring 0.55); "Pick a side every day"; "Daily Hot Takes"; "herdgamesonline.com" green.
            Source line from 7.6: "Daily Hot Takes · 4 Nov 2026".
BANNED:  dark void, glow, purple/blue gradients, a pie chart, three cards, docked logo, fade-and-slide-up everywhere,
         titles moving after they land, emoji, numbers not in DATA.
QA:      f0 poster reads; 2 s needle visibly swinging; 7.3 s needle settled left of centre; 9 s both numbers legible;
         15.5 s end card complete. Text inside y 168-1330 and x 80-930.
