// Shared static header assets; preserve each page's existing home link and label.
function brandImages(up) {
  return `<img src="${up}assets/symbol.svg" alt="" width="35" height="35"><img class="wordmark" src="${up}assets/wordmark.svg" alt="TAIPOPO" width="132" height="28">`;
}
module.exports = { brandImages };
