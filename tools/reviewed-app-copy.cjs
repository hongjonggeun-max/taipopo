'use strict';
// The imported policy is preserved provenance. Only the identified photo-sharing
// paragraph differs in the current app copy; no dates or other clauses may drift.
function policyBodyMatchesApp(policy, arb) {
  if (policy.body === arb.privacyPolicyBody) return true;
  const section = policy.body.match(/(?:^|\n)2\. [\s\S]*?(?=\n3\. |$)/u)?.[0];
  if (!section) return false;
  const paragraphs = section.split('\n').filter(line => /EXIF/iu.test(line) && !line.startsWith('• '));
  if (paragraphs.length !== 1) return false;
  return policy.body.replace(paragraphs[0], arb.locationPreservationNotice) === arb.privacyPolicyBody;
}
module.exports = { policyBodyMatchesApp };
