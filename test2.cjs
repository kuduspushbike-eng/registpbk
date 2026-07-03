const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const debugFunc = `
    if (action == "debug2") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Registrasi_2026") || ss.getActiveSheet();
      var oldSheet = ss.getSheetByName("MemberData");
      if (!oldSheet) {
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getName() !== sheet.getName()) {
            oldSheet = sheets[i];
            break;
          }
        }
      }
      
      var res = {
        oldSheetFound: !!oldSheet,
        oldSheetName: oldSheet ? oldSheet.getName() : null,
        oldHeaders: oldSheet ? (oldSheet.getDataRange().getValues()[0] || []) : [],
      };
      
      return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    }
`;

code = code.replace(/if \(action == "get_all"\) \{/, debugFunc + '\n    if (action == "get_all") {');
fs.writeFileSync('Code.gs', code);
