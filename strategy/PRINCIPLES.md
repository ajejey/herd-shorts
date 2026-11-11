# How a Herd Short works (11 Nov 2026)

Written after Ajey watched the first seven renders: "terrible sound fx,
everything has the same... they just appear... made mindlessly without any
context or sense of who is the viewer." He was right. They reported what the
herd did yesterday. They never gave the viewer a reason to stop or a turn to play.
Every template, pick and review follows this file. It is dated: the weekly
review may overturn any rule with ledger rows.

## Who is watching

- A stranger thumb-scrolling Shorts or Reels on a phone. They have never heard
  of Herd Games. They decide to stay or swipe in about a second (YouTube shows
  this as "viewed vs swiped away"; most guides put the decision at 1-3 s).
- Often in public with the sound off (Instagram feed especially), sometimes with
  sound on (the Shorts tab and the Reels tab lean sound-on). The video must work
  both ways.
- They stay for: a challenge they think they can win, a surprise, an opinion
  they already hold, and above all being compared with other people.
- What only we have: real answers from thousands of real players. **You vs the
  herd** is the hook nobody else can make.

## The rules

1. **The viewer plays.** Every video is a question first: they guess, then see
   how the herd did, then how they compare. Never a report of yesterday.
2. **The first second is the hook.** The challenge, naming the game ("Can you
   guess the doodle before line 3?"), pops in word by word within about 0.8 s
   over the thing to guess, then stays for the whole video. Motion from frame 0
   is what stops a scroll. Never a date, a kicker, a label or a logo first. The
   cover (thumbnail) is set to a frame with everything on screen, about 1.5 s
   in: Instagram's API takes it as `thumb_offset`; on YouTube pick that frame.
3. **Give them a turn.** A visible countdown (about 3-5 s) with a ticking clock:
   the "pause and guess" window. Then the reveal.
4. **One open loop, closed late.** Promise the payoff early ("only 4% got it")
   and land the answer about 60-80% of the way in. Never resolve it in the
   first half.
5. **Something changes every 1-2 s, a new beat every 2-3 s.** One big moment
   only: the reveal (punch-in, impact, the music drops).
6. **Sound means something.** A music bed with quiz-show energy from frame 0
   that builds into the reveal and drops on it. Every action gets its own sound,
   picked for what it means: a clock tick for the countdown, a drumroll or riser
   before the answer, a ding for right, a buzzer for wrong, a crowd "ooh" at a
   surprising number, a pop when a chip lands. Two or three takes of anything
   repeated. Never one sound for everything.
7. **Compare them with the herd.** "Only 28 of 344 got it from one line. Did
   you?" Social comparison is what makes people comment and send it on.
8. **Ask a real question, never for engagement.** "When did you get it?",
   "What did you guess?": a question with a one-word answer invites replies.
   Never "comment", "share", "tag", "like", "follow" or "send this to": Instagram
   says it will not recommend posts that explicitly ask for comments, shares or
   tags (engagement bait), and those are exactly the non-followers we need
   (11 Nov 2026; check.mjs fails any default copy that asks).
9. **Short, loop, and say where to play.** 12-18 s. No separate end card: that
   is where people swipe. The last beat is a big invitation inside the video,
   "Play today's <game> free" with **herdgamesonline.com** large enough to
   remember and type (links in Shorts and Reels aren't clickable, so the address
   on screen is how they find us; nothing says a site name costs reach). Then
   the last frame rewinds into the first so the replay is seamless. The same
   address goes in the caption, the Instagram bio link and the YouTube
   related-video link.
10. **One recurring face.** The cow hosts every video: thinking during the
    countdown, shocked or cheering at the reveal. A series people recognise.
11. **True and safe.** Every number from the data. No invented urgency. No
    "yesterday" about Top Answers counts (boards are sometimes reused). Nothing
    from the sensitive-word list without a deliberate pick.
12. **Readable without sound, and fill the frame.** At most 6 words a line,
    key lines 64 px or bigger. Everything to read sits in the safe area, about
    y 250-1600 and x 60-990 on 1080x1920 (the apps' top bar, right-hand buttons
    and bottom caption cover the rest; guides in 2026 agree on roughly a
    1000x1400 centred box). The frame is still used edge to edge: sky above, the
    herd on a hill below, decoration that can be covered without losing anything.
    (11 Nov 2026: the first renders kept everything above 1330 px and left the
    bottom third empty; Ajey spotted it.)
13. **Voice only if it earns its place.** Text, music and sound carry the
    videos. A voiced version is an explore test the weekly review judges, not a default.

## Before anyone sees it: the cold-viewer review

Every render, before it is shown to Ajey or posted. Take a frame every 1-2 s
(and the exact frames of each change) and, for each one, pretend you just
swiped in at that moment, with no sound:

- **Do I know what I'm watching?** The challenge that explains the video stays
  on screen the whole time; changing lines go in a slot below it, never in its place.
- **Does every line stand alone?** No "it", "this" or "that" pointing at
  something elsewhere on screen ("Can you guess the doodle", not "Can you guess it").
- **Does every number say who and when?** "28 of 344 players had it by line 1",
  never a bare "28 of 344 got it".
- **Is anything said twice?** Two lines carrying near-identical numbers is
  noise: make one element tell it (the meter shrinks to the line-1 share
  instead of a second stat line).
- **Is the moment the challenge turns on marked?** (Line 3 in "before line 3":
  its badge turns pink.)
- **Is every line on long enough to read?** About 0.3 s a word plus 0.5 s.
- **Is the whole frame used?** Readable things in the safe area, the world
  (sky, hill, herd) filling the rest.
- **Does any small art read as something else at phone size?** (Seven tiny
  sheep read as beetles: five bigger ones read as sheep.)
- **The thumbnail (frame 0) alone:** would a stranger stop for it?

Fix everything found, re-render, review again. Only then show it.

## The shape of a Herd Short (about 15 s)

| Time | Beat | What happens |
| --- | --- | --- |
| 0-1.5 s | Hook | the challenge in big type, the puzzle already on screen, the music already going |
| 1.5-6 s | Your turn | clues build or the countdown runs 3-2-1 with ticks; the cow thinks |
| 6-9 s | The herd | what thousands said, building the tension (sheep piling up, chips, the needle) |
| 9-11 s | Reveal | drumroll, the answer slams in, punch-in, impact, the music drops |
| 11-14 s | The sting | "Only N of M got it", then the comment line |
| 14-15 s | Loop | the address in the lower band; the last frame leans back toward the first |

## Each format, as a game the viewer plays

- **A, Guess the number (Daily Guesstimate):** "How tall is Uluru?" with a
  countdown, then the herd's guesses drop as sheep, "most said 480", the
  answer's flag slams down. Sting: "only 6 of 119 got close".
- **B, Name the #1 answer (Top Answers):** a game-show board, countdown, the
  tiles flip with dings from #8 up, #1 last with the crowd.
- **C, Pick a side in 3 seconds (Hot Takes):** the take, a fast countdown,
  the needle swings, the split lands. Comment bait by nature.
- **D, Guess the drawing (Guess the Doodle):** "Guess it before line 3": the
  doodle draws a line at a time with a beat between lines, and how many of the
  herd had it by that line. Reveal with a ding.
- **E, Solve one rung (Word Climb):** one rung as a Wordle-style puzzle with
  coloured hints, countdown, reveal, then "only 35 of 206 climbed all 7".
- **F, Hot or cold (Secret Word):** the herd's guesses go from cold to hot as
  clues; "What's the word?" countdown; reveal.
- **G, Find 5 words (Words from a Word):** the big word, a 10-second timer, then
  the herd's top finds. "Comment how many you got."

## Sources (read 11 Nov 2026; mostly practitioner and vendor guides, so treat numbers as rough, and trust our own ledger over them)

- Hooks and the first seconds: [dev.to hook engineering](https://dev.to/bulkdl/hook-engineering-the-science-of-the-first-3-seconds-in-short-form-video-2026-2jp9), [Opus hook formulas](https://www.opus.pro/blog/youtube-shorts-hook-formulas), [Joyspace 3-second rule](https://joyspace.ai/the-3-second-rule-science-stopping-scroll), [aibrify retention curve](https://aibrify.com/blog/youtube-shorts-retention-curve-playbook)
- Viewed vs swiped away, loops, replays: [vidIQ](https://vidiq.com/blog/post/get-more-views-youtube-shorts/), [vidIQ on loops](https://vidiq.com/blog/post/double-youtube-watch-time-looping-shorts), [Shortimize](https://www.shortimize.com/blog/how-does-youtube-shorts-algorithm-work), [Creator Essentials: engaged views](https://www.creatoressentials.com/glossary/shorts-engaged-views/)
- Reels signals (watch time, DM sends, audio): [Stack Influence](https://stackinfluence.com/blog/how-does-the-algorithm-for-reels-work), [Later](https://later.com/blog/instagram-reels-algorithm/), [Metricool](https://metricool.com/instagram-reels-guide/)
- Quiz and trivia formats, timers: [Typito: why timers work](https://typito.com/blog/why-timers-in-trivia-videos-work-and-how-to-use-them-well/), [Typito: riddle formats](https://typito.com/blog/riddle-trivia-questions-puzzle-style-quizzes-that-keep-people-watching/), [Typito: trivia formats](https://typito.com/blog/trivia-video-ideas-formats/), [Clippie quiz ideas](https://clippie.ai/blog/quiz-trivia-video-ideas-faceless)
- Sound off and captions: [Bytecap on silent viewing](https://www.bytecap.io/blog/science-of-silent-viewing-short-form-video-retention), [PostEverywhere sound on vs off](https://posteverywhere.ai/social-media-terms/sound-on-vs-sound-off), [Kapwing subtitle statistics](https://kapwing.com/resources/subtitle-statistics)
- Open loops and pattern breaks: [LiveCounts on MrBeast pacing](https://livecounts.io/blog/youtube/how-mrbeast-uses-pattern-interrupts-every-4-seconds), [Socialync open loops](https://www.socialync.io/blog/open-loops-in-content-2026), [GoFaceless pattern breaks](https://www.gofaceless.ai/en/blog/optimize-video-engagement-pattern-breaks)
- Voice vs text in faceless Shorts: [EasyViral, 500 faceless Shorts](https://easyviral.ai/blog/we-analyzed-500-viral-faceless-shorts), [Virvid voices](https://virvid.ai/blog/elevenlabs-vs-built-in-ai-voices-youtube-2026)
