/* Crewcial - release gate. Exits with an error while any rule is a placeholder
 * or has not been signed off by the team's physician.
 * Run: node tests/release-check.js
 * AI-assistance disclosure: generated with Claude (Anthropic) for Team Crewcial. */
'use strict';
const E = require('../js/engine.js');
const Rules = require('../data/rules.js');
const rc = E.releaseCheck(Rules);
console.log('Rules: ' + rc.total + ' | placeholders: ' + rc.placeholders.length + ' | sourced but not signed: ' + rc.unsigned.length);
if (rc.placeholders.length) console.log('Placeholders: ' + rc.placeholders.join(', '));
if (rc.unsigned.length) console.log('Awaiting sign-off: ' + rc.unsigned.join(', '));
if (!rc.ready) { console.log('NOT READY FOR RELEASE: clinical rules still need sources and sign-off.'); process.exit(1); }
console.log('Ready: every rule is sourced or team-proposed, and signed.');
