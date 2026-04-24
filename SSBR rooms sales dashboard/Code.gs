// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// The spreadsheet is created automatically on first run if SPREADSHEET_ID is blank.
var SPREADSHEET_ID = ''; // leave blank to auto-create, or paste your Sheet ID

// Sheet tab names
var SHEET_BILLING  = 'Monthly Billing';
var SHEET_SALES    = 'Daily Sales';
var SHEET_RECEIPTS = 'Receipts';

// ─── WEB APP ENTRY POINT ──────────────────────────────────────────────────────
function doPost(e) {
  var result;
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;

    if (action === 'ping')         result = handlePing(payload);
    else if (action === 'syncBilling')  result = handleSyncBilling(payload);
    else if (action === 'syncSales')    result = handleSyncSales(payload);
    else if (action === 'uploadFile')   result = handleUploadFile(payload);
    else result = { ok: false, error: 'Unknown action: ' + action };
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Allow preflight / GET ping from browser
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'SSBR Dashboard Script is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

function handlePing(payload) {
  var ss = getOrCreateSpreadsheet();
  return { ok: true, spreadsheetId: ss.getId(), spreadsheetUrl: ss.getUrl() };
}

function handleSyncBilling(payload) {
  var rows  = payload.rows || [];
  var month = payload.month || '';

  var headers = [
    'Month', 'Unit', 'Building', 'Tenant',
    'Rent (RM)', 'Elec Paid (RM)', 'Elec Charged (RM)',
    'Water (RM)', 'Other Desc', 'Other Amt (RM)',
    'Invoice No.', 'Total (RM)', 'Last Synced'
  ];

  var sheet = getOrCreateSheet(SHEET_BILLING, headers);

  // Delete existing rows for this month so we do a clean overwrite
  deleteRowsByMonth(sheet, month, 0); // col index 0 = Month

  var now = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
  rows.forEach(function(r) {
    sheet.appendRow([
      month, r.unit, r.building, r.tenant,
      r.rent, r.elecPaid, r.elecCharged,
      r.water, r.otherDesc, r.otherAmt,
      r.invoiceNo, r.total, now
    ]);
  });

  return { ok: true, rowsWritten: rows.length };
}

function handleSyncSales(payload) {
  var rows  = payload.rows || [];
  var month = payload.month || '';

  var headers = ['Month', 'Day', 'Weekday', 'Unit', 'Amount (RM)', 'Last Synced'];
  var sheet   = getOrCreateSheet(SHEET_SALES, headers);

  deleteRowsByMonth(sheet, month, 0);

  var now = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
  rows.forEach(function(r) {
    sheet.appendRow([month, r.day, r.weekday, r.unit, r.amount, now]);
  });

  return { ok: true, rowsWritten: rows.length };
}

function handleUploadFile(payload) {
  var folderId  = payload.folderId || '';
  var subfolder = payload.subfolder || 'Uploads';
  var fileName  = payload.fileName  || 'file';
  var mimeType  = payload.mimeType  || 'application/octet-stream';
  var base64    = payload.base64    || '';

  if (!folderId) return { ok: false, error: 'No folderId provided' };

  var bytes   = Utilities.base64Decode(base64);
  var blob    = Utilities.newBlob(bytes, mimeType, fileName);
  var folder  = DriveApp.getFolderById(folderId);

  // Ensure subfolder exists (supports one level of nesting like "Receipts/2025-06")
  var parts = subfolder.split('/');
  parts.forEach(function(part) {
    if (!part) return;
    var iter = folder.getFoldersByName(part);
    folder   = iter.hasNext() ? iter.next() : folder.createFolder(part);
  });

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Log to Receipts sheet
  logReceiptToSheet(fileName, file.getUrl(), subfolder);

  return { ok: true, fileUrl: file.getUrl(), fileId: file.getId() };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getOrCreateSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  // Auto-create and cache ID in Script Properties
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('SPREADSHEET_ID');
  if (cached) return SpreadsheetApp.openById(cached);

  var ss = SpreadsheetApp.create('SSBR Rooms Dashboard Data');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function getOrCreateSheet(name, headers) {
  var ss    = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 130);
  }
  return sheet;
}

function deleteRowsByMonth(sheet, month, colIndex) {
  var data = sheet.getDataRange().getValues();
  // Iterate backwards so row deletions don't shift indices
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][colIndex] === month) {
      sheet.deleteRow(i + 1);
    }
  }
}

function logReceiptToSheet(fileName, fileUrl, subfolder) {
  var headers = ['Subfolder', 'File Name', 'Drive URL', 'Uploaded At'];
  var sheet   = getOrCreateSheet(SHEET_RECEIPTS, headers);
  var now     = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
  sheet.appendRow([subfolder, fileName, fileUrl, now]);
}
