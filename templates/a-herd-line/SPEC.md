# SPEC: A1 "The herd on the number line"

GOAL:    the viewer guesses, watches the herd pile up at 7, then feels the jump to 4,000, and wants to try today's question.
OUTPUT:  HyperFrames, 1080 x 1920, 30 fps
TIME:    19.0 s x 30 = 570 frames. No music bed (no source here); a 10 s riser is the tension bed, peaking on the answer.

DATA (data.json, Daily Guesstimate 7 Nov 2026, question 362):
  "Roughly how many times can a US dollar bill be folded back and forth before it tears?" Answer 4,000.
  116 players. Most common guess 7 (16 players). 74 of 116 guessed under 100. Exactly 1 guessed 4,000.
  Fact (game's own): "US paper money is 75 percent cotton and 25 percent linen."

LOOK:    ground = the site's meadow: radial wash, top-left #CFE6F3 -> centre #FFF6E2 -> bottom-right #FFE6A6,
         plus the site's cow-spot dots (#B9CCD8 at 35%, 14 px dots on a 64 px grid). Two site clouds (#FFFFFF), drifting 6 px/s.
         ink #2D1810. accent #E84A8B ONLY on the answer flag, the "4,000" and the one sheep that guessed it.
         display Fredoka 700 (site font file), question 84 px / -1% tracking / 1.08 line height; labels Quicksand 600 40-44 px.
         medium: the site's own flat line-art (2.4 px #2D1810 strokes, white fills). No shadows except the cow's own.
OBJECTS: number line: 8 px #2D1810 rounded bar, x 90 -> 900 at y 1180, ticks 18 px, labels Quicksand 600 34 px under it.
         sheep: the site's Daily Herd sheep SVG at 46 px, stacked 21 px apart per column.
         answer flag: 6 px pole + pink #E84A8B pennant, 300 px tall.
         cow mascot: the site's SVG, 520 px, end card only.
MOTION:  arrivals expo.out 0.5 s; sheep drop power2.in 0.32 s then a squash 1.0 -> 0.86 -> 1.0 (acting, 0.18 s);
         camera (the scale change) power2.inOut 1.7 s; exits 0.2 s blur 8 px; words blur-in 0.13 s, 0.067 s apart.
SHOTS:
  0.0-3.0   Frame 0 = thumbnail: question (4 lines, top) + empty line + "Guess before the herd does" + countdown 3.
            Countdown numerals 3/2/1 land at 0.0/1.0/2.0 (pink? no: ink, 200 px). Pop on each.
  3.0-3.4   Question blurs out; a small permanent label replaces it: "Folds before a dollar bill tears".
  3.4-6.4   116 sheep drop at their real guesses, staggered 2.4 s (towers rise at 4-8). Pops in clusters.
            4.2: label "116 players guessed". 6.0: tag on the tallest tower "Most said 7".
  6.6-7.6   Hold: "The real answer is..." (0.75 s before the payoff).
  7.6-9.3   The scale pulls out 0-100 -> 0-4,000: the herd collapses into one tower at the left; ticks 1,000-4,000 arrive. Whoosh.
  9.3-12.0  Pink flag drops at 4,000 (impact). "4,000 folds" lands huge in pink. 10.6: fact line.
  12.0-15.6 The one sheep standing at the flag turns pink. "1 of 116 players got it exactly." Pop.
  15.6-19.0 End card: blur swap; cow rises (spring 0.55); "Can you beat the herd?"; "Daily Guesstimate · new every day";
            "herdgamesonline.com" in green #3D8B5A. Holds 2.6 s. Source line from 3.4 on: "Daily Guesstimate · 7 Nov 2026".
BANNED:  dark void, glow, gradients beyond the meadow wash, three cards, docked logo, everything centred,
         fade-and-slide-up on every element, titles moving after they land, emoji, any number not in DATA.
QA:      f0 reads as a poster (question + countdown); 5.5 s towers readable; 8.4 s mid-zoom has no jump;
         10.5 s "4,000" is the biggest thing; 13.5 s the pink sheep sits at the flag; 18 s end card complete.
         Text inside y 168-1330 and x 80-930.
