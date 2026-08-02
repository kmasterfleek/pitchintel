# Terra Incognita — Tier-0 scouting doctrine for pre-pathway talent

> The best player in the world right now might be fourteen, playing left wing
> in her brother's Sunday game under a nickname, and she hasn't told her
> parents she loves football. No scouting system on earth can find her.
> This document is about how ours could.

## The thesis

Every scouting system — Wyscout, TransferRoom, WAFCON watch desks, even our
own frontier corpus — starts where football is *organized*: a club, a league,
a tournament, a registration form. Women's football misses much of its best
talent because the talent starts earlier and elsewhere: villages, suburban
corners, cages, boys' games. For girls there is often no pathway at all, and
sometimes active reasons to hide (family, culture, fear). By the time a
player enters anything scannable, selection has already happened — and it
selected for *circumstance*, not talent.

The proof is that the current generation of stars from the deserts are all
survivors of exactly this filter: Marta playing barefoot with the boys in
Dois Riachos; the Chawinga sisters coming up through boys' football in
Malawi against family and social resistance; Banda, Dumornay, Martínez —
found at tournaments by luck and one attentive adult. The pattern isn't
"talent emerges." The pattern is "one in a thousand gets the lucky
collision." Terra Incognita is the project of industrializing that luck.

## The core inversion: scout the ripple, not the player

A pre-pathway girl has no digital footprint. **But outlier performance
cannot stay invisible locally.** A girl repeatedly cooking the boys produces
detectable disturbances in her community's social fabric:

- boys complain, parents of beaten teams grumble, referees write things down
- the neighborhood mints her a nickname
- someone's cousin films fifteen seconds of it
- a league bans her, a school debates her, a federation grants an exemption
- a local paper runs 200 words on her
- the diaspora brags about her in another country's group chat

She is unsearchable. **Her ripples are not.** The unit of discovery is not a
player profile — it is a *ripple cluster*: independent traces that
triangulate to one unnamed girl in one place.

## The Ripple Taxonomy — what the deep-search agents hunt

**1. Bureaucratic ripples.** "Girl banned from boys' league for being too
good" is a recurring global news genre. Bans, eligibility disputes,
exemption requests, school-board minutes — bureaucracy converts folklore
into paper, and paper digitizes. A ban is a *certificate of dominance*
issued by the girl's own opponents.

**2. Salt ripples.** Defeated boys' teams talk. Complaint threads, comment
salt, "we lost to a team with a girl" forum posts, referee incident reports.
Losers generate more text than winners — search the losers.

**3. Bystander ripples.** Not parent showcase accounts — *accidental*
virality: clips shot by onlookers, captioned with laughing emojis,
WhatsApp-forwarded until one copy escapes to TikTok. The comments are the
index ("who IS she??", "someone sign her", "that's [nickname] from
[place]"); the video is the payload. Comment archaeology is a discipline —
music A&R has mined it since SoundCloud.

**4. Naming ripples.** Communities name their legends: "Messi wa ___," "la
pulga de ___," "the girl who plays with the boys at ___." Multilingual
pattern sweeps — the "(girl) + (beats/plays with) + (boys)" idiom family in
40+ languages — across social platforms, local forums, and news archives.
The nickname is often the *only* stable identifier a pre-pathway player has.

**5. Paper ripples.** Micro human-interest stories in tiny regional papers,
school newsletters, church bulletins, community radio websites. These
digitize erratically and in local languages — invisible to keyword tourists,
fully sweepable by language-native research agents (Mode A pointed at
regional archives).

**6. Network ripples.** In much of the world the rural internet is
Facebook: PE teachers posting congratulations, village coaches tagging
tournament photos, youth pastors and imams mentioning the football girl,
diaspora cousins bragging from abroad. These are named adults with public
profiles — each one is a *contactable verification node*, not just a signal.

**7. Bracket ripples.** Informal tournaments post handwritten brackets and
scoresheets as photos on Facebook and WhatsApp statuses. OCR the photos;
flag female names inside boys' brackets; flag the anomaly, find the
tournament, find the girl.

**8. Airwave ripples.** Local radio call-in shows — increasingly streamed
and archived — where communities talk about their own. The lore layer of
places the internet barely reaches.

## The Cartography layer — an actual age of exploration

Run it literally like exploration: the world map starts covered in fog.

**The Atlas.** Satellite imagery can find informal football grounds — worn
dust patches with goalpost shadows, cages, cleared lots. Overlay three
layers: (a) informal-pitch density, (b) population of girls 10–17, (c)
*absence* of any registered girls' club or pathway. High pitch density +
many girls + zero pathway = **terra incognita**: statistically, talent is
there and nothing exists to catch it. Ripple activity lights regions up.

**Lead triangulation and decay.** One rumor is folklore. Two independent
attestations (a nickname sweep hit + a bystander clip from the same town) is
a lead. Three, with a contactable network node, is *expedition-grade*. Leads
decay with time — girls age out, move, quit — which forces prioritization
the way a real exploration budget does.

**Expedition briefs.** The software's output for a lead cluster is a *voyage
plan*: fly here, these three weekend street tournaments, this PE teacher and
this radio host as verification nodes, these pitch coordinates from the
Atlas, this local women's organization as partner, this is what to verify,
this is the safeguarding protocol. An intern with a brief like this does
what today requires a 40-year veteran's network. (This is the same "monster
gains for people without bandwidth" argument as the enterprise product — one
level deeper.)

## The Attraction layer — flip the telescope

The hardest case defeats all search: the girl actively hiding her football
from her family produces almost no ripples. You cannot find her. **She has
to find you — through channels she controls and trusts:**

- **Anonymous clip intake.** Submit a touch-and-skills clip with face
  blurred by default, judged on ball data, no public leaderboard, identity
  never displayed. "Show the touch, not the face."
- **Skill challenges native to TikTok** — first-touch chains, weak-foot
  challenges, wall-pass patterns — designed so participation looks like
  joining a trend, not declaring a football ambition to your whole family.
- **A female scout network** as the human interface: verification and first
  contact always through trusted local women (teachers, former players,
  women's-org staff), never a strange man with a business card.
- **Honeypot infrastructure.** Where the Atlas shows talent density with no
  pathway, sponsor the infrastructure that creates observation windows:
  mini-pitches, futsal cages, open-play days, pop-up trials (the Nike "The
  Chance" open-trial model; the Cruyff Court model; Right to Dream's
  dust-pitch scouting in Ghana). Every cage built where the fog is thickest
  is both a gift to the community and a sensor.

## Tier 0 in the engine

The valuation engine already runs on graceful degradation — this extends the
ladder *below* the waterline. A **Tier-0 LoreVector** carries provenance
dimensions, not performance dimensions:

- `independentAttestations` — distinct, unconnected sources
- `sourceDiversity` — how many ripple types (a ban + a clip + a nickname
  beats three clips)
- `specificity` — nameable place, age band, position, foot
- `recency` / decay
- `contextQuality` — the level of the boys she's dominating
- `verificationNodes` — contactable adults who can confirm
- `clipEvidence` — seconds of footage, and what it actually shows

Confidence starts at 2% (single unverified rumor) and the existing ROI
ladder gets a basement: **lore (2%) → triangulated lore + clip (8%) →
expedition verification (~15%) → trial/video session (34%) → Tier-3 report
(61%) → pathway data (→100%)**. Same engine, same honesty discipline, same
"missing dimensions are the task list" loop — the task list just now begins
with *"send someone to watch a Sunday game in this town."*

Corpus rules apply unchanged: dated dossiers, no claim without a source,
supersede-don't-edit. A legend is a dossier like any other — it just cites a
TikTok comment thread and a radio show instead of FBRef.

## Safeguarding is the architecture, not a compliance section

The user we must never harm is the girl who hasn't told her family. Design
consequences, non-negotiable:

1. **Regions, not names.** The Atlas and any shared artifact shows lead
   *density by area*. Identities of minors live in a separated, protected
   store with access on expedition-need only.
2. **Anonymous by default.** Intake channels never require identity to
   assess talent; identity is offered by the player, later, on her timeline.
3. **First contact through local women.** Always. Family engagement is led
   by local women's organizations at the girl's pace — discovery must never
   function as *outing*.
4. **Anti-buscón by construction.** The Dominican baseball buscón network
   proves informal scouting scales — and exactly how it curdles into
   exploitation. No contracts with minors, no ownership stakes, no
   percentage arrangements. Revenue comes from clubs paying for
   intelligence and from placement partnerships, never from the girl.
5. **Trust is the distribution strategy.** These channels run on community
   trust; the first time the system outs or burns a girl, the channel dies
   in every village that hears about it — and villages talk (that's the
   whole thesis).

## Precedents to steal from (verify in a Mode-A sweep before citing publicly)

- **Dominican baseball buscones** — informal scouting at national scale; the
  model and the cautionary tale.
- **Music A&R post-SoundCloud** — industrialized bystander-virality mining;
  comment archaeology as standard practice.
- **Syndromic surveillance** (epidemiology) — detecting outbreaks from
  indirect signals (pharmacy sales, school absences) before any diagnosis
  exists: formally the same problem as detecting talent from ripples.
- **Right to Dream, Cruyff Courts, Nike "The Chance"** — honeypot
  infrastructure and open-trial precedents.
- **Online chess prodigy pipeline** — platform-native discovery preceding
  federation structures.
- **Our own Part A corpus** — Marta, the Chawingas, Banda, Dumornay: every
  origin story is a ripple cluster nobody was listening for.

## Why this compounds

Wyscout needs organized football. TransferRoom needs clubs. Soccerdonna
needs watchable leagues. Terra Incognita needs language-native deep
research, provenance discipline, and community trust — which is precisely
the Mode A/B machinery in `WOMENS-INTEL.md`, pointed below the waterline.
And the corpus compounds in a way search never does: folklore logged about a
13-year-old today is provenance, attribution, and relationship when she
surfaces in a qualifier at 19 — by which point every conventional scout is
seeing her for the first time.
