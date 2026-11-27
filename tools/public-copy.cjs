'use strict';
const copy = require('./public-copy.json');
const { locales: reviewedDisclosures } = require('./website-disclosures.json');
const featureOrder = ['memo', 'work-photos', 'camera-flash', 'camera-memo', 'camera-exposure', 'camera-landscape'];
function publicManualChapters(chapters, code, arb) {
  const text = copy[code];
  if (!text || text.manualBodies.length !== featureOrder.length) throw Error(`Incomplete public copy: ${code}`);
  const result = structuredClone(chapters);
  for (const feature of result.flatMap(chapter => chapter.features)) {
    const index = featureOrder.indexOf(feature.id === 'camera-capture' ? 'work-photos' : feature.id);
    if (index >= 0) feature.body = text.manualBodies[index];
    if (feature.id === 'data-usage' && feature.body !== text.dataUsage) {
      throw Error(`App/public data-usage copy differs: ${code}`);
    }
    if (feature.id === 'restore') {
      if (!arb.legacyDriveBackupNotice?.includes('appDataFolder')) throw Error(`Missing legacy Drive notice: ${code}`);
      if (!feature.body.includes(arb.legacyDriveBackupNotice)) feature.body += `\n\n${arb.legacyDriveBackupNotice}`;
    }
    if (feature.id === 'camera-gps-record') {
      feature.body = [`${arb.camera} → ${arb.cameraOptions} → ${arb.gpsLocationRecord}`, arb.cameraGpsUsageNotice, arb.gpsLocationRecordSubtitle, reviewedDisclosures[code].gpsCache].join('\n\n');
    }
    if (feature.id === 'camera-options') feature.title = arb.cameraOptions;
    if (feature.id === 'camera-coordinates') {
      feature.title = arb.cameraGpsCoordinatesDisplay;
      feature.body = arb.manualPurposeCoordinates;
    }
    if (feature.id === 'camera-address') {
      feature.title = arb.showAddress;
      feature.body = arb.showAddressSubtitle;
    }
    if (feature.id === 'workplace-gps-address') {
      feature.title = arb.address;
      feature.body = arb.manualPurposeWorkplaceGpsAddress;
      feature.notice = null;
    }

  }
  return result;
}
module.exports = { copy, publicManualChapters };
