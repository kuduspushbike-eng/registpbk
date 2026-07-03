// --- COPY KODE INI KE GOOGLE APPS SCRIPT ---
// Cara: Extensions > Apps Script > Paste > Deploy as Web App (Access: Anyone)
// Versi: v12 (Auto-bypass payment for Old Members)

var FIELD_MAPPING = [
  { key: "timestamp", label: "Waktu Input", aliases: ["Timestamp", "Waktu"] },
  { key: "whatsapp", label: "No. WhatsApp", aliases: ["WhatsApp", "Nomor WA", "Phone"] },
  { key: "status", label: "Status Member", aliases: ["Status"] },
  { key: "paymentAmount", label: "Nominal Transfer", aliases: ["PaymentAmount", "Jumlah", "Harga"] },
  { key: "paymentCode", label: "Kode Unik", aliases: ["PaymentCode", "Kode"] },
  { key: "paymentMethod", label: "Metode Bayar", aliases: ["PaymentMethod", "Via"] },
  { key: "childCount", label: "Jumlah Anak", aliases: ["ChildCount", "Jml Anak", "Jumlah"] },
  
  // Child 1 (Added aliases for old column names without "1")
  { key: "fullName", label: "Nama Lengkap Anak 1", aliases: ["FullName", "Nama Lengkap", "Nama Lengkap Anak"] },
  { key: "nickname", label: "Nama Panggilan 1", aliases: ["Nickname", "Panggilan", "Nama Panggilan"] },
  { key: "gender", label: "Jenis Kelamin 1", aliases: ["Gender", "JK", "Jenis Kelamin"] },
  { key: "birthYear", label: "Tahun Lahir 1", aliases: ["BirthYear", "Tahun", "Tahun Lahir"] },
  { key: "birthDate", label: "Tanggal Lahir 1", aliases: ["BirthDate", "Tgl Lahir", "Tanggal Lahir"] },
  { key: "shirtSize", label: "Ukuran Baju 1", aliases: ["ShirtSize", "Jersey", "Size", "Ukuran Baju"] },

  // Child 2 (Optional)
  { key: "fullName2", label: "Nama Lengkap Anak 2", aliases: ["FullName2"] },
  { key: "nickname2", label: "Nama Panggilan 2", aliases: ["Nickname2"] },
  { key: "gender2", label: "Jenis Kelamin 2", aliases: ["Gender2", "JK2"] },
  { key: "birthYear2", label: "Tahun Lahir 2", aliases: ["BirthYear2"] },
  { key: "birthDate2", label: "Tanggal Lahir 2", aliases: ["BirthDate2"] },
  { key: "shirtSize2", label: "Ukuran Baju 2", aliases: ["ShirtSize2"] },

  // Parents
  { key: "fatherName", label: "Nama Ayah", aliases: ["FatherName", "Ayah"] },
  { key: "motherName", label: "Nama Ibu", aliases: ["MotherName", "Ibu"] },
  { key: "addressKK", label: "Alamat KK", aliases: ["AddressKK", "KK"] },
  { key: "addressDomicile", label: "Alamat Domisili", aliases: ["AddressDomicile", "Domisili"] }
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "Registrasi_2026";
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    var colMap = setupColumns(sheet);
    
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var result = {};
    
    if (action == "get_all") {
      result = getAllMembers(sheet, colMap);
    } else if (action == "check_status") {
      result = handleCheckStatus(sheet, colMap, params);
    } else if (action == "confirm_payment") {
      result = handleConfirmPayment(sheet, colMap, params);
    } else if (action == "admin_approve") {
      result = handleAdminApprove(sheet, colMap, params);
    } else if (action == "submit_registration") {
      result = handleSubmitRegistration(sheet, colMap, params);
    } else if (action == "sync_colors") {
      result = handleSyncColors(sheet, colMap);
    } else if (action == "wipe_all") {
      sheet.clearContents();
      sheet.setBackground(null); // Clear colors
      setupColumns(sheet);
      result = {success: true};
    } else if (action == "submit_race_kolektif") {
      result = handleSubmitRaceKolektif(ss, params);
    } else if (action == "get_race_kolektif") {
      result = handleGetRaceKolektif(ss);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateRaceKolektifSheet(ss) {
  var sheet = ss.getSheetByName("RaceKolektif");
  if (!sheet) {
    sheet = ss.insertSheet("RaceKolektif");
    var headers = ["Timestamp", "Category", "Rider Name", "Team Name", "Community", "Shirt Size", "Start Number", "Born Date", "KK/Akta Base64", "Bukti Transfer Base64"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  }
  return sheet;
}

function handleSubmitRaceKolektif(ss, params) {
  var sheet = getOrCreateRaceKolektifSheet(ss);
  var row = [
    new Date(),
    params.category,
    params.riderName,
    params.teamName,
    params.community,
    params.shirtSize,
    params.startNumber,
    params.bornDate,
    params.kkAktaFile,
    params.buktiTransferFile
  ];
  sheet.appendRow(row);
  return { success: true };
}

function handleGetRaceKolektif(ss) {
  var sheet = getOrCreateRaceKolektifSheet(ss);
  var data = sheet.getDataRange().getValues();
  var result = [];
  if (data.length > 1) {
    for (var i = 1; i < data.length; i++) {
      result.push({
        timestamp: data[i][0],
        category: data[i][1],
        riderName: data[i][2],
        teamName: data[i][3],
        community: data[i][4],
        shirtSize: data[i][5],
        startNumber: data[i][6],
        bornDate: data[i][7],
        kkAktaFile: data[i][8],
        buktiTransferFile: data[i][9]
      });
    }
  }
  return { data: result };
}

function setupColumns(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = [];
  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }
  var map = {};
  var headersChanged = false;
  
  for (var i = 0; i < FIELD_MAPPING.length; i++) {
    var field = FIELD_MAPPING[i];
    var foundIndex = -1;
    
    // 1. Check exact label
    var idx = headers.indexOf(field.label);
    if (idx > -1) {
      foundIndex = idx + 1;
    }
    
    // 2. Check aliases if label not found
    if (foundIndex === -1 && field.aliases) {
      for (var j = 0; j < field.aliases.length; j++) {
        var aliasIdx = headers.indexOf(field.aliases[j]);
        if (aliasIdx > -1) {
          foundIndex = aliasIdx + 1;
          break;
        }
      }
    }
    
    // 3. Create new if missing
    if (foundIndex === -1) {
      var newColIdx = headers.length + 1;
      sheet.getRange(1, newColIdx).setValue(field.label);
      headers.push(field.label);
      foundIndex = newColIdx;
      headersChanged = true;
    }
    map[field.key] = foundIndex;
  }
  
  if (headersChanged) sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold");
  return map;
}

function getAllMembers(sheet, colMap) {
  var data = sheet.getDataRange().getValues();
  var members = [];
  var waColIdx = colMap['whatsapp'] - 1;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row.length > waColIdx && row[waColIdx]) {
      members.push(rowToMember(row, colMap));
    }
  }
  return members;
}

function handleCheckStatus(sheet, colMap, params) {
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
  } else {
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
}

function handleConfirmPayment(sheet, colMap, params) {
  var rowIndex = findRowIndex(sheet, colMap, params.whatsapp);
  if (rowIndex == -1) throw "Member not found";
  
  sheet.getRange(rowIndex, colMap['status']).setValue("WAITING_APPROVAL");
  sheet.getRange(rowIndex, colMap['paymentMethod']).setValue(params.method);
  
  if (params.method === "CASH") {
     var currentChildCount = sheet.getRange(rowIndex, colMap['childCount']).getValue() || 1;
     var basePrice = currentChildCount == 2 ? 200000 : 100000;
     sheet.getRange(rowIndex, colMap['paymentAmount']).setValue(basePrice);
  }
  
  // Set Color for WAITING_APPROVAL
  updateRowColor(sheet, rowIndex, "WAITING_APPROVAL");
  
  return getMemberAtRow(sheet, colMap, rowIndex);
}

function handleAdminApprove(sheet, colMap, params) {
  var rowIndex = findRowIndex(sheet, colMap, params.whatsapp);
  if (rowIndex == -1) throw "Member not found";
  
  sheet.getRange(rowIndex, colMap['status']).setValue("APPROVED");
  
  // Set Color for APPROVED
  updateRowColor(sheet, rowIndex, "APPROVED");
  
  return getMemberAtRow(sheet, colMap, rowIndex);
}

function handleSubmitRegistration(sheet, colMap, params) {
  var rowIndex = findRowIndex(sheet, colMap, params.whatsapp);
  if (rowIndex == -1) throw "Member not found";
  var data = params.data;
  sheet.getRange(rowIndex, colMap['status']).setValue("REGISTERED");
  for (var key in data) {
    if (colMap[key]) {
      sheet.getRange(rowIndex, colMap[key]).setValue(data[key]);
    }
  }
  
  // Set Color for REGISTERED
  updateRowColor(sheet, rowIndex, "REGISTERED");
  
  return getMemberAtRow(sheet, colMap, rowIndex);
}

function handleSyncColors(sheet, colMap) {
  var data = sheet.getDataRange().getValues();
  var statusColIdx = colMap['status'] - 1;
  var count = 0;
  
  if (statusColIdx < 0) return {success: false, message: "Status column not found"};
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row.length > statusColIdx) {
      var status = row[statusColIdx];
      if (status) {
        updateRowColor(sheet, i + 1, status);
        count++;
      }
    }
  }
  return {success: true, count: count};
}

function updateRowColor(sheet, rowIdx, status) {
  var color = "#ffffff"; // Default (NEW) - White
  
  if (status === "WAITING_APPROVAL") {
    color = "#fff9c4"; // Light Yellow
  } else if (status === "APPROVED") {
    color = "#bbdefb"; // Light Blue
  } else if (status === "REGISTERED") {
    color = "#c8e6c9"; // Light Green
  }
  
  // Color range from Column 1 (A) to 29 (AC)
  try {
    sheet.getRange(rowIdx, 1, 1, 29).setBackground(color);
  } catch(e) {
    // Fallback if less columns exist
    sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).setBackground(color);
  }
}

function findRowIndex(sheet, colMap, wa) {
  var data = sheet.getDataRange().getValues();
  var target = normalizePhone(wa);
  var colIdx = colMap['whatsapp'] - 1;
  for (var i = 1; i < data.length; i++) {
    if (data[i].length > colIdx) {
      var rowVal = data[i][colIdx];
      if (normalizePhone(rowVal) == target && target.length > 5) return i + 1;
    }
  }
  return -1;
}

function getMemberAtRow(sheet, colMap, rowIndex) {
  var lastCol = sheet.getLastColumn();
  var maxIdx = 0;
  for(var k in colMap) { if(colMap[k] > maxIdx) maxIdx = colMap[k]; }
  var finalLastCol = Math.max(lastCol, maxIdx);
  var rowValues = sheet.getRange(rowIndex, 1, 1, finalLastCol).getValues()[0];
  return rowToMember(rowValues, colMap);
}

function rowToMember(rowArray, colMap) {
  var m = {};
  for (var key in colMap) {
    var idx = colMap[key] - 1;
    if (idx < rowArray.length) {
      var val = rowArray[idx];
      if (key === 'whatsapp') val = String(val).replace(/'/g, '');
      
      // Default childCount to 1 if empty (legacy data)
      if (key === 'childCount') {
         if (val === "" || val === null || val === undefined) val = 1;
         else val = Number(val);
      }
      
      m[key] = val;
    }
  }
  // Fallback for childCount if column didn't exist in range
  if (!m.childCount) m.childCount = 1;
  
  return m;
}

function normalizePhone(phone) {
  if (!phone) return "";
  var p = String(phone).replace(/\D/g, ''); 
  if (p.startsWith('62')) p = '0' + p.substring(2);
  else if (!p.startsWith('0') && p.length > 0) p = '0' + p;
  return p;
}
