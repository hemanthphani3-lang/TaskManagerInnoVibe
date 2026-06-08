const fs = require('fs');
const XLSX = require('xlsx');

const filePath = 'C:\\Users\\SRI VARUN TEJ\\Downloads\\InnoVibe Mobility Employees Master Data May 2026.xlsx';

function readExcel() {
  if (!fs.existsSync(filePath)) {
    console.error("File does not exist at:", filePath);
    return;
  }
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Sheet2'];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`Sheet2 Total rows: ${data.length}`);
  data.forEach((row, i) => {
    console.log(`${i+1}: Name: ${row['Full Name']} | Email: ${row['Email ID']} | Dept: ${row['Department']} | Role: ${row['Role/Designation']} | Access: ${row['Access Level (Admin / Manager / Employee etc.)']} | EmpID: ${row['Employee ID (if available)']}`);
  });
}

readExcel();
