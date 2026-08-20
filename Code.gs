/**
 * ============================================================================
 * corpRAG - Google Apps Script Web App Backend Database
 * ============================================================================
 */

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Sheets
    var usersSheet = getOrCreateSheet(ss, "Users", ["ID", "Name", "Email", "HashedPassword", "CreatedAt"]);
    var logsSheet = getOrCreateSheet(ss, "QueryLogs", ["ID", "UserEmail", "Question", "Response", "Timestamp"]);
    var otpSheet = getOrCreateSheet(ss, "OTPCodes", ["Email", "OTP", "ExpiresAt"]);

    // 1. SIGNUP USER
    if (action === "SIGNUP") {
      var email = contents.email.toLowerCase().trim();
      var usersData = usersSheet.getDataRange().getValues();
      for (var i = 1; i < usersData.length; i++) {
        if (usersData[i][2] === email) {
          return responseJSON({ success: false, message: "User already exists." });
        }
      }
      var userId = "user_" + new Date().getTime();
      usersSheet.appendRow([userId, contents.name, email, contents.hashedPassword, new Date().toISOString()]);
      return responseJSON({ success: true, user: { id: userId, name: contents.name, email: email } });
    }

    // 2. GET USER BY EMAIL
    if (action === "GET_USER") {
      var email = contents.email.toLowerCase().trim();
      var usersData = usersSheet.getDataRange().getValues();
      for (var i = 1; i < usersData.length; i++) {
        if (usersData[i][2] === email) {
          return responseJSON({
            success: true,
            user: { id: usersData[i][0], name: usersData[i][1], email: usersData[i][2], hashedPassword: usersData[i][3] }
          });
        }
      }
      return responseJSON({ success: false, message: "User not found." });
    }

    // 3. STORE OTP
    if (action === "STORE_OTP") {
      var email = contents.email.toLowerCase().trim();
      var otp = contents.otp;
      var expiresAt = contents.expiresAt;
      
      // Clear existing OTP for this email
      var otpData = otpSheet.getDataRange().getValues();
      for (var i = otpData.length - 1; i >= 1; i--) {
        if (otpData[i][0] === email) {
          otpSheet.deleteRow(i + 1);
        }
      }
      otpSheet.appendRow([email, otp, expiresAt]);
      return responseJSON({ success: true });
    }

    // 4. VERIFY OTP & RESET PASSWORD
    if (action === "VERIFY_RESET_PASSWORD") {
      var email = contents.email.toLowerCase().trim();
      var inputOtp = contents.otp;
      var newHashedPassword = contents.newHashedPassword;

      var otpData = otpSheet.getDataRange().getValues();
      var validOtp = false;

      for (var i = 1; i < otpData.length; i++) {
        if (otpData[i][0] === email && String(otpData[i][1]) === String(inputOtp)) {
          var exp = new Date(otpData[i][2]).getTime();
          if (new Date().getTime() < exp) {
            validOtp = true;
          }
          break;
        }
      }

      if (!validOtp) {
        return responseJSON({ success: false, message: "Invalid or expired OTP." });
      }

      // Update Password in Users Sheet
      var usersData = usersSheet.getDataRange().getValues();
      var updated = false;
      for (var j = 1; j < usersData.length; j++) {
        if (usersData[j][2] === email) {
          usersSheet.getRange(j + 1, 4).setValue(newHashedPassword);
          updated = true;
          break;
        }
      }

      return responseJSON({ success: updated, message: updated ? "Password reset successfully!" : "User not found." });
    }

    // 5. LOG PRIVATIZED QUERY
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
  return ContentService.createTextOutput("corpRAG Apps Script Database Engine Live.");
}
