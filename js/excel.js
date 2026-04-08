/**
 * EXCEL.JS — Export and Import using SheetJS
 */
import appState from './state.js';

function getPHTDateString(dateIso) {
    if (!dateIso) return new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
    return new Date(dateIso).toLocaleString('en-US', { timeZone: 'Asia/Manila' });
}

export function exportToExcel() {
  // 1. Transactions Sheet
  const txns = appState.transactions.map(t => ({
    Date: getPHTDateString(t.date),
    Type: t.type === 'income' ? 'Income' : 'Expense',
    Description: t.description,
    Category: getCategoryName(t.category),
    Amount: Math.abs(t.amount)
  }));

  // 2. Categories Sheet
  const cats = appState.categories.map(c => ({
    Name: c.name,
    'Monthly Budget': c.budgeted,
    'Current Spent': c.spent
  }));

  const wb = XLSX.utils.book_new();
  const wsTxns = XLSX.utils.json_to_sheet(txns);
  const wsCats = XLSX.utils.json_to_sheet(cats);

  XLSX.utils.book_append_sheet(wb, wsTxns, "Transactions");
  XLSX.utils.book_append_sheet(wb, wsCats, "Categories");

  const timestamp = getPHTDateString(new Date()).replace(/[\/\,:]/g, '-').replace(' ', '_');
  XLSX.writeFile(wb, `ErikaTracker_Data_${timestamp}.xlsx`);
}

function getCategoryName(id) {
  if (!id) return '';
  const cat = appState.categories.find(c => c.id === id);
  return cat ? cat.name : '';
}

function getCategoryIdOrCreate(name) {
  if (!name) return null;
  const n = name.toString().trim();
  let cat = appState.categories.find(c => c.name.toLowerCase() === n.toLowerCase());
  if (!cat) {
    cat = appState.addCategory(n, 0); // Create new category with 0 budget
  }
  return cat.id;
}

export function importFromExcel(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, {type: 'array'});
    
    const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('transaction')) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);

    let importedCount = 0;

    // Use a batch array and then add them one by one
    json.forEach(row => {
      const dateRaw = row['Date'] || row['date'] || row['Timestamp'] || row['timestamp'];
      const typeRaw = row['Type'] || row['type'] || 'Expense';
      const descRaw = row['Description'] || row['description'] || row['Item'] || row['Name'] || 'Imported item';
      const catRaw = row['Category'] || row['category'] || row['Group'] || '';
      const amountRaw = row['Amount'] || row['amount'] || row['Cost'] || row['Price'] || row['Value'] || 0;

      const amount = parseFloat(amountRaw);
      if (isNaN(amount) || amount === 0) return;

      const type = typeRaw.toString().toLowerCase() === 'income' ? 'income' : 'expense';
      const categoryId = type === 'expense' ? getCategoryIdOrCreate(catRaw) : null;
      
      let dateIso = new Date().toISOString();
      if (dateRaw) {
         if (!isNaN(dateRaw) && typeof dateRaw === 'number') {
            const d = XLSX.SSF.parse_date_code(dateRaw);
            dateIso = new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S).toISOString();
         } else {
            const d = new Date(dateRaw);
            if (!isNaN(d.valueOf())) dateIso = d.toISOString();
         }
      }

      // Bypass direct addition and add via state manager
      appState.addTransaction({
        type,
        amount,
        description: descRaw.toString(),
        category: categoryId,
        date: dateIso
      });
      importedCount++;
    });

    // Notify user
    alert(`Successfully imported ${importedCount} transactions!`);
  };
  reader.readAsArrayBuffer(file);
}

export default { exportToExcel, importFromExcel };
