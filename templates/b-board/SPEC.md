# SPEC: B1 "The board"

GOAL:    the viewer tries to name #1 before the reveal, laughs at PRINTER 38%, and wants to play today's board.
OUTPUT:  HyperFrames, 1080 x 1920, 30 fps
TIME:    18.5 s x 30 = 555 frames. No music bed (no source here); tile flips + riser + impact carry it.

DATA (data.json, Top Answers board shown 4 Nov 2026, from 3,071 Daily Herd answers):
  "Name something that always breaks in an office."
  #1 Printer 38% (1,155) · #2 Computer 8% · #3 Mugs 8% · #4 Stapler 6% · #5 Chair 5% · #6 Coffee machine 5% · #7 Copier 4% · #8 Pencil 4%

LOOK:    ground: the site's cream #FFF8E7 with cow-spot dots (#F1E3C8 at 60%, 14 px on a 64 px grid).
         the board = the site's Top Answers card scaled for video: card #FFFFFF, 4 px border #F6C9DA, radius 36 px;
         tiles #FFF6EC, radius 22 px, 76 px tall; numerals in pink #E84A8B circles (54 px); answer text Fredoka 600 46 px ink #2D1810;
         % Quicksand 700 44 px. Accent pink is the board's own numerals and the #1 payoff only.
         display Fredoka 700: question 80 px, 1.08 line height.
OBJECTS: the board (8 tiles), a printer drawn as the lucide-style line printer (6 px #2D1810 stroke) for the payoff, cow mascot SVG on the end card.
MOTION:  tile flip: rotateX 90 -> 0 deg on the tile face, 0.32 s back.out(1.3) (a game-show card, acting);
         the #1 tile grows into the frame (object becomes the world) 0.65 s power2.inOut, the board blurs 14 px and fades 0.3 s.
         words blur-in 0.13 s, 0.067 s apart; exits 0.2 s.
SHOTS:
  0.0-3.0   Frame 0 = thumbnail: question + "3,071 people answered" + 8 blank numbered tiles + "Name the #1 answer" + countdown 3 (2, 1 at 1.0/2.0).
  3.1-9.4   Tiles flip #8 -> #2, one every 0.9 s, each with a flip sound (3 takes rotated).
  9.4-10.4  Hold: "And the #1 answer..." under the board; tile #1 shakes once (a jammed printer, 0.25 s).
  10.4-14.6 #1 flips to PRINTER 38%, impact; the tile grows to fill the frame: giant PRINTER, giant 38%, the printer drawing,
            "1,155 of 3,071 people". 12.8: "Of course it's the printer."
  14.6-18.5 End card: cow rises (spring 0.55); "Play today's board"; "Top Answers · a new board every day"; "herdgamesonline.com" green.
            Source line under the board from 3.1: "Top Answers · 4 Nov 2026".
BANNED:  dark void, glow, purple/blue gradients, three cards in a row, docked logo, fade-and-slide-up everywhere,
         titles moving after they land, emoji, labels not from DATA (no invented answers).
QA:      f0 reads as a poster; 6 s board half revealed and legible on a phone; 10.6 s #1 lands; 12 s PRINTER 38% biggest;
         17.5 s end card complete. Text inside y 168-1330 and x 80-930.
