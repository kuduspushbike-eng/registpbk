const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const funcStart = 'function handleCheckStatus(sheet, colMap, params) {';
const funcEnd = 'function handleAdminApprove'; // marker for end of handleCheckStatus

const startIndex = code.indexOf(funcStart);
const endIndex = code.indexOf(funcEnd);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find boundaries");
  process.exit(1);
}

const newHandleCheckStatus = `function handleCheckStatus(sheet, colMap, params) {
  var wa = params.whatsapp;
  var nickname = params.nickname || "";
  var childCount = Number(params.childCount) || 1;
  var isOldMemberClaimed = params.isOldMemberClaimed || false;
  
  var rowIndex = findRowIndex(sheet, colMap, wa);

  if (rowIndex == -1) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
    }
    
    var isOldMember = false;
    if (oldSheet && oldSheet.getName() !== sheet.getName()) {
      var data = oldSheet.getDataRange().getValues();
      var oldHeaders = data[0] || [];
      var waColIdx = -1;
      for(var i=0; i<oldHeaders.length; i++) {
        var h = String(oldHeaders[i]).toLowerCase();
        if(h.indexOf("whatsapp") > -1 || h.indexOf("wa") > -1 || h.indexOf("phone") > -1) {
          waColIdx = i; break;
        }
      }
      if(waColIdx === -1) waColIdx = colMap['whatsapp'] - 1; // fallback
      
      var normalizedWa = normalizePhone(wa);
      for (var i = 1; i < data.length; i++) {
        var rowWa = normalizePhone(data[i][waColIdx]);
        if (rowWa === normalizedWa) {
          isOldMember = true;
          break;
        }
      }
    }

    var waString = "'" + wa; 
    var newRowIdx = sheet.getLastRow() + 1;
    sheet.getRange(newRowIdx, colMap['timestamp']).setValue(new Date());
    sheet.getRange(newRowIdx, colMap['whatsapp']).setValue(waString);
    sheet.getRange(newRowIdx, colMap['childCount']).setValue(childCount);
    if(nickname) sheet.getRange(newRowIdx, colMap['nickname']).setValue(nickname);
    
    if (isOldMember) {
      sheet.getRange(newRowIdx, colMap['status']).setValue("APPROVED");
      sheet.getRange(newRowIdx, colMap['paymentAmount']).setValue(0);
      sheet.getRange(newRowIdx, colMap['paymentCode']).setValue(0);
      sheet.getRange(newRowIdx, colMap['paymentMethod']).setValue("MEMBER_LAMA");
      updateRowColor(sheet, newRowIdx, "APPROVED");
    } else if (isOldMemberClaimed) {
      sheet.getRange(newRowIdx, colMap['status']).setValue("WAITING_APPROVAL");
      sheet.getRange(newRowIdx, colMap['paymentAmount']).setValue(0);
      sheet.getRange(newRowIdx, colMap['paymentCode']).setValue(0);
      sheet.getRange(newRowIdx, colMap['paymentMethod']).setValue("KLAIM_MEMBER_LAMA");
      updateRowColor(sheet, newRowIdx, "WAITING_APPROVAL");
    } else {
      var randomCode = Math.floor(Math.random() * 90 + 10);
      var basePrice = childCount == 2 ? 200000 : 100000;
      var amount = basePrice + randomCode;
      sheet.getRange(newRowIdx, colMap['status']).setValue("NEW");
      sheet.getRange(newRowIdx, colMap['paymentAmount']).setValue(amount);
      sheet.getRange(newRowIdx, colMap['paymentCode']).setValue(randomCode);
      updateRowColor(sheet, newRowIdx, "NEW");
    }
    
    return getMemberAtRow(sheet, colMap, newRowIdx);
  }

  var member = getMemberAtRow(sheet, colMap, rowIndex);
  if (member.status === "NEW") {
     var currentChildCount = Number(member.childCount) || 1;
     var needsUpdate = false;
     var newBasePrice = childCount == 2 ? 200000 : 100000;
     var randomCode = member.paymentCode || Math.floor(Math.random() * 90 + 10);
     
     if (currentChildCount !== childCount) {
       sheet.getRange(rowIndex, colMap['childCount']).setValue(childCount);
       sheet.getRange(rowIndex, colMap['paymentAmount']).setValue(newBasePrice + randomCode);
       sheet.getRange(rowIndex, colMap['paymentCode']).setValue(randomCode);
       needsUpdate = true;
     }
     if (nickname && member.nickname !== nickname) {
       sheet.getRange(rowIndex, colMap['nickname']).setValue(nickname);
       needsUpdate = true;
     }
     
     if (isOldMemberClaimed) {
       sheet.getRange(rowIndex, colMap['status']).setValue("WAITING_APPROVAL");
       sheet.getRange(rowIndex, colMap['paymentAmount']).setValue(0);
       sheet.getRange(rowIndex, colMap['paymentCode']).setValue(0);
       sheet.getRange(rowIndex, colMap['paymentMethod']).setValue("KLAIM_MEMBER_LAMA");
       updateRowColor(sheet, rowIndex, "WAITING_APPROVAL");
       needsUpdate = true;
     }
     
     if (needsUpdate) {
       return getMemberAtRow(sheet, colMap, rowIndex);
     }
  }
  return member;
}

`;

code = code.substring(0, startIndex) + newHandleCheckStatus + code.substring(endIndex);

code = code.replace(/Versi: v13.*/, 'Versi: v14 (Opsi Klaim Member Lama)');

fs.writeFileSync('Code.gs', code);
