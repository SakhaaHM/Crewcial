# Crewcial

**Crew health, checked by the crew.**

When Earth is 20 minutes away, Crewcial puts a physician's judgment on board.
A crew member enters a short daily check (blood pressure, heart rate,
temperature, sleep, mood, stress and symptoms) and runs two quick self-tests.
Crewcial compares the results with that person's own in-flight "normal", lights
up the body system that needs attention on an astronaut figure, says what to do
and who to tell, and prepares a private report for the flight surgeon.

## Why Crewcial, and not a more high-tech app

On a Mars mission, collecting health data is not the hard part. Knowing what a
reading means and what to do, when a reply from a doctor can take 40 minutes or
more, is. Crewcial is built for that moment.

1. **Every colour is explained.** Each status comes from one of 47 rules chosen
   and signed off by an aerospace-medicine physician, each from a published
   source (NEWS2, the 2025 AHA/ACC blood-pressure guideline, ADA 2026, the
   reaction test NASA uses) or labelled as her own value. "Why this colour?"
   shows the rule on screen. There is no black-box score.
2. **It catches what you can't feel.** A reaction test (the 3-minute PVT-B
   used in NASA's Reaction Self Test) and an Amsler grid for eye changes run
   inside the app. Crewcial compares how alert you feel with how you perform,
   and flags the blind spot: feeling as usual while testing slower than your
   own normal.
3. **It works with no signal.** It runs offline on any phone or laptop, with
   no cloud, account or wearable. What to do and who to tell change with where
   the crew is: space station, Moon or Mars.
4. **It is safe to trust.** A typing error asks for a re-check, not an alarm.
   Readings taken after exercise or caffeine are not judged. Missing data is
   never green. It never says go or no-go: the flight surgeon decides. Data
   stay on the device, and the astronaut approves every report.

| | A data dashboard or AI risk score | Crewcial |
|---|---|---|
| Where an alert comes from | A threshold or model score, often with no visible reason | A physician-signed rule, shown with its source |
| What it measures | Body signals | Body signals, two self-tests and how you feel |
| What it needs | Usually sensors, a server or a live link | Any phone or laptop, offline |
| When the doctor is far away | Shows the numbers | Says what to do now and who to tell |
| A typo or a reading after exercise | Can raise an alarm | Asks for a re-check |

Built by Team Crewcial for the NASA Space Apps Challenge 2026, challenge
"Create Health Monitoring Software for Astronauts on Space Missions".

> **Status: prototype (version 0.7.0, 15 November 2026).**
> Crewcial is a hackathon prototype for self-assessment training and research.
> It is **not a medical device**. It gives advice only and never replaces the
> crew medical officer or the flight surgeon.
> **All 47 rules are signed off by the team's physician.** Guidance texts,
> learn cards and checklists are still drafts under her review.

## Try it

1. Download this folder.
2. Open `index.html` in a browser (double-click it).

Nothing needs to be installed and no internet connection is needed. The app
opens with a **simulated** mission: Mars transit, mission day 74, four
fictional crew members. A banner says "Simulated data" on every screen.

## What it does

- **Daily check-in:** blood pressure, heart rate, temperature, sleep hours,
  mood, stress and a symptom check by body system. Oxygen level and blood sugar
  can be added when there is a reason. The design target is two minutes or
  less. This has not been timed with users yet.
- **Astronaut figure** on the home screen: each crew member is drawn as an
  astronaut in a spacesuit (in the demo, three women and one man). Eight body
  systems sit on the figure as a see-through layer. The ones in range stay
  faint; one that needs attention lights up in its status colour, and each
  opens its own page.
- **Personal baseline.** After a learning period, each reading is compared with
  the person's own usual range during this mission, not with a table made for
  people on Earth.
- **Six statuses**, always shown as a colour, an icon and a word: Act now,
  Watch, Re-check, No data, Learning your normal, In your range. Missing data
  is never shown as green.
- **Typing errors do not raise alarms.** An impossible value asks for a
  re-check instead.
- **Combined patterns** across indicators: fatigue (short sleep with slower
  reactions), possible infection, vision change, and the blind spot (see
  below).
- **Two built-in tests:** a reaction test modelled on the 3-minute PVT-B used
  in NASA's Reaction Self Test, and an Amsler grid for each eye.
- **How you feel versus how you perform.** Just before each reaction test the
  crew member rates how alert they feel, from 0 (tired) to 10 (alert). Both
  the rating and the test are compared with that person's own usual. Feeling
  as usual while testing slower than usual is the **blind spot** pattern. On
  Earth, people kept on 6 hours of sleep or less for 14 days were largely
  unaware of their growing deficits (Van Dongen et al. 2003). Whether
  astronauts show the same blind spot in flight has not been tested.
- **Trend charts** with the personal range drawn behind the line.
- **Spacewalk readiness summary.** It lists the open flags for the flight
  surgeon. It never says go or no-go. If the fatigue pattern or the blind spot
  shows on the day of a spacewalk or the day before, it is urgent, not an
  emergency: tell the crew medical officer today, the report is set to Urgent,
  and safety-critical tasks wait until the flight surgeon clears the person.
- **Private report** in four parts (situation, background, assessment,
  request). The crew member approves it before it is sent, and chooses the
  route: next private medical conference, urgent, or private psychological
  conference. In the Mars setting the report shows the signal delay.
- **Three settings:** space station, lunar base or rover, Mars transit or
  surface. The guidance changes with how fast the ground can answer.
- **Checklist for the crew medical officer**, who may not be a doctor.
- **"Why this colour?"** Every status shows the rule that produced it, the
  rule's source and whether a physician has signed it off.
- **Learn cards** answer five questions for each indicator: can it be measured
  in space, why check it, how spaceflight affects it, when it needs the crew or
  the flight surgeon, and what helps prevent a serious problem.

## What is real and what is a placeholder

| Part | State on 14 November 2026 |
|---|---|
| Screens, navigation, data storage, export and import | Built and tested |
| Rule engine (plausibility, limits, personal baseline, patterns) | Built and tested |
| Reaction test and Amsler grid procedures | Built from published descriptions and signed off |
| Clinical numbers (limits, band widths, schedules, red flags) | Signed off: each is either from a checked source or labelled as the physician's own value |
| Learn cards | All five questions answered for every indicator, each from a checked source or saying that no checked source covers it. Advice lines are marked "Draft" |
| Guidance texts and crew medical officer checklists | The steps for the fatigue pattern and the blind spot are reviewed by the physician and say so on screen. All other texts are **Draft**, labelled on screen, until her line-by-line review |
| Demo crew and all demo readings | **Fictional and simulated** by `js/demo.js` |
| Sending a report | **Simulated.** Nothing leaves the device |
| Camera input, usability study results | Not built / not done yet |

The Rules screen in the app lists every rule with its status. The command
`node tests/release-check.js` fails until every rule has a source or is marked
as the physician's own proposal, and is signed off.

## How a status is decided

1. **Is the value possible?** If not: Re-check. No alarm. On the dangerous
   side (for example SpO₂ under 50%) the card adds: if a repeat gives the same,
   or the device shows LO or HI, act now.
2. **Was it taken after exercise or caffeine?** Heart rate, blood pressure and
   temperature are then not judged: re-measure after 30 minutes with no
   exercise or caffeine, then 5 minutes' rest.
3. **Is it past an Act-now limit, or is a red-flag symptom reported?** If yes:
   Act now. This step does not wait for a baseline.
4. **Is it outside the person's own range?** The range is the middle value of
   the person's recent readings, plus or minus a band based on how much those
   readings usually vary. One unusual day asks for a re-check. A change that
   lasts becomes Watch.
5. **Do several small changes point the same way?** Then a combined pattern is
   shown.

The rules are data, not code: they live in `data/rules.js`, each with a status
(`published`, `proposed` or `placeholder`), its sources and a sign-off flag.

## Tests

Results of the last full run, 15 November 2026:

| Command | What it checks | Result |
|---|---|---|
| `node --test tests/engine.test.js tests/scenarios.test.js` | Every rule type, 23 written scenarios and the demo story | 89 of 89 pass |
| `node tests/e2e.js` | A real browser opens the app from disk and walks every screen on phone and laptop sizes, in light and dark | 222 of 222 pass |
| `node tests/hosted-check.js` | The app served as a web page under a strict content policy, and inside a locked-down frame with storage refused | 43 of 43 pass |
| `node tests/shadow.js` | The rules run over simulated crew-days with injected events | See below |
| `node tests/release-check.js` | Are all rules sourced and signed off? | Passes: all 47 rules are sourced or the physician's own, and signed |

The first, fourth and fifth commands need only Node.js (tested with version
22). The two browser tests also need Playwright and Chrome (`npm install --no-save
playwright`, and set the `CHROME` variable to the path of Chrome if it is not
`/usr/bin/google-chrome`).

**Shadow run (simulated data).** 20 simulated crew members
for 180 days, 3,320 crew-days evaluated, 60 injected events:

- 60 of 60 events were flagged, on average 0.65 days after they began.
- 5.9% of flagged days fell outside any event. The team's target is under 5%,
  so **this target is not met yet**.
- A Re-check prompt appeared on 4.3% of crew-days.

This run checks that the logic behaves as designed. The events and their sizes
come from our own generator, so the numbers say nothing about clinical
accuracy. The rule settings were not tuned to reach the targets. The simulated
crews in this run have no alertness ratings, so it does not exercise the
blind-spot pattern; the unit and scenario tests do.

## Changes in 0.7.0 (15 November 2026)

- New, signed by the physician on 15 November: when the fatigue pattern (P1) or
  the blind spot (P5) shows and a spacewalk is planned for today or tomorrow,
  it is urgent, not an emergency. The card stays Watch and adds "Urgent, not
  an emergency" and the reason ("A spacewalk is planned tomorrow"). The steps
  add "Hold safety-critical tasks, such as a spacewalk, until the flight
  surgeon clears you", "Who to tell" says to tell the crew medical officer
  today, and the report is pre-set to Urgent, so the flight surgeon can answer
  before the spacewalk. With no spacewalk near, both patterns stay on the
  weekly route as before. Both rules are now version 2; the count stays 47.
- The report's request line for any urgent finding now reads "Urgent, not an
  emergency. Requesting a reply from the flight surgeon within 24 hours."
  It used to ask for the weekly conference.
- The steps on the fatigue and blind-spot cards were read and approved by the
  physician. These two cards say "Steps reviewed by the team's physician";
  every other card keeps its Draft label.
- Tests: scenarios S22 and S23 (23 in all; 89 rule and scenario tests) and 6
  new browser checks (222 in all).

## Changes in 0.6.2 (15 November 2026)

- Learn answers all five questions again for every indicator. The 12 answers
  that 0.6.1 hid are written from the app's checked sources; where no checked
  source covers a question (blood sugar in flight, resting SpO₂ in flight), the
  answer says so. Advice lines ("What actions prevent a critical condition?")
  are marked "Draft" until the physician's review.
- Tests: a browser check that every indicator answers all five questions
  (216 in all); the data test again requires all five answers.

## Changes in 0.6.1 (15 November 2026)

- Learn no longer shows stand-in wording. The answers to "When does it need
  the crew or the flight surgeon?" now state the signed rules for blood
  pressure, heart rate, temperature, mood, blood sugar, SpO₂, the Amsler grid
  and symptoms, with their sources. Questions with no checked source yet are
  hidden instead of saying "to be written".
- Tests: a browser check opens every Learn page and fails on "to be written",
  "Phase 3" or "placeholder" (215 in all).

## Changes in 0.6.0 (15 November 2026)

- The astronaut figure is drawn to scale: about 7.5 heads tall, with the hip
  joints a little above half the height and the fingertips at mid-thigh. The
  torso, legs, arms and every organ were re-placed to match.
- Bones and muscles now shows the lumbar spine, the pelvis, both legs with the
  kneecap in front of the femur's two condyles, and the thigh and calf
  muscles. The hip and the lumbar spine lose the most bone in flight, and the
  thigh and calf lose the most muscle. The muscles show only when the system
  is lit, so the calm figure stays simple.
- The suit's shoulders are rebuilt: each arm hangs from a shoulder cap over
  the hard upper torso, with a shoulder bearing, in place of round caps.
- The code licence is Apache 2.0 (`LICENSE.txt`).
- Tests: 3 new browser checks (214 in all).

## Changes in 0.5.2 (14 November 2026)

- The README and the About screen now open with what sets Crewcial apart:
  physician-signed rules shown on screen, self-tests that catch what you can't
  feel, no signal needed, and privacy by default. The page description says
  the same. No rule, status or behaviour changed.

## Changes in 0.5.1 (14 November 2026)

- The body figure is now a realistic astronaut for each crew member: a white
  exploration-style spacesuit with a clear bubble helmet, and each person's own
  face and hair. In the demo Solara, Zahra and Sadeem are women and Shihab is a
  man. The figure changes when you pick another crew member.
- The flagged body system still lights up, now drawn as the organ itself:
  brain, eyes, heart, lungs, digestion (liver, stomach and intestines), immune
  (lymph nodes), bones and muscles (leg bones), and skin (a tint over the
  suit). Organs in range stay faint, and their anatomy lines show only when
  they light up.
- The suit, face and helmet ignore taps, so tapping an organ opens it through
  the helmet glass.
- Setup has a "Figure on Home" choice (Woman or Man) for crew members added by
  hand.
- The figure lives in its own file, `js/figure.js`. Statuses, colours and
  rules are unchanged.
- Tests: 10 new browser checks (210 in all).

## Changes in 0.5.0 (14 November 2026)

- The last three rules are signed off, so the release check passes. The
  physician chose a level that is urgent but not an emergency for them: the
  reading shows Watch with "Urgent, not an emergency", the report is set to
  Urgent, the steps say to tell the crew medical officer today, and
  safety-critical tasks wait until the flight surgeon clears them. A red-flag
  symptom with it still makes it Act now.
- **Temperature:** 39.1 °C or more is urgent, not an emergency. NEWS2 scores
  it 2, not a red 3.
- **Blood sugar,** checked only when something prompts it: in range 70–140
  mg/dL; 141–199 is measured again first; 200 or more is urgent (the ADA's
  diagnostic line and the 2024 consensus line for ketoacidosis); 54–69 shows
  Watch; below 54 means treat now with 15 g of fast-acting sugar, and it is
  urgent (ADA Level 2).
- Four sources added (46 in all): ADA Standards of Care 2026 section 2, ADA
  2025 section 16, the 2024 hyperglycaemic-crises consensus report, and a 2019
  study of glucose in healthy adults on continuous monitors.
- Tests: 3 new scenarios (21 in all) and 3 new browser checks.

## Changes in 0.4.0 (14 November 2026)

- The team's physician signed off 44 of the 47 rules. Each is now either
  from a checked source (NEWS2, the 2025 AHA/ACC blood-pressure guideline, the
  ADA's glucose levels, the PVT-B paper) or labelled as her own value.
- Act-now limits: systolic above 180 and a new diastolic limit above 120
  mmHg (2025 AHA/ACC "severe hypertension"), replacing 220.
- Readings marked after exercise or after caffeine are no longer judged by
  heart-rate, blood-pressure or temperature limits. The card asks for a
  re-measure after 30 minutes and 5 minutes' rest.
- The flight surgeon can set a person's own low heart-rate limit (never
  below 30 bpm) and low systolic limit in Setup.
- Every Act-now card set off by a reading starts with "Re-measure now".
- New red flags: new confusion, new numbness or weakness, and difficulty
  speaking.
- A new Amsler distortion shows Watch, and its report is set to Urgent.
- The blind spot now leads the home screen when it shows with the fatigue
  pattern.
- Pattern P4 (strain or illness) is switched off: its only citation is
  unchecked, and it overlaps P1 and P2.
- Setup can start a new mission phase, which restarts "Learning your normal".
- The demo crew are Solara, Shihab, Zahra and Sadeem.
- Blood sugar and SpO₂ say when to add them. The mood sliders are described
  as visual analogue scales, not a validated clinical scale.
- The "AI-generated illustration" label now sits inside the body figure.
- 11 sources added (42 in all). 7 new scenario and unit tests, 8 new browser
  checks.

## Changes in 0.3.1 (14 November 2026)

- The demo flight engineer is now called Zahra, a name the participant chose.
  The other three demo crew keep their names until the participant picks
  theirs. The roles and the demo story are unchanged, and the crew stays
  fictional.

## Changes in 0.3.0 (14 November 2026)

- Far fewer words on screen. Each result card now shows its status, its
  number, one line and the next step. The rest (all steps, who to tell, why
  it matters in space, the rule behind the colour and the sources) is one
  "Details" tap away. Nothing was deleted.
- Act-now cards are the exception: every step and who to tell stay in view.
- Sources no longer sit in the middle of the text. Each block shows one small
  "sources" line that opens the list. The Rules and sources screen still
  writes every source out in full.
- Rows that are in range keep their reason under "Why this colour?".
- The Learn questions, the reaction-test instructions and the Amsler
  background fold away. The body-system pages list the NASA risk names, with
  the full text behind a tap.
- Visible words on a phone: Today's results 723 to 366, a body-system page
  574 to 266, the reaction test 308 to 117, a Learn page 339 to 55.
- Fixed: one Act-now item now reads "1 item needs action now". The About
  screen shows the app version, not the rules version.
- Six new browser checks for the new layout; two checks were updated for the
  new markup.

## Changes in 0.2.1 (14 November 2026)

- A calmer look, chosen by the team: "calm daylight" in light mode and "night
  cabin" in dark mode. The app follows the phone's setting unless Setup picks
  light or dark.
- The status colours keep their meaning: red for Act now, yellow for Watch and
  blue for Learning your normal, as NASA-STD-3001 Vol. 2, Appendix F asks for
  warning, caution and advisory alerts. Every status still shows a colour, an
  icon and a word.
- Only Act now fills a tile or the headline with solid colour. Watch is now a
  soft amber tint with an amber icon, so the loudest look is kept for the most
  urgent status.
- Warmer neutrals, rounded cards and buttons, and one plain typeface for text.
  The embedded condensed typeface is used for the wordmark only.
- Styles only: no rule, text or behaviour changed.

## Changes in 0.2.0 (14 November 2026)

- New: the alertness rating before each reaction test, the comparison of how
  you feel with how you perform (rule B-ALERT) and the blind-spot pattern (P5).
  Both are placeholders until the team's physician signs them off.
- The demo flight engineer now shows the blind spot the day before her
  spacewalk: she rates herself 8 of 10, as usual, while her test is 18% slower.
- The Mars text now says a reply "can take 40 minutes or more". 20 minutes is
  NASA's maximum one-way delay, so "at least 40 minutes" was not right.
- The reaction-test learn card no longer says NASA's test compares each
  astronaut with their own range; the NASA source says "optimal ranges".
- Flags of equal severity now keep the order in which the rules run.

## Project layout

```
index.html          the page
css/app.css         styles (light and dark)
css/fonts.css       the wordmark typeface, embedded
data/rules.js       all rules, with status, sources and sign-off
data/sources.js     the list of sources
data/content.js     texts: body systems, symptoms, guidance, learn cards
js/engine.js        the rule engine (pure functions, shared with the tests)
js/demo.js          generator for the simulated mission
js/storage.js       saving on the device, export and import
js/charts.js        trend charts
js/reaction.js      reaction test
js/amsler.js        Amsler grid
js/figure.js        the astronaut figure on the home screen
js/app.js           screens and navigation
tests/              the five checks listed above
licenses/           licence of the embedded typeface
LICENSE.txt         the code licence (Apache 2.0)
```

There is no build step and no outside library. Everything is plain HTML, CSS
and JavaScript.

## Privacy

- All data stays in the browser on the device. Nothing is sent anywhere.
- There are no accounts, no tracking and no outside requests.
- Export is a text or a file that the user saves by hand.
- The demo crew are invented. No real person's data is in this project.

## How AI was used

Space Apps asks teams to say how AI tools were used.

- The code, the demo-data generator and the body figure were generated with AI
  assistance (Claude, by Anthropic) and then tested. Each file says so in its
  first lines.
- The demo video's visuals and background music were generated with AI, and
  the video carries an "AI-generated visuals" watermark. The voice is the
  team's own.
- Claude also summarised some sources, drafted this README and drafted the
  app's texts from the values the physician entered. She edited them and made
  the final choices.
- Clinical rules, thresholds and guidance are chosen and signed off by the
  team's aerospace-medicine physician. All 47 rules are signed; texts still in
  review are marked as drafts.

## Who made it

Dr. Sakhaa Almadani, aerospace medicine physician, Team Crewcial. Crewcial is
its own concept. Her earlier work, an MSc dissertation at King's College London
(2025), covered physiological monitoring in spacesuits and other spaceflight
and analogue settings.

## Sources and licences

- **Sources.** `data/sources.js` lists 46 sources, and the app shows them on
  the Rules screen and under each learn card. They include NASA Human Research
  Program pages (hazards, risks, ongoing research), NASA-STD-3001 Volume 1,
  NASA's Reaction Self Test, published papers, and pages from the Canadian
  Space Agency and JAXA.
- **Typeface.** Barlow Semi Condensed, Copyright 2017 The Barlow Project
  Authors, SIL Open Font License 1.1. The licence text is in
  `licenses/Barlow-OFL-1.1.txt`.
- **Code licence.** Apache License 2.0; the full text is in `LICENSE.txt`. The
  typeface keeps its own licence.

Crewcial is a challenge entry. It is not affiliated with or endorsed by NASA
or any space agency. It uses no NASA logos or mission emblems.
