/**
 * ============================================================================
 * corpRAG - Google Apps Script Web App Backend Database
 * ============================================================================
 * Paste this script into your Google Sheet's Apps Script Editor:
 * Extensions > Apps Script -> Paste code -> Click Deploy > New deployment
 * Select type: "Web app"
 * Execute as: "Me"
 * Who has access: "Anyone"
 */

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Ensure Sheet Tabs Exist
    var usersSheet = getOrCreateSheet(ss, "Users", ["ID", "Name", "Email", "HashedPassword", "CreatedAt"]);
    var logsSheet = getOrCreateSheet(ss, "QueryLogs", ["ID", "UserEmail", "Question", "Response", "Timestamp"]);

    // 1. Action: SIGNUP USER
    if (action === "SIGNUP") {
      var email = contents.email.toLowerCase().trim();
      
      // Check if user already exists
      var usersData = usersSheet.getDataRange().getValues();
      for (var i = 1; i < usersData.length; i++) {
        if (usersData[i][2] === email) {
          return responseJSON({ success: false, message: "User already exists with this email." });
        }
      }

      // Add New User Row
      var userId = "user_" + new Date().getTime();
      usersSheet.appendRow([userId, contents.name, email, contents.hashedPassword, new Date().toISOString()]);

      return responseJSON({
        success: true,
        user: { id: userId, name: contents.name, email: email }
      });
    }

    // 2. Action: GET USER BY EMAIL (For Login Verification)
    if (action === "GET_USER") {
      var email = contents.email.toLowerCase().trim();
      var usersData = usersSheet.getDataRange().getValues();
      
      for (var i = 1; i < usersData.length; i++) {
        if (usersData[i][2] === email) {
          return responseJSON({
            success: true,
            user: {
              id: usersData[i][0],
              name: usersData[i][1],
              email: usersData[i][2],
              hashedPassword: usersData[i][3],
              createdAt: usersData[i][4]
            }
          });
        }
      }
      return responseJSON({ success: false, message: "User not found." });
    }

    // 3. Action: LOG QUERY
    if (action === "LOG_QUERY") {
      var logId = "log_" + new Date().getTime();
      logsSheet.appendRow([
        logId,
        contents.userEmail || "anonymous",
        contents.question,
        contents.response,
        new Date().toISOString()
      ]);
      return responseJSON({ success: true, logId: logId });
    }

    return responseJSON({ success: false, message: "Invalid action." });

  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  }
  return sheet;
}

function doGet(e) {
  return ContentService.createTextOutput("corpRAG Google Apps Script Web App Engine is Live.");
}
