'use strict';
const copy = require('./public-copy.json');
const featureOrder = ['memo', 'work-photos', 'camera-flash', 'camera-memo', 'camera-exposure', 'camera-landscape'];
function publicManualChapters(chapters, code, arb) {
  const text = copy[code];
  if (!text || text.manualBodies.length !== featureOrder.length) throw Error(`Incomplete public copy: ${code}`);
  const result = structuredClone(chapters);
  for (const feature of result.flatMap(chapter => chapter.features)) {
    const index = featureOrder.indexOf(feature.id === 'camera-capture' ? 'work-photos' : feature.id);
    if (index >= 0) feature.body = text.manualBodies[index];
    if (feature.id === 'data-usage') feature.body = text.dataUsage;
    const menus = {
      'backup-device': ['backupFileSave', 'backupFileSaveSubtitle'],
      'backup-external': ['externalStorageBackupAction', 'externalStorageBackupActionSubtitle'],
      'backup-share': ['backupFileShare', 'backupFileShareSubtitle'],
    };
    if (menus[feature.id]) {
      const [title, subtitle] = menus[feature.id];
      feature.body = `${arb.settings} > ${arb.dataManagement} > ${arb[title]}\n${arb[subtitle]}`;
    }
    if (feature.id === 'backup-share') feature.body += `\n\n${arb.backupFileDisclosure}`;
    if (['camera-gps-record', 'camera-address'].includes(feature.id)) {
      const key = feature.id === 'camera-gps-record' ? 'gpsLocationRecordSubtitle' : 'showAddressSubtitle';
      feature.body = [arb[key], arb.manualAddressLookupChoice, arb.cameraAddressLookupNotice].join('\n\n');
    }
    if (feature.id === 'workplace-gps-address') {
      feature.body = [arb.manualPurposeWorkplaceGpsAddress, arb.manualAddressLookupChoice, arb.workplaceGpsLookupDisclosure].join('\n\n');
    }
    if (feature.id === 'restore') {
      feature.body = [
        `${arb.settings} > ${arb.dataManagement}`,
        `${arb.localRestoreSourceDevice}: ${arb.localRestoreDeviceActionSubtitle}`,
        `${arb.localRestoreSourceExternal}: ${arb.localRestoreExternalActionSubtitle}`,
        `${arb.externalBackupRestoreAction}: ${arb.externalBackupRestoreActionSubtitle}`,
        arb.manualPurposeRestore.split('\n\n').at(-1),
        arb.legacyDriveBackupNotice,
      ].join('\n\n');
    }
  }
  return result;
}
module.exports = { copy, publicManualChapters };
