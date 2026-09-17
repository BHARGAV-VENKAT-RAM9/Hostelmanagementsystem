const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'data', 'database.json');

// Ensure database directory and file exist
function initializeDatabase() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let needsInit = false;
  if (!fs.existsSync(DB_FILE)) {
    needsInit = true;
  } else {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8').trim();
      if (!content) {
        needsInit = true;
      } else {
        JSON.parse(content);
      }
    } catch (e) {
      needsInit = true;
    }
  }

  if (needsInit) {
    const initialState = generateInitialState();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), 'utf8');
  }
}

// Generate the LuxeHostel initial state
function generateInitialState() {
  const rooms = {};
  const baseRates = {
    AC: 7500,
    'Non-AC': 6500
  };

  for (let floor = 1; floor <= 5; floor++) {
    for (let r = 1; r <= 10; r++) {
      const roomNum = floor * 100 + r;
      const roomId = roomNum.toString();
      
      // Initial AC configuration: Floor 4 and 5 are AC, Room 102 is AC, others are Non-AC
      let type = 'Non-AC';
      if (floor === 4 || floor === 5 || roomId === '102') {
        type = 'AC';
      }

      const beds = ['A', 'B', 'C', 'D'].map(bedLetter => ({
        id: bedLetter,
        student: null
      }));

      rooms[roomId] = {
        id: roomId,
        floor: floor,
        type: type,
        rate: baseRates[type],
        beds: beds
      };
    }
  }

  // Seed some initial students for demonstration
  // Room 102 Bed A (AC, unpaid, has coins)
  rooms['102'].beds[0].student = {
    name: 'Bhargav Sai',
    mobile: '9876543210',
    paid: false,
    coins: 120,
    checkInDate: '2026-08-01'
  };

  // Room 102 Bed B (AC, paid, has coins)
  rooms['102'].beds[1].student = {
    name: 'John Smith',
    mobile: '9123456789',
    paid: true,
    coins: 50,
    checkInDate: '2026-08-05'
  };

  // Room 205 Bed C (Non-AC, unpaid, 0 coins)
  rooms['205'].beds[2].student = {
    name: 'Emily Davis',
    mobile: '8765432109',
    paid: false,
    coins: 0,
    checkInDate: '2026-08-10'
  };

  // Room 401 Bed A (AC, paid, has coins)
  rooms['401'].beds[0].student = {
    name: 'Alex Johnson',
    mobile: '9000100020',
    paid: true,
    coins: 150,
    checkInDate: '2026-08-02'
  };

  const complaints = [
    {
      id: 'c1',
      room: '102',
      bed: 'A',
      studentName: 'Bhargav Sai',
      category: 'AC Repair',
      description: 'AC is leaking water and not cooling properly.',
      status: 'Pending',
      createdAt: '2026-08-18T10:30:00Z'
    },
    {
      id: 'c2',
      room: '205',
      bed: 'C',
      studentName: 'Emily Davis',
      category: 'Cleaning',
      description: 'Room cleaning requested since yesterday.',
      status: 'In Progress',
      createdAt: '2026-08-18T12:00:00Z'
    }
  ];

  return {
    rooms,
    baseRates,
    complaints,
    bills: []
  };
}

// Safe date parsing helper to prevent .toISOString() RangeError crashes
function safeISOString(dateStr, fallback = new Date()) {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (e) {}
  return new Date(fallback).toISOString();
}

// Read database and perform migrations
function readDb() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    let changed = false;
    
    if (!db.bills) {
      db.bills = [];
      changed = true;
    }
    
    // Check if any checked-in student is missing a bill for their check-in month
    Object.keys(db.rooms).forEach(roomId => {
      const room = db.rooms[roomId];
      room.beds.forEach(bed => {
        if (bed.student) {
          const student = bed.student;
          const checkInDate = student.checkInDate || '2026-08-01';
          const dateObj = new Date(checkInDate);
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const monthIndex = isNaN(dateObj.getTime()) ? 7 : dateObj.getMonth(); // Default to August
          const yearVal = isNaN(dateObj.getTime()) ? 2026 : dateObj.getFullYear();
          const monthStr = `${monthNames[monthIndex]} ${yearVal}`;
          
          const billExists = db.bills.some(b => b.roomId === roomId && b.bedId === bed.id && b.month === monthStr);
          if (!billExists) {
            const billId = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
            const originalRent = room.rate;
            const discount = 0;
            const amountPaid = originalRent - discount;
            
            db.bills.push({
              id: billId,
              roomId: roomId,
              bedId: bed.id,
              studentName: student.name,
              studentMobile: student.mobile,
              month: monthStr,
              amountPaid: student.paid ? amountPaid : 0,
              originalRent: originalRent,
              discountApplied: 0,
              coinsEarned: student.paid ? Math.floor(amountPaid / 1000) * 50 : 0,
              status: student.paid ? 'Paid' : 'Unpaid',
              createdAt: safeISOString(checkInDate),
              paymentDate: student.paid ? safeISOString(checkInDate) : null
            });
            changed = true;
          }
        }
      });
    });
    
    
    // Auto-generate bills for the current calendar month for all occupied beds
    const nowDate = new Date();
    const monthNamesList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthStr = `${monthNamesList[nowDate.getMonth()]} ${nowDate.getFullYear()}`;
    
    Object.keys(db.rooms).forEach(roomId => {
      const room = db.rooms[roomId];
      room.beds.forEach(bed => {
        if (bed.student) {
          const billExists = db.bills.some(b => b.roomId === roomId && b.bedId === bed.id && b.month === currentMonthStr);
          if (!billExists) {
            const billId = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
            db.bills.push({
              id: billId,
              roomId: roomId,
              bedId: bed.id,
              studentName: bed.student.name,
              studentMobile: bed.student.mobile,
              month: currentMonthStr,
              amountPaid: 0,
              originalRent: room.rate,
              discountApplied: 0,
              coinsEarned: 0,
              status: 'Unpaid',
              createdAt: new Date().toISOString(),
              paymentDate: null
            });
            
            // Reset active paid status for the new month cycle
            bed.student.paid = false;
            changed = true;
          }
        }
      });
    });

    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    }
    return db;
  } catch (err) {
    console.error('Error reading database file:', err);
    return generateInitialState();
  }
}

// Write database
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Initialize database file on startup
initializeDatabase();

// --- API Endpoints ---

// 1. GET Full State (Rooms, rates, complaints)
app.get('/api/state', (req, res) => {
  const db = readDb();
  res.json(db);
});

// 2. Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const usernameStr = String(username);
  const userLower = usernameStr.toLowerCase();
  
  if (userLower === 'admin' && password === 'admin') {
    return res.json({ role: 'admin' });
  }

  // Validate room logins. Room ID must be between 101 and 510
  const roomMatch = usernameStr.match(/^([1-5]\d{2})$/);
  if (roomMatch) {
    const roomId = roomMatch[1];
    const expectedPass = `room${roomId}pass`;
    if (password === expectedPass) {
      return res.json({ role: 'student', room: roomId });
    }
  }

  res.status(401).json({ error: 'Invalid ID or Password' });
});

// 3. Toggle AC/Non-AC for a Room (Admin only)
app.post('/api/rooms/toggle-ac', (req, res) => {
  const { roomId } = req.body;
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  const db = readDb();
  if (!db.rooms[roomId]) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const currentType = db.rooms[roomId].type;
  const newType = currentType === 'AC' ? 'Non-AC' : 'AC';
  
  db.rooms[roomId].type = newType;
  db.rooms[roomId].rate = db.baseRates[newType];
  
  writeDb(db);
  res.json({ success: true, room: db.rooms[roomId] });
});

// 4. Update Base Rates (Admin only)
app.post('/api/rooms/update-rates', (req, res) => {
  const { acRate, nonAcRate } = req.body;
  if (typeof acRate !== 'number' || typeof nonAcRate !== 'number') {
    return res.status(400).json({ error: 'Valid AC and Non-AC rates are required' });
  }

  const db = readDb();
  db.baseRates['AC'] = acRate;
  db.baseRates['Non-AC'] = nonAcRate;

  // Sync rates for all rooms that match
  Object.keys(db.rooms).forEach(id => {
    const type = db.rooms[id].type;
    db.rooms[id].rate = db.baseRates[type];
  });

  writeDb(db);
  res.json({ success: true, baseRates: db.baseRates });
});

// 5. Check in Student (Admin only)
app.post('/api/rooms/checkin', (req, res) => {
  const { roomId, bedId, studentName, studentMobile } = req.body;
  if (!roomId || !bedId || !studentName || !studentMobile) {
    return res.status(400).json({ error: 'Missing checkin details' });
  }

  const db = readDb();
  const room = db.rooms[roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const bed = room.beds.find(b => b.id === bedId);
  if (!bed) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  if (bed.student) {
    return res.status(400).json({ error: 'Bed is already occupied' });
  }

  const checkInDate = new Date().toISOString().split('T')[0];
  bed.student = {
    name: studentName,
    mobile: studentMobile,
    paid: false,
    coins: 0,
    checkInDate: checkInDate
  };

  // Generate an unpaid bill for this student for the check-in month
  const dateObj = new Date(checkInDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  
  const billId = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  
  db.bills.push({
    id: billId,
    roomId: roomId,
    bedId: bedId,
    studentName: studentName,
    studentMobile: studentMobile,
    month: monthStr,
    amountPaid: 0,
    originalRent: room.rate,
    discountApplied: 0,
    coinsEarned: 0,
    status: 'Unpaid',
    createdAt: new Date().toISOString(),
    paymentDate: null
  });

  writeDb(db);
  res.json({ success: true, room });
});

// 6. Check out Student / Vacate Bed (Admin only)
app.post('/api/rooms/checkout', (req, res) => {
  const { roomId, bedId } = req.body;
  if (!roomId || !bedId) {
    return res.status(400).json({ error: 'Room ID and Bed ID are required' });
  }

  const db = readDb();
  const room = db.rooms[roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const bed = room.beds.find(b => b.id === bedId);
  if (!bed) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  // Remove matching complaints for this bed
  db.complaints = db.complaints.filter(c => !(c.room === roomId && c.bed === bedId));

  bed.student = null;
  writeDb(db);
  res.json({ success: true, room });
});

// 7. Add Bed to a Room (Admin only)
app.post('/api/rooms/add-bed', (req, res) => {
  const { roomId } = req.body;
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  const db = readDb();
  const room = db.rooms[roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Determine next letter
  const currentBedCount = room.beds.length;
  if (currentBedCount >= 6) {
    return res.status(400).json({ error: 'Maximum 6 beds allowed per room' });
  }

  const bedLetter = String.fromCharCode(65 + currentBedCount); // A, B, C, D, E, F
  room.beds.push({
    id: bedLetter,
    student: null
  });

  writeDb(db);
  res.json({ success: true, room });
});

// 8. Delete Bed from a Room (Admin only - must be vacant)
app.post('/api/rooms/delete-bed', (req, res) => {
  const { roomId, bedId } = req.body;
  if (!roomId || !bedId) {
    return res.status(400).json({ error: 'Room ID and Bed ID are required' });
  }

  const db = readDb();
  const room = db.rooms[roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const bedIndex = room.beds.findIndex(b => b.id === bedId);
  if (bedIndex === -1) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  if (room.beds[bedIndex].student) {
    return res.status(400).json({ error: 'Cannot delete an occupied bed. Vacate it first.' });
  }

  room.beds.splice(bedIndex, 1);
  writeDb(db);
  res.json({ success: true, room });
});

// 9. Pay Rent & Generate Receipt (Student or Admin - with backward compatibility)
app.post('/api/rooms/pay-rent', (req, res) => {
  const { roomId, bedId, redeemCoins } = req.body;
  if (!roomId || !bedId) {
    return res.status(400).json({ error: 'Room ID and Bed ID are required' });
  }

  const db = readDb();
  // Find the latest unpaid bill for this room and bed
  const unpaidBill = db.bills.find(b => b.roomId === roomId && b.bedId === bedId && b.status === 'Unpaid');
  
  if (unpaidBill) {
    const room = db.rooms[roomId];
    const bed = room.beds.find(b => b.id === bedId);
    const student = bed.student;
    const originalRent = unpaidBill.originalRent;
    let discount = 0;
    
    if (redeemCoins && student.coins > 0) {
      discount = Math.min(student.coins, originalRent);
      student.coins -= discount;
    }

    const amountPaid = originalRent - discount;
    const newlyEarnedCoins = Math.floor(amountPaid / 1000) * 50;
    student.coins += newlyEarnedCoins;
    student.paid = true;

    unpaidBill.status = 'Paid';
    unpaidBill.amountPaid = amountPaid;
    unpaidBill.discountApplied = discount;
    unpaidBill.coinsEarned = newlyEarnedCoins;
    
    const now = new Date();
    unpaidBill.paymentDate = now.toISOString();
    
    writeDb(db);

    const formattedDateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const receipt = {
      hostelHeading: 'LuxeHostel Operations',
      studentName: student.name,
      timeAndDate: formattedDateTime,
      mobileNumber: student.mobile,
      roomNumber: `${roomId} (Bed ${bedId})`,
      amountPaid: `${amountPaid.toLocaleString()} INR`,
      originalRent: `${originalRent.toLocaleString()} INR`,
      discountApplied: `${discount.toLocaleString()} INR`,
      coinsEarned: newlyEarnedCoins,
      totalCoinsAvailable: student.coins,
      month: unpaidBill.month
    };

    return res.json({
      success: true,
      room,
      receipt,
      bill: unpaidBill
    });
  } else {
    // If no unpaid bill is found in history, create one dynamically to complete payment (fallback)
    const room = db.rooms[roomId];
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    const bed = room.beds.find(b => b.id === bedId);
    if (!bed || !bed.student) return res.status(404).json({ error: 'Student/bed not found' });
    
    const student = bed.student;
    const originalRent = room.rate;
    let discount = 0;
    
    if (redeemCoins && student.coins > 0) {
      discount = Math.min(student.coins, originalRent);
      student.coins -= discount;
    }

    const amountPaid = originalRent - discount;
    const newlyEarnedCoins = Math.floor(amountPaid / 1000) * 50;
    student.coins += newlyEarnedCoins;
    student.paid = true;

    // Create a paid bill record for history
    const dateObj = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    const billId = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);

    const newBill = {
      id: billId,
      roomId: roomId,
      bedId: bedId,
      studentName: student.name,
      studentMobile: student.mobile,
      month: monthStr,
      amountPaid: amountPaid,
      originalRent: originalRent,
      discountApplied: discount,
      coinsEarned: newlyEarnedCoins,
      status: 'Paid',
      createdAt: new Date().toISOString(),
      paymentDate: new Date().toISOString()
    };
    
    db.bills.push(newBill);
    writeDb(db);

    const formattedDateTime = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const receipt = {
      hostelHeading: 'LuxeHostel Operations',
      studentName: student.name,
      timeAndDate: formattedDateTime,
      mobileNumber: student.mobile,
      roomNumber: `${roomId} (Bed ${bedId})`,
      amountPaid: `${amountPaid.toLocaleString()} INR`,
      originalRent: `${originalRent.toLocaleString()} INR`,
      discountApplied: `${discount.toLocaleString()} INR`,
      coinsEarned: newlyEarnedCoins,
      totalCoinsAvailable: student.coins,
      month: monthStr
    };

    return res.json({
      success: true,
      room,
      receipt,
      bill: newBill
    });
  }
});

// 9a. GET All Bills
app.get('/api/bills', (req, res) => {
  const db = readDb();
  res.json(db.bills || []);
});

// 9b. Request to pay a specific bill (Handles full Online, full Cash, or Split)
app.post('/api/bills/request-pay', (req, res) => {
  const { billId, paymentType, onlineAmount, cashAmount, redeemCoins } = req.body;
  if (!billId || !paymentType) {
    return res.status(400).json({ error: 'Bill ID and payment type are required' });
  }

  const db = readDb();
  const bill = db.bills.find(b => b.id === billId);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  if (bill.status === 'Paid') {
    return res.status(400).json({ error: 'Bill is already paid' });
  }

  const room = db.rooms[bill.roomId];
  const bed = room ? room.beds.find(b => b.id === bill.bedId) : null;
  if (!bed || !bed.student) {
    return res.status(404).json({ error: 'Student/bed not found for this bill' });
  }

  const student = bed.student;
  const originalRent = bill.originalRent;

  // Process coin discount if any
  let discount = 0;
  if (redeemCoins && student.coins > 0) {
    discount = Math.min(student.coins, originalRent);
  }

  const totalDue = originalRent - discount;

  if (paymentType === 'Online') {
    // Online payments are instantly finalized and marked 'Paid'
    if (redeemCoins) {
      student.coins -= discount;
    }
    const newlyEarned = Math.floor(totalDue / 1000) * 50;
    student.coins += newlyEarned;
    student.paid = true;

    bill.status = 'Paid';
    bill.paymentType = 'Online';
    bill.amountPaid = totalDue;
    bill.discountApplied = discount;
    bill.coinsEarned = newlyEarned;
    bill.onlineAmount = totalDue;
    bill.cashAmount = 0;
    
    const now = new Date();
    bill.paymentDate = now.toISOString();
    
    writeDb(db);

    const formattedDateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const receipt = {
      hostelHeading: 'LuxeHostel Operations',
      studentName: student.name,
      timeAndDate: formattedDateTime,
      mobileNumber: student.mobile,
      roomNumber: `${bill.roomId} (Bed ${bill.bedId})`,
      amountPaid: `${totalDue.toLocaleString()} INR`,
      originalRent: `${originalRent.toLocaleString()} INR`,
      discountApplied: `${discount.toLocaleString()} INR`,
      coinsEarned: newlyEarned,
      totalCoinsAvailable: student.coins,
      month: bill.month,
      paymentType: 'Online'
    };

    return res.json({ success: true, status: 'Paid', receipt, bill, room });
  } 
  
  if (paymentType === 'Cash') {
    // Cash payments go into a pending approval state
    bill.status = 'Pending Cash';
    bill.paymentType = 'Cash';
    bill.discountApplied = discount;
    bill.amountPaid = totalDue;
    bill.onlineAmount = 0;
    bill.cashAmount = totalDue;
    bill.coinsRedeemed = redeemCoins; // store so we apply on approval

    writeDb(db);
    return res.json({ success: true, status: 'Pending Cash', bill, room });
  }

  if (paymentType === 'Split') {
    // Split payments show part paid online, part pending cash approval
    const inputOnline = Number(onlineAmount || 0);
    const inputCash = Number(cashAmount || 0);

    if (Math.abs((inputOnline + inputCash) - totalDue) > 1) {
      return res.status(400).json({ error: `Online amount (${inputOnline}) + Cash amount (${inputCash}) must equal net total due (${totalDue})` });
    }

    bill.status = 'Pending Split';
    bill.paymentType = 'Split';
    bill.discountApplied = discount;
    bill.amountPaid = totalDue;
    bill.onlineAmount = inputOnline;
    bill.cashAmount = inputCash;
    bill.coinsRedeemed = redeemCoins; // store so we apply on approval

    writeDb(db);
    return res.json({ success: true, status: 'Pending Split', bill, room });
  }

  res.status(400).json({ error: 'Invalid payment type' });
});

// 9c. Approve a pending Cash or Split payment (Admin only)
app.post('/api/bills/approve-pay', (req, res) => {
  const { billId } = req.body;
  if (!billId) {
    return res.status(400).json({ error: 'Bill ID is required' });
  }

  const db = readDb();
  const bill = db.bills.find(b => b.id === billId);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  if (bill.status !== 'Pending Cash' && bill.status !== 'Pending Split') {
    return res.status(400).json({ error: 'Bill is not pending admin cash approval' });
  }

  const room = db.rooms[bill.roomId];
  const bed = room ? room.beds.find(b => b.id === bill.bedId) : null;
  if (!bed || !bed.student) {
    return res.status(404).json({ error: 'Student/bed not found for this bill' });
  }

  const student = bed.student;
  const originalRent = bill.originalRent;
  const discount = bill.discountApplied || 0;
  const amountPaid = bill.amountPaid;

  // Deduct coins if they were redeemed
  if (bill.coinsRedeemed && student.coins > 0) {
    student.coins = Math.max(0, student.coins - discount);
  }

  // Award reward coins based on total amount paid (online + cash)
  const newlyEarned = Math.floor(amountPaid / 1000) * 50;
  student.coins += newlyEarned;
  student.paid = true;

  // Finalize bill fields
  bill.status = 'Paid';
  bill.coinsEarned = newlyEarned;
  
  const now = new Date();
  bill.paymentDate = now.toISOString();
  
  writeDb(db);

  const formattedDateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const receipt = {
    hostelHeading: 'LuxeHostel Operations',
    studentName: student.name,
    timeAndDate: formattedDateTime,
    mobileNumber: student.mobile,
    roomNumber: `${bill.roomId} (Bed ${bill.bedId})`,
    amountPaid: `${amountPaid.toLocaleString()} INR`,
    originalRent: `${originalRent.toLocaleString()} INR`,
    discountApplied: `${discount.toLocaleString()} INR`,
    coinsEarned: newlyEarned,
    totalCoinsAvailable: student.coins,
    month: bill.month,
    paymentType: bill.paymentType === 'Split' ? 'Split (Online + Cash)' : 'Cash'
  };

  res.json({ success: true, bill, receipt, room });
});

// 9d. Direct manual payment of a specific bill (Admin Direct Cash Collection)
app.post('/api/bills/pay', (req, res) => {
  const { billId, redeemCoins } = req.body;
  if (!billId) {
    return res.status(400).json({ error: 'Bill ID is required' });
  }

  const db = readDb();
  const bill = db.bills.find(b => b.id === billId);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  if (bill.status === 'Paid') {
    return res.status(400).json({ error: 'Bill is already paid' });
  }

  const room = db.rooms[bill.roomId];
  const bed = room ? room.beds.find(b => b.id === bill.bedId) : null;
  if (!bed || !bed.student) {
    return res.status(404).json({ error: 'Student/bed not found for this bill' });
  }

  const student = bed.student;
  const originalRent = bill.originalRent;
  let discount = 0;

  if (redeemCoins && student.coins > 0) {
    discount = Math.min(student.coins, originalRent);
    student.coins = Math.max(0, student.coins - discount);
  }

  const amountPaid = originalRent - discount;
  const newlyEarned = Math.floor(amountPaid / 1000) * 50;
  student.coins += newlyEarned;
  student.paid = true;

  bill.status = 'Paid';
  bill.paymentType = 'Cash';
  bill.amountPaid = amountPaid;
  bill.discountApplied = discount;
  bill.coinsEarned = newlyEarned;
  
  const now = new Date();
  bill.paymentDate = now.toISOString();

  writeDb(db);

  const formattedDateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const receipt = {
    hostelHeading: 'LuxeHostel Operations',
    studentName: student.name,
    timeAndDate: formattedDateTime,
    mobileNumber: student.mobile,
    roomNumber: `${bill.roomId} (Bed ${bill.bedId})`,
    amountPaid: `${amountPaid.toLocaleString()} INR`,
    originalRent: `${originalRent.toLocaleString()} INR`,
    discountApplied: `${discount.toLocaleString()} INR`,
    coinsEarned: newlyEarned,
    totalCoinsAvailable: student.coins,
    month: bill.month,
    paymentType: 'Cash'
  };

  res.json({ success: true, bill, receipt, room });
});

// 9c. Generate monthly bills for all occupied beds (Admin only)
app.post('/api/bills/generate', (req, res) => {
  const { month } = req.body;
  if (!month) {
    return res.status(400).json({ error: 'Month parameter is required (e.g. "September 2026")' });
  }

  const db = readDb();
  let generatedCount = 0;

  Object.keys(db.rooms).forEach(roomId => {
    const room = db.rooms[roomId];
    room.beds.forEach(bed => {
      if (bed.student) {
        const billExists = db.bills.some(b => b.roomId === roomId && b.bedId === bed.id && b.month === month);
        if (!billExists) {
          const billId = 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
          db.bills.push({
            id: billId,
            roomId: roomId,
            bedId: bed.id,
            studentName: bed.student.name,
            studentMobile: bed.student.mobile,
            month: month,
            amountPaid: 0,
            originalRent: room.rate,
            discountApplied: 0,
            coinsEarned: 0,
            status: 'Unpaid',
            createdAt: new Date().toISOString(),
            paymentDate: null
          });
          
          bed.student.paid = false;
          generatedCount++;
        }
      }
    });
  });

  if (generatedCount > 0) {
    writeDb(db);
  }

  res.json({ success: true, generatedCount, message: `Successfully generated ${generatedCount} bills for ${month}.` });
});

// 10. File a Complaint
app.post('/api/complaints', (req, res) => {
  const { roomId, bedId, studentName, category, description } = req.body;
  if (!roomId || !bedId || !studentName || !category || !description) {
    return res.status(400).json({ error: 'Missing complaint fields' });
  }

  const db = readDb();
  const newComplaint = {
    id: 'c' + Date.now().toString(36),
    room: roomId,
    bed: bedId,
    studentName,
    category,
    description,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  db.complaints.push(newComplaint);
  writeDb(db);
  res.json({ success: true, complaint: newComplaint });
});

// 11. Update Complaint Status (Admin only)
app.post('/api/complaints/status', (req, res) => {
  const { complaintId, status } = req.body;
  if (!complaintId || !status) {
    return res.status(400).json({ error: 'Complaint ID and status are required' });
  }

  const db = readDb();
  const complaint = db.complaints.find(c => c.id === complaintId);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  complaint.status = status;
  writeDb(db);
  res.json({ success: true, complaints: db.complaints });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
