/*! Crewcial - words shown in the app: body regions, indicators, symptoms,
 * guidance and learning cards.
 * AI-assistance disclosure: this file was generated with Claude (Anthropic) for
 * Team Crewcial, NASA Space Apps Challenge 2026. Every text here is a DRAFT until
 * the team's physician reviews it. Statements about spaceflight carry source ids
 * from data/sources.js. Where no checked source exists yet, the card says so.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Crewcial = root.Crewcial || {}; root.Crewcial.Content = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TBD = 'To be written and sourced in Phase 3 (scientific design).';
  var MED = 'Take medication only as directed by the flight surgeon or the on-board medical protocol.';

  return {
    app: {
      name: 'Crewcial',
      tagline: 'Crew health, checked by the crew.',
      positioning: 'When Earth is 20 minutes away, Crewcial puts a physician\'s judgment on board.',
      /* What sets it apart, shown first on About. {n} is the live rule count. */
      apart: [
        ['Every colour explained', '{n} rules signed off by an aerospace-medicine physician, each one readable on screen.'],
        ['Catches what you can\'t feel', 'built-in reaction and Amsler tests, and the blind spot when you feel fine but test slower than your normal.'],
        ['Works with no signal', 'offline on any phone or laptop, with no cloud or wearable.'],
        ['Private by default', 'nothing leaves the device without your approval.']
      ],
      team: 'Dr. Sakhaa Almadani, aerospace medicine physician · Team Crewcial',
      challenge: 'NASA Space Apps Challenge 2026: Create Health Monitoring Software for Astronauts on Space Missions',
      intendedUse: 'Crewcial is a hackathon prototype for astronaut self-assessment training and research. It is not a medical device. It gives advice only and never replaces the crew medical officer or the flight surgeon.',
      lineage: 'Crewcial is its own concept. Its author\'s earlier work, an MSc dissertation at King\'s College London (2025), covered physiological monitoring in spacesuits and other spaceflight and analogue settings.',
      siDisclosure: [
        'The code, the demo-data generator and the body figure were generated with AI assistance and then tested.',
        'Clinical rules, thresholds and guidance are chosen and signed off by the team\'s aerospace-medicine physician. Any rule still awaiting her sign-off is marked as a placeholder.',
        'In demo mode, every crew member and every health reading is fictional and simulated.'
      ],
      medication: MED
    },

    hazards: [
      { id: 'radiation', name: 'Space radiation', sourceIds: ['nasa-hrp-hazards'] },
      { id: 'isolation', name: 'Isolation and confinement', sourceIds: ['nasa-hrp-hazards'] },
      { id: 'distance', name: 'Distance from Earth', sourceIds: ['nasa-hrp-hazards', 'nasa-hrp-distance'] },
      { id: 'gravity', name: 'Gravity fields', sourceIds: ['nasa-hrp-hazards'] },
      { id: 'environment', name: 'Hostile/closed environments', sourceIds: ['nasa-hrp-hazards'] }
    ],

    /* Body regions shown on the home figure. */
    regions: [
      { id: 'brain', name: 'Brain, mood and sleep', short: 'Brain and sleep',
        does: 'Controls attention, mood, sleep and balance.',
        hazards: [
          { text: 'Isolation, radiation and distance from Earth may affect crew mental health.', risk: 'Behavioral conditions and psychiatric disorders', sourceIds: ['nasa-hrp-risks'] },
          { text: 'Chronic sleep loss, workload and disrupted body clocks make other hazards worse.', risk: 'Inadequate sleep and irregular schedules', sourceIds: ['nasa-hrp-risks'] },
          { text: 'Gravity changes can cause motion sickness, dizziness and coordination problems.', risk: 'Altered sensorimotor and vestibular function', sourceIds: ['nasa-hrp-risks'] }
        ],
        items: ['sleep', 'mood', 'rt'] },
      { id: 'eyes', name: 'Eyes', short: 'Eyes',
        does: 'Turn light into vision. Sharp central vision is needed to read displays and procedures.',
        hazards: [
          { text: 'The structure of the eye and brain can change in flight.', risk: 'Spaceflight associated neuro-ocular syndrome (SANS)', sourceIds: ['nasa-hrp-risks'] }
        ],
        items: ['amsler'] },
      { id: 'heart', name: 'Heart and vessels', short: 'Heart',
        does: 'Pump blood and keep blood pressure steady.',
        hazards: [
          { text: 'Weightlessness changes circulation and the way the heart and blood vessels work.', risk: 'Cardiovascular adaptations', sourceIds: ['nasa-hrp-risks'] }
        ],
        items: ['bp', 'hr'] },
      { id: 'lungs', name: 'Lungs and oxygen', short: 'Lungs',
        does: 'Bring oxygen into the blood and remove carbon dioxide.',
        hazards: [
          { text: 'Steps taken to avoid decompression sickness on spacewalks may raise the risk of mildly low tissue oxygen.', risk: 'Hypoxia', sourceIds: ['nasa-hrp-risks'] },
          { text: 'A spacecraft is a closed home whose internal environment, including its pressure, has to be kept safe.', risk: 'Hostile/closed environments (hazard)', sourceIds: ['nasa-hrp-hazards'] }
        ],
        items: ['spo2'] },
      { id: 'metabolic', name: 'Digestion and blood sugar', short: 'Digestion',
        does: 'Turns food into energy and keeps blood sugar steady.',
        hazards: [
          { text: 'Crews on deep-space missions need balanced, appealing, long-lasting meals.', risk: 'Inadequate food and nutrition', sourceIds: ['nasa-hrp-risks'] }
        ],
        items: ['glucose'] },
      { id: 'immune', name: 'Immune system and temperature', short: 'Immune',
        does: 'Fights infection. Body temperature is one of its signals.',
        hazards: [
          { text: 'The stress of spaceflight may wake dormant viruses.', risk: 'Altered immune system responses', sourceIds: ['nasa-hrp-risks'] },
          { text: 'The microbes on the skin and in the gut may change in space.', risk: 'Host-microorganism interactions', sourceIds: ['nasa-hrp-risks'] }
        ],
        items: ['temp'] },
      { id: 'msk', name: 'Bones and muscles', short: 'Bones and muscles',
        does: 'Carry load and make movement possible.',
        hazards: [
          { text: 'Bone loss in microgravity raises the risk of fractures.', risk: 'Spaceflight-induced bone changes', sourceIds: ['nasa-hrp-risks'] },
          { text: 'Exercise counteracts losses in bone, muscle and heart fitness.', risk: 'Reduced cardiorespiratory and musculoskeletal fitness', sourceIds: ['nasa-hrp-risks'] }
        ],
        items: [] },
      { id: 'skin', name: 'Skin', short: 'Skin',
        does: 'The body\'s outer barrier.',
        hazards: [
          { text: 'Skin abrasion and skin rash are among the most likely in-flight conditions in the sample output of a NASA medical model.', risk: 'NASA-STD-3001 Appendix E, Table E.2-1', sourceIds: ['nasa-3001-appe'] }
        ],
        items: [] }
    ],

    /* Starting symptom list. Names follow the most likely conditions in NASA's
       sample Integrated Medical Model output (source: nasa-3001-appe), plus three
       stand-in red-flag examples (no source yet; open decision D4). */
    symptoms: [
      { id: 'insomnia',         label: 'Trouble sleeping',                     region: 'brain',     sourceIds: ['nasa-3001-appe'] },
      { id: 'headache',         label: 'Headache',                             region: 'brain',     sourceIds: ['nasa-3001-appe'] },
      { id: 'motion_sickness',  label: 'Space motion sickness',                region: 'brain',     sourceIds: ['nasa-3001-appe'] },
      { id: 'confusion',        label: 'New confusion',                        region: 'brain',     sourceIds: ['rcp-news2-guidance'] },
      { id: 'weakness',         label: 'New numbness or weakness',             region: 'brain',     sourceIds: ['aha-bp-readings'] },
      { id: 'speech',           label: 'Difficulty speaking',                  region: 'brain',     sourceIds: ['aha-bp-readings'] },
      { id: 'eye_abrasion',     label: 'Scratched or irritated eye',           region: 'eyes',      sourceIds: ['nasa-3001-appe'] },
      { id: 'vision_change',    label: 'New change in vision',                 region: 'eyes',      sourceIds: [] },
      { id: 'chest_pain',       label: 'Chest pain',                           region: 'heart',     sourceIds: [] },
      { id: 'fainting',         label: 'Fainting or near-fainting',            region: 'heart',     sourceIds: [] },
      { id: 'nasal_congestion', label: 'Blocked nose',                         region: 'lungs',     sourceIds: ['nasa-3001-appe'] },
      { id: 'resp_infection',   label: 'Cough, sore throat or cold symptoms',  region: 'lungs',     sourceIds: ['nasa-3001-appe'] },
      { id: 'diarrhea',         label: 'Diarrhea',                             region: 'metabolic', sourceIds: ['nasa-3001-appe'] },
      { id: 'constipation',     label: 'Constipation',                         region: 'metabolic', sourceIds: ['nasa-3001-appe'] },
      { id: 'allergic',         label: 'Allergic reaction',                    region: 'immune',    sourceIds: ['nasa-3001-appe'] },
      { id: 'back_pain',        label: 'Back pain or back injury',             region: 'msk',       sourceIds: ['nasa-3001-appe'] },
      { id: 'sprain',           label: 'Joint sprain or strain',               region: 'msk',       sourceIds: ['nasa-3001-appe'] },
      { id: 'skin_abrasion',    label: 'Skin abrasion',                        region: 'skin',      sourceIds: ['nasa-3001-appe'] },
      { id: 'skin_rash',        label: 'Skin rash',                            region: 'skin',      sourceIds: ['nasa-3001-appe'] }
    ],

    /* Indicators. "parts" are the stored reading keys. */
    indicators: [
      { id: 'bp', label: 'Blood pressure', unit: 'mmHg', schedule: 'daily', region: 'heart',
        parts: [
          { key: 'bp_sys', label: 'Upper number (systolic)', min: 50, max: 260, step: 1, start: 110 },
          { key: 'bp_dia', label: 'Lower number (diastolic)', min: 30, max: 160, step: 1, start: 70 }
        ],
        howTo: 'Rest for 5 minutes. Use the same cuff and the same arm each day. Enter both numbers.',
        learn: {
          q1: { text: 'Yes. A 24-hour blood pressure recorder has been worn on the ISS, and the Canadian Space Agency\'s Bio-Monitor shirt measures blood pressure there.', sourceIds: ['norsk-2015', 'csa-biomonitor'] },
          q2: { text: 'Weightlessness changes circulation and the way the heart and blood vessels work.', sourceIds: ['nasa-hrp-risks'] },
          q3: { text: 'On 3 to 6-month ISS flights, 24-hour blood pressure ran 8 to 10 mmHg lower than before flight. An Earth "normal" can therefore mislead, so Crewcial compares each reading with your own in-flight range.', sourceIds: ['norsk-2015'] },
          q4: { text: 'A sustained change from your own range shows as Watch and goes into your next private medical conference report. A reading beyond an absolute limit shows as Act now. The limits themselves are placeholders until Phase 3.', sourceIds: [] },
          q5: { text: 'Exercise counteracts losses in heart and blood-vessel fitness. Specific steps: ' + TBD, sourceIds: ['nasa-hrp-risks'] }
        } },
      { id: 'hr', label: 'Resting heart rate', unit: 'bpm', schedule: 'daily', region: 'heart',
        parts: [ { key: 'hr', label: 'Beats per minute', min: 25, max: 230, step: 1, start: 60 } ],
        howTo: 'Measure after 5 minutes of rest, before exercise and before caffeine.',
        learn: {
          q1: { text: 'Yes. The Canadian Space Agency\'s Bio-Monitor shirt records pulse and the heart\'s electrical activity on the ISS.', sourceIds: ['csa-biomonitor'] },
          q2: { text: 'Weightlessness changes circulation and the way the heart and blood vessels work. Resting heart rate is a simple daily check on the heart.', sourceIds: ['nasa-hrp-risks'] },
          q3: { text: 'In the ISS study that found lower blood pressure, 24-hour heart rate did not change. Crewcial compares your heart rate with your own in-flight range.', sourceIds: ['norsk-2015'] },
          q4: { text: 'A sustained change from your own range shows as Watch. A reading beyond an absolute limit shows as Act now. The limits are placeholders until Phase 3.', sourceIds: [] },
          q5: { text: TBD, sourceIds: [] }
        } },
      { id: 'temp', label: 'Body temperature', unit: '°C', schedule: 'daily', region: 'immune',
        parts: [ { key: 'temp', label: 'Degrees Celsius', min: 33, max: 43, step: 0.1, start: 36.8 } ],
        howTo: 'Use the same thermometer and the same site each day, before exercise.',
        learn: {
          q1: { text: 'Yes. Core body temperature has been measured in astronauts at rest and during exercise on the ISS, and the Bio-Monitor shirt records skin temperature.', sourceIds: ['stahn-2017', 'csa-biomonitor'] },
          q2: { text: 'The stress of spaceflight may wake dormant viruses. Body temperature is one of the body\'s signals of infection.', sourceIds: ['nasa-hrp-risks'] },
          q3: { text: 'On long ISS flights, resting core temperature rose by about 1 °C over roughly 2.5 months, and it climbed higher and faster during exercise than on Earth. Earth fever limits may therefore mislead, so Crewcial compares with your own in-flight range.', sourceIds: ['stahn-2017'] },
          q4: { text: 'A sustained rise from your own range shows as Watch. Together with a raised heart rate it shows the possible-infection pattern. The limits are placeholders until Phase 3.', sourceIds: [] },
          q5: { text: TBD, sourceIds: [] }
        } },
      { id: 'sleep', label: 'Sleep', unit: 'h', schedule: 'daily', region: 'brain',
        parts: [ { key: 'sleep', label: 'Hours slept last night', min: 0, max: 16, step: 0.25, start: 7 } ],
        howTo: 'Enter the hours you actually slept, not the hours in your sleep station.',
        learn: {
          q1: { text: 'Yes. NASA studies track sleep with a wrist sensor and with sleep reports.', sourceIds: ['nasa-standard-measures', 'nasa-archer'] },
          q2: { text: 'Chronic sleep loss, workload and disrupted body clocks make other hazards worse.', sourceIds: ['nasa-hrp-risks'] },
          q3: { text: 'In 24 astronauts on 6-month ISS missions, nights of 6 hours or less went with slower reaction speed and higher stress.', sourceIds: ['iss-sleep-study'] },
          q4: { text: 'A night shorter than your own range shows as Watch. Short sleep together with a slower reaction test shows the fatigue pattern, and adds a Caution to the spacewalk readiness summary.', sourceIds: [] },
          q5: { text: 'Draft, from the team\'s dissertation: a short nap, well-timed caffeine, or asking to reschedule a high-criticality task. Longer-term countermeasures are guided by flight doctors.', sourceIds: ['almadani-2025'] }
        } },
      { id: 'mood', label: 'Mood and stress', unit: '/100', schedule: 'daily', region: 'brain', isPrivate: true,
        scaleNote: 'Visual analogue scales modeled on NASA\'s Reaction Self Test survey, chosen by the team\'s physician. Not a validated clinical scale.',
        parts: [
          { key: 'mood', label: 'Mood right now', min: 0, max: 100, step: 1, start: 50, slider: true, lowLabel: 'Very low', highLabel: 'Very good' },
          { key: 'stress', label: 'Stress right now', min: 0, max: 100, step: 1, start: 50, slider: true, lowLabel: 'None', highLabel: 'Extreme' }
        ],
        howTo: 'Slide to where you are right now. Only you and the flight surgeon see this. Crewmates never do.',
        learn: {
          q1: { text: 'Yes. On the ISS, astronauts rated stress, workload and tiredness on sliding scales as part of the Reaction Self Test, and NASA\'s ARCHeR study uses behavioral surveys.', sourceIds: ['iss-sleep-study', 'nasa-archer'] },
          q2: { text: 'Isolation, radiation and distance from Earth may affect crew mental health.', sourceIds: ['nasa-hrp-risks'] },
          q3: { text: 'Hazards add up. In ISS astronauts, short sleep went with higher stress ratings.', sourceIds: ['iss-sleep-study', 'nasa-hrp-hazards'] },
          q4: { text: 'A lasting drop from your own range shows as Watch. You can route it to the private psychological conference instead of the medical one. The scale itself is a placeholder until a validated one is chosen in Phase 3.', sourceIds: ['nasa-crewtime'] },
          q5: { text: TBD, sourceIds: [] }
        } },
      { id: 'glucose', label: 'Blood sugar', unit: 'mg/dL', schedule: 'indicated', region: 'metabolic',
        parts: [ { key: 'glucose', label: 'Milligrams per decilitre', min: 20, max: 600, step: 1, start: 90 } ],
        howTo: 'Add it if you feel shaky, sweaty, confused or very thirsty, or if the crew medical officer asks.',
        learn: {
          q1: { text: 'The challenge brief names blood sugar as a useful indicator. How it is measured in flight: ' + TBD, sourceIds: [] },
          q2: { text: 'Crews on deep-space missions need balanced, appealing, long-lasting meals, and poor nutrition is a recognised risk.', sourceIds: ['nasa-hrp-risks'] },
          q3: { text: TBD, sourceIds: [] },
          q4: { text: 'The ranges shown are placeholders until Phase 3.', sourceIds: [] },
          q5: { text: TBD, sourceIds: [] }
        } },
      { id: 'spo2', label: 'Blood oxygen (SpO₂)', unit: '%', schedule: 'indicated', region: 'lungs',
        parts: [ { key: 'spo2', label: 'Percent', min: 50, max: 100, step: 1, start: 98 } ],
        howTo: 'Add it if you are short of breath, have chest symptoms or a fever, or if the crew medical officer asks. Keep your hand still and warm while the sensor reads.',
        learn: {
          q1: { text: 'Yes. The Bio-Monitor shirt records blood oxygen saturation on the ISS.', sourceIds: ['csa-biomonitor'] },
          q2: { text: 'Steps taken to avoid decompression sickness on spacewalks may raise the risk of mildly low tissue oxygen.', sourceIds: ['nasa-hrp-risks'] },
          q3: { text: TBD, sourceIds: [] },
          q4: { text: 'The ranges shown are placeholders until Phase 3.', sourceIds: [] },
          q5: { text: TBD, sourceIds: [] }
        } },
      { id: 'rt', label: 'Reaction test', unit: '', schedule: 'scheduled', region: 'brain', parts: [],
        howTo: 'A 3-minute test. Tap as soon as the counter starts. Use the same device each time.',
        learn: {
          q1: { text: 'Yes. ISS astronauts have used NASA\'s Reaction Self Test, a 3-minute reaction-time test, since 2009. Before each test, Crewcial asks how alert you feel from 0 (tired) to 10 (alert), the scale used before test sessions in a study of ISS astronauts.', sourceIds: ['nasa-rst-spinoff', 'nasa-rst-ntrs', 'dev-2024'] },
          q2: { text: 'People are poor judges of their own tiredness. After 14 days of 6 hours or less in bed, people\'s sleepiness ratings levelled off while their test performance kept getting worse, and they were largely unaware of it. The test gives an objective check, and Crewcial shows whether it agrees with how you feel.', sourceIds: ['van-dongen-2003', 'nasa-rst-spinoff'] },
          q3: { text: 'In ISS astronauts, nights of 6 hours or less went with slower reaction speed.', sourceIds: ['iss-sleep-study'] },
          q4: { text: 'A result slower than your own range shows as Watch. With short sleep it shows the fatigue pattern, and before a spacewalk it adds a Caution to the readiness summary for the flight surgeon. If you feel as alert as usual but the test is slower than your usual, Crewcial shows the blind-spot pattern.', sourceIds: ['nasa-3001-medops'] },
          q5: { text: 'Draft, from the team\'s dissertation: a short nap, well-timed caffeine, or asking to reschedule a high-criticality task.', sourceIds: ['almadani-2025'] }
        } },
      { id: 'amsler', label: 'Amsler grid', unit: '', schedule: 'scheduled', region: 'eyes', parts: [],
        howTo: 'Test one eye at a time. Look at the centre dot and mark any squares where lines look wavy, blurred or missing.',
        learn: {
          q1: { text: 'Yes. On the ISS the Amsler grid is done on a laptop. It is one of the routine vision checks, with visual acuity and a symptom questionnaire.', sourceIds: ['nasa-vision-2017', 'nasa-vision-2018', 'vision-assess-2023'] },
          q2: { text: 'The structure of the eye and brain can change in flight (SANS). A grid test can show distortion in central vision.', sourceIds: ['nasa-hrp-risks', 'statpearls-amsler'] },
          q3: { text: 'In weightlessness, blood and fluid shift from the lower to the upper body. NASA is testing whether thigh cuffs that keep fluid in the legs can prevent these eye changes.', sourceIds: ['norsk-2015', 'nasa-hrp-research'] },
          q4: { text: 'A newly marked square, compared with your last map of the same eye, is reported to the flight surgeon. Whether that is Watch or Act now is an open decision for Phase 3.', sourceIds: [] },
          q5: { text: TBD, sourceIds: [] }
        } },
      { id: 'symptoms', label: 'Symptom check', unit: '', schedule: 'daily', region: null, parts: [],
        howTo: 'Tap the part of the body that bothers you, or confirm that you have no symptoms today.',
        learn: {
          q1: { text: 'Yes. It needs no equipment.', sourceIds: [] },
          q2: { text: 'Many likely in-flight problems are things you feel, not things a device measures. In the sample output of a NASA medical model, the most likely conditions include trouble sleeping, skin abrasion, skin rash, eye abrasion and headache.', sourceIds: ['nasa-3001-appe'] },
          q3: { text: TBD, sourceIds: [] },
          q4: { text: 'A red-flag symptom shows as Act now whatever your readings are. The red-flag list is a placeholder until Phase 3.', sourceIds: [] },
          q5: { text: TBD, sourceIds: [] }
        } }
    ],

    learnQuestions: {
      q1: 'Can it be measured in space?',
      q2: 'Why check it?',
      q3: 'How do spaceflight hazards affect it?',
      q4: 'When does it need the crew or the flight surgeon?',
      q5: 'What helps prevent a serious problem?'
    },

    /* Draft guidance. Everything here needs the physician's review. */
    guidance: {
      generic: {
        t2: ['Repeat the measurement under the same conditions: rested, same device.',
             'Note any symptoms in today\'s symptom check.',
             'Add this to your next private medical conference report.'],
        t1: ['Stop the current task if it is safe to stop.',
             'Tell the crew medical officer now.',
             'Repeat the measurement to confirm it.',
             'Send an urgent report to the flight surgeon.'],
        remeasure: 'Re-measure now: rest for 5 minutes, then repeat the reading.',
        notRested: ['Re-measure after 30 minutes with no exercise or caffeine, then 5 minutes\' rest.'],
        dangerSide: 'If a repeat gives the same, or your device shows LO or HI, act now.',
        recheck: ['Repeat the measurement under the same conditions: rested, same device.',
                  'If tomorrow\'s reading is also outside your range, this becomes Watch.'],
        /* Urgent, not an emergency (decisions 3.2 and 3.3): Watch with the report set to Urgent. */
        urgentTell: ['Tell the crew medical officer today.',
                     'Send the report, set to Urgent. The flight surgeon replies within 24 hours.']
      },
      temp: { urgent: ['Re-measure now: rest for 5 minutes, then repeat the reading.',
                       'If new confusion or fainting comes with it, act now: tell the crew medical officer now.',
                       'Hold safety-critical tasks, such as a spacewalk, until the flight surgeon clears you.'], sourceIds: ['rcp-news2'] },
      glucose: {
        lowUrgent: ['Eat or drink 15 g of fast-acting sugar now, then measure again after 15 minutes.',
                    'If it is still below 54, or you feel confused or faint, act now: tell the crew medical officer now.',
                    'Hold safety-critical tasks, such as a spacewalk, until the flight surgeon clears you.'],
        low: ['Eat or drink 15 g of fast-acting sugar now, then measure again after 15 minutes.',
              'Add this to your next private medical conference report.'],
        highUrgent: ['Measure again with clean, dry hands and a new strip.',
                     'If you are vomiting, breathing fast or feel confused, act now: tell the crew medical officer now.',
                     'Hold safety-critical tasks, such as a spacewalk, until the flight surgeon clears you.'],
        recheck: ['Measure again with clean, dry hands and a new strip.',
                  'If you ate recently, measure again before your next meal.'],
        sourceIds: ['ada-2026-s6']
      },
      sleep: { t2: ['Consider a short nap.', 'Time your caffeine.', 'Ask to reschedule any high-criticality task.', 'Add this to your next private medical conference report.'], sourceIds: ['almadani-2025'] },
      rt:    { t2: ['Consider a short nap.', 'Time your caffeine.', 'Ask to reschedule any high-criticality task.'], sourceIds: ['almadani-2025'] },
      mood:  { t2: ['You can use the private psychological conference route.', 'Mood entries are never shown to crewmates.', 'Add this to a private report if you want the flight surgeon to see it.'], sourceIds: ['nasa-crewtime', 'nasa-3001-medops'] },
      amsler: { t2: ['Repeat the grid test for the same eye under the same conditions.', 'Send the report to the flight surgeon. It is set to Urgent, so it does not wait for the weekly conference.'], sourceIds: [] },
      symptoms: { t2: ['Note how it changes during the day.', 'Add it to your next private medical conference report.'], sourceIds: [] },
      P1: { t2: ['Consider a short nap.', 'Time your caffeine.', 'Ask to reschedule any high-criticality task.', 'Send the readiness summary to the flight surgeon before a spacewalk.'], sourceIds: ['almadani-2025', 'nasa-3001-medops'] },
      P2: { t2: ['Repeat temperature and heart rate after 5 minutes of rest.', 'Tell the crew medical officer today.', 'Record any symptoms.'], sourceIds: [] },
      P3: { t2: ['Repeat the grid test for the same eye.', 'Send the report to the flight surgeon. It is set to Urgent, so it does not wait for the weekly conference.'], sourceIds: [] },
      P5: { t2: ['Do not rely on how you feel today: the test says you are slower than your usual.', 'Repeat the test after a short break, on the same device.', 'Tell the crew medical officer before any high-criticality task.', 'Consider a short nap, timed caffeine, or asking to reschedule a high-criticality task.'], sourceIds: ['almadani-2025'] },
      P4: { t2: ['Plan a lighter day if the schedule allows.', 'Recheck resting heart rate tomorrow morning.', 'Add this to your next private medical conference report.'], sourceIds: ['almadani-2025'] }
    },

    /* Crew medical officer checklists. Process steps only. The clinical
       content will be written and signed by the physician in Phase 3. */
    cmoChecklists: {
      generic: { title: 'General checklist', steps: [
        'Confirm who the crew member is and what Crewcial flagged.',
        'Repeat the flagged measurement yourself and record it.',
        'Look at the crew member\'s trend for the last 7 days.',
        'Ask about symptoms using the symptom list.',
        'Open the on-board medical checklist for this problem.',
        'Prepare the report with the crew member and choose the route.',
        'Agree when to check again.'
      ] },
      P1: { title: 'Fatigue pattern', steps: [
        'Confirm last night\'s sleep hours with the crew member.',
        'Have the crew member repeat the reaction test on the same device.',
        'Check today\'s and tomorrow\'s schedule for high-criticality tasks.',
        'Send the readiness summary to the flight surgeon. The readiness decision is theirs.',
        'Agree when to check again.'
      ] },
      P5: { title: 'Blind spot', steps: [
        'Show the crew member both results: how alert they said they felt, and the test result.',
        'Have the crew member repeat the reaction test on the same device after a short break.',
        'Check today\'s and tomorrow\'s schedule for high-criticality tasks.',
        'Send the readiness summary to the flight surgeon. The readiness decision is theirs.',
        'Agree when to check again.'
      ] },
      P2: { title: 'Possible infection pattern', steps: [
        'Repeat temperature and heart rate after 5 minutes of rest.',
        'Ask about symptoms using the symptom list.',
        'Open the on-board medical checklist for this problem.',
        'Prepare the report with the crew member and choose the route.',
        'Agree when to check again.'
      ] },
      P3: { title: 'Vision change pattern', steps: [
        'Have the crew member repeat the Amsler grid for the affected eye.',
        'Ask about headache and any change in vision.',
        'Open the on-board medical checklist for this problem.',
        'Prepare the report for the flight surgeon with the crew member.',
        'Agree when to check again.'
      ] }
    }
  };
});
