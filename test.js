const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const debugFunc = `
function handleRequest(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var info = sheets.map(s => {
    var headers = s.getRange(1, 1, 1, s.getLastColumn() || 1).getValues()[0];
    return { name: s.getName(), headers: headers };
  });
  return ContentService.createTextOutput(JSON.stringify(info)).setMimeType(ContentService.MimeType.JSON);
}
`;

code = code.replace(/function doPost\(e\) \{[\s\S]*?\}\n\}/, debugFunc);
fs.writeFileSync('CodeDebug.gs', code);
