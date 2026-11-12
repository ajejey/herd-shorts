# Posting (12 Nov 2026)

Every render leaves three files on its release (`short-<id>`): the MP4, the
contact sheet, `<video>.meta.json` (title, description, question, tags) and
`<video>.youtube.txt` (the same, laid out for pasting).

Every link to the site carries a tag so the weekly review can see what each
channel brings (the backend counts arrivals: `/api/shorts/arrivals`):

- Instagram bio: `https://herdgamesonline.com/?utm_source=instagram&utm_medium=bio`
- YouTube channel links: `https://herdgamesonline.com/?utm_source=youtube&utm_medium=channel`

Typed visits (the address on screen) show up as direct arrivals on `/`.

## Instagram: automatic, through Meta's API

`pipeline/post-instagram.mjs` posts a Reel with the cover frame at 1.5 s. It
uploads the MP4's bytes straight to Meta (resumable upload), so no public
hosting is needed. That upload works on the Facebook Login path, which means
the Instagram account is linked to a Facebook Page.

One-time setup (Ajey does the account steps; Claude can walk the Meta app steps with him in Chrome):

1. Create the Instagram account in the Instagram app. Bio link as above.
2. Settings > Account type and tools > Switch to professional account > Business
   (Meta's publishing API is for professional accounts; Business is the safe choice).
3. Create a Facebook Page "Herd Games" and link the Instagram account to it
   (Page settings > Linked accounts > Instagram).
4. developers.facebook.com > Create app "Herd Shorts" (Business type), add the
   Instagram API (Facebook Login) use case. Development mode is enough: the app
   only posts to accounts its admin owns, so no app review.
5. Graph API Explorer, with the app selected: get a User token with
   `instagram_basic, instagram_content_publish, instagram_manage_insights,
   pages_show_list, pages_read_engagement, business_management`. Exchange it
   for a long-lived token, then `GET /me/accounts`: the Page's access_token from
   a long-lived user token does not expire. `GET /{page-id}?fields=instagram_business_account`
   gives the Instagram account id.
6. Store both (the value is prompted for, never echoed):

       gh secret set IG_USER_ID -R ajejey/herd-shorts
       gh secret set IG_ACCESS_TOKEN -R ajejey/herd-shorts

7. Check it without posting, in your own terminal (not through Claude, so the
   token stays out of the chat):

       $env:IG_USER_ID="…"; $env:IG_ACCESS_TOKEN="…"; node pipeline/post-instagram.mjs --whoami

8. Post one by hand (`node pipeline/post-instagram.mjs --id=<ledger id>`), look
   at it on the phone, then switch the daily post on:

       gh variable set AUTO_POST_INSTAGRAM -b on -R ajejey/herd-shorts

## YouTube: by hand until the API can post publicly

Videos uploaded through an API project that Google has not audited are locked
private, so the first weeks go up by hand from the release:

1. Upload the MP4 (YouTube app or Studio). A vertical video under 3 minutes is a Short.
2. Paste the title and description from `<video>.youtube.txt`; pin the question as the first comment.
3. Record it: `node pipeline/youtube-kit.mjs --id=<ledger id> --posted=<the Short's link>`

Phone verification is not needed to upload Shorts. It unlocks videos over
15 minutes, custom thumbnails and live streaming, none of which a 15-second
Short uses. Google allows two verified channels per phone number per year.

## The schedule (12 Nov 2026)

`strategy.json` sets `per_day` (2 to start) and `slots_utc` (08 Australian evening,
19 UK evening and US lunch, 01 next day US evening). The 06:40 UTC render makes the
day's videos, each a different format with its `post_at`; which slots a day uses and
which format gets which slot rotate, balanced by the ledger, so every format meets
every slot. "Post due Reels" runs hourly and posts whatever is due (on while the repo
variable `AUTO_POST_INSTAGRAM` is on; a video more than 20 hours late waits for a
person). A forced render has no `post_at`: post it with "Post to Instagram".
Trial Reels: Meta refuses them for this app today, so they are opt-in
(`INSTAGRAM_TRIAL=on`).
