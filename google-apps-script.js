// Google Apps Script to handle receipt data and save to Google Sheets
// Deploy this as a web app to get the URL for your React app

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet (you'll need to create this)
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Prepare the row data
    const rowData = [
      data.date,
      data.totalCharge,
      data.company,
      data.name,
      data.phone,
      data.email,
      data.address,
      data.additionalService,
      data.vehicles.length,
      JSON.stringify(data.vehicles) // Store vehicle details as JSON
    ];
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Data saved successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to set up the spreadsheet headers (run this once)
function setupHeaders() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  
  const headers = [
    'Date',
    'Total Charge',
    'Company',
    'Name',
    'Phone',
    'Email',
    'Address',
    'Additional Service',
    'Number of Vehicles',
    'Vehicle Details'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
} 