const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const debugFunc = `
    if (action == "debug") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheets = ss.getSheets();
      var info = sheets.map(s => {
        var headers = [];
        if (s.getLastColumn() > 0) {
          headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
        }
        return { name: s.getName(), headers: headers };
      });
      return ContentService.createTextOutput(JSON.stringify(info)).setMimeType(ContentService.MimeType.JSON);
    }
`;

code = code.replace(/if \(action == "get_all"\) \{/, debugFunc + '\n    if (action == "get_all") {');
fs.writeFileSync('Code.gs', code);
