import * as XLSX from 'xlsx';

/**
 * Universal function to export an array of objects to an Excel file
 * @param data Array of objects to export
 * @param filename Name of the file without extension
 * @param sheetName Name of the sheet
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('Нет данных для выгрузки');
    return;
  }

  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert the array of objects to a worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
