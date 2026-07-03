const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const findOldSheetStr = `    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var oldSheet = ss.getSheetByName("MemberData");
    if (!oldSheet) {
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        var name = sheets[i].getName();
        if (name !== sheet.getName() && name !== "RaceKolektif") {
          // Verify it has some data
          if (sheets[i].getLastRow() > 1) {
            oldSheet = sheets[i];
            break;
          }
        }
      }
      // fallback
      if (!oldSheet) {
        for (var i = 0; i < sheets.length; i++) {
          var name = sheets[i].getName();
          if (name !== sheet.getName() && name !== "RaceKolektif") {
            oldSheet = sheets[i];
            break;
          }
        }
      }
    }`;

// Wait, let's just replace the exact block.
code = code.replace(/var ss = SpreadsheetApp\.getActiveSpreadsheet\(\);\s*var oldSheet = ss\.getSheetByName\("MemberData"\);\s*if \(\!oldSheet\) \{\s*var sheets = ss\.getSheets\(\);\s*for \(var i = 0; i < sheets\.length; i\+\+\) \{\s*if \(sheets\[i\]\.getName\(\) !== sheet\.getName\(\)\) \{\s*oldSheet = sheets\[i\];\s*break;\s*\}\s*\}\s*\}/, findOldSheetStr);

fs.writeFileSync('Code.gs', code);
