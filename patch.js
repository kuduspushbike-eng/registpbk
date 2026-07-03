const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const newFunc = `function handleCheckStatus(sheet, colMap, params) {
  var wa = params.whatsapp;
  var nickname = params.nickname || "";
  var childCount = Number(params.childCount) || 1;
  var rowIndex = findRowIndex(sheet, colMap, wa);
  
  if (rowIndex == -1) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
    
    var isOldMember = false;
    if (oldSheet && oldSheet.getName() !== sheet.getName()) {
      var data = oldSheet.getDataRange().getValues();
      var oldHeaders = data[0] || [];
      // find whatsapp col index in old sheet, fallback to 1 (col B) if not found by name
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
      // Old members bypass payment
      sheet.getRange(newRowIdx, colMap['status']).setValue("APPROVED");
      sheet.getRange(newRowIdx, colMap['paymentAmount']).setValue(0);
      sheet.getRange(newRowIdx, colMap['paymentCode']).setValue(0);
      sheet.getRange(newRowIdx, colMap['paymentMethod']).setValue("MEMBER_LAMA");
      updateRowColor(sheet, newRowIdx, "APPROVED");
    } else {
      // New members need to pay
      var randomCode = Math.floor(Math.random() * 90 + 10);
      var basePrice = childCount == 2 ? 200000 : 100000;
      var amount = basePrice + randomCode;
      sheet.getRange(newRowIdx, colMap['status']).setValue("NEW");
      sheet.getRange(newRowIdx, colMap['paymentAmount']).setValue(amount);
      sheet.getRange(newRowIdx, colMap['paymentCode']).setValue(randomCode);
      updateRowColor(sheet, newRowIdx, "NEW");
    }
    
    return getMemberAtRow(sheet, colMap, newRowIdx);
  } else {
    // Member Exists. Check if we need to update childCount/Price
    var m = getMemberAtRow(sheet, colMap, rowIndex);
    
    if (m.status === 'NEW') {
       var currentCount = Number(m.childCount) || 1;
       if (currentCount !== childCount) {
          var basePrice = childCount == 2 ? 200000 : 100000;
          var code = m.paymentCode || Math.floor(Math.random() * 90 + 10); 
          var newAmount = basePrice + code;
          
          sheet.getRange(rowIndex, colMap['childCount']).setValue(childCount);
          sheet.getRange(rowIndex, colMap['paymentAmount']).setValue(newAmount);
          sheet.getRange(rowIndex, colMap['paymentCode']).setValue(code);
           
          m.childCount = childCount;
          m.paymentAmount = newAmount;
          m.paymentCode = code;
       }
       if (nickname && m.nickname !== nickname) {
          sheet.getRange(rowIndex, colMap['nickname']).setValue(nickname);
          m.nickname = nickname;
       }
    }
    
    return m;
  }
}`;

code = code.replace(/function handleCheckStatus\([\s\S]*?(?=function handleConfirmPayment)/, newFunc + '\n\n');
fs.writeFileSync('Code.gs', code);
