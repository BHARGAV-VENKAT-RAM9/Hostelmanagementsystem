import React, { useState } from 'react';
import { 
  Layers, 
  Settings, 
  MessageSquare, 
  Users, 
  DollarSign, 
  Plus, 
  Trash2, 
  UserCheck, 
  UserX, 
  Sparkles,
  CreditCard,
  TrendingUp,
  FileText,
  Calendar,
  Search,
  CheckCircle,
  Printer,
  X
} from 'lucide-react';

export default function AdminDashboard({ state, onRefresh }) {
  const { rooms, baseRates, complaints, bills = [] } = state;

  // Tabs for subpages
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'complaints' | 'settings' | 'bills'

  // Admin Rate settings form
  const [acRate, setAcRate] = useState(baseRates.AC);
  const [nonAcRate, setNonAcRate] = useState(baseRates['Non-AC']);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Checkin form overlay
  const [checkinBed, setCheckinBed] = useState(null); // { roomId, bedId }
  const [studentName, setStudentName] = useState('');
  const [studentMobile, setStudentMobile] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);

  // Search/Filter for rooms
  const [floorFilter, setFloorFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchRoom, setSearchRoom] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Billing Filters
  const [billSearch, setBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState('All');
  const [billMonthFilter, setBillMonthFilter] = useState('All');
  
  // Generate Bills Modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [genMonth, setGenMonth] = useState(() => {
    const nextDate = new Date();
    // Default to next month
    nextDate.setMonth(nextDate.getMonth() + 1);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${monthNames[nextDate.getMonth()]} ${nextDate.getFullYear()}`;
  });
  const [genLoading, setGenLoading] = useState(false);
  const [billingMsg, setBillingMsg] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [expandedRooms, setExpandedRooms] = useState({});

  const toggleRoomExpand = (month, roomId) => {
    const key = `${month}_${roomId}`;
    setExpandedRooms(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 1. Calculate general stats
  const getTotalOccupancy = () => {
    let total = 0;
    let occupied = 0;
    Object.values(rooms).forEach(room => {
      total += room.beds.length;
      room.beds.forEach(bed => {
        if (bed.student) occupied++;
      });
    });
    return { total, occupied, percent: total > 0 ? Math.round((occupied / total) * 100) : 0 };
  };

  const stats = getTotalOccupancy();
  const pendingComplaintsCount = complaints.filter(c => c.status !== 'Resolved').length;

  const getCollectedRevenue = () => {
    let rev = 0;
    // Calculate total from Paid bills
    bills.forEach(bill => {
      if (bill.status === 'Paid') {
        rev += bill.amountPaid;
      }
    });
    return rev;
  };
  const revenue = getCollectedRevenue();

  // 2. Toggle AC
  const handleToggleAc = async (roomId) => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms/toggle-ac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });
      if (!response.ok) throw new Error('Toggle AC failed');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. Update global rates
  const handleUpdateRates = async (e) => {
    e.preventDefault();
    setSettingsMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/rooms/update-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acRate: Number(acRate), nonAcRate: Number(nonAcRate) })
      });
      if (!response.ok) throw new Error('Failed to update rates');
      setSettingsMsg('Rates updated successfully for all rooms!');
      onRefresh();
    } catch (err) {
      setSettingsMsg('Error: ' + err.message);
    }
  };

  // 4. Checkin handler
  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!studentName || !studentMobile || !checkinBed) return;

    setCheckinLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/rooms/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: checkinBed.roomId,
          bedId: checkinBed.bedId,
          studentName,
          studentMobile
        })
      });

      if (!response.ok) throw new Error('Check-in failed');
      
      setCheckinBed(null);
      setStudentName('');
      setStudentMobile('');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckinLoading(false);
    }
  };

  // 5. Checkout/Vacate handler
  const handleCheckout = (roomId, bedId) => {
    setConfirmAction({
      type: 'vacate',
      roomId,
      bedId,
      title: 'Vacate Bed Assignment',
      message: `Are you sure you want to vacate Room ${roomId} Bed ${bedId}? This will vacate the student. Unpaid bills will remain but the bed will become vacant.`,
      onConfirm: async () => {
        try {
          const response = await fetch('http://localhost:5000/api/rooms/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, bedId })
          });
          if (!response.ok) throw new Error('Checkout failed');
          onRefresh();
        } catch (err) {
          alert(err.message);
        }
      }
    });
  };

  // 6. Manual Cash Rent payment Override for Bed
  const handleOverridePayment = async (roomId, bedId) => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms/pay-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, bedId, redeemCoins: false })
      });
      if (!response.ok) throw new Error('Payment override failed');
      
      const data = await response.json();
      setActiveReceipt(data.receipt);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // 6b. Manual Cash payment for Specific Bill ID
  const handlePayBillDirect = async (billId) => {
    try {
      const response = await fetch('http://localhost:5000/api/bills/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, redeemCoins: false })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment failed');
      setActiveReceipt(data.receipt);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // 6c. Approve pending cash or split payment
  const handleApprovePayment = async (billId) => {
    try {
      const response = await fetch('http://localhost:5000/api/bills/approve-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Approval failed');
      setActiveReceipt(data.receipt);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // 7. Add Bed
  const handleAddBed = async (roomId) => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms/add-bed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add bed');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // 8. Delete Bed
  const handleDeleteBed = (roomId, bedId) => {
    setConfirmAction({
      type: 'delete-bed',
      roomId,
      bedId,
      title: 'Remove Bed from Room',
      message: `Are you sure you want to remove Bed ${bedId} from Room ${roomId}?`,
      onConfirm: async () => {
        try {
          const response = await fetch('http://localhost:5000/api/rooms/delete-bed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, bedId })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to delete bed');
          onRefresh();
        } catch (err) {
          alert(err.message);
        }
      }
    });
  };

  // 9. Update Complaint Status
  const handleUpdateComplaintStatus = async (complaintId, newStatus) => {
    try {
      const response = await fetch('http://localhost:5000/api/complaints/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId, status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update complaint status');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // 10. Generate Monthly Cycle handler
  const handleGenerateCycle = async (e) => {
    e.preventDefault();
    if (!genMonth.trim()) return;

    setGenLoading(true);
    setBillingMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/bills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: genMonth })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate bills');
      
      setBillingMsg(data.message);
      setShowGenModal(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setGenLoading(false);
    }
  };

  // Filtered rooms logic
  const filteredRooms = Object.values(rooms)
    .filter(room => {
      const matchFloor = floorFilter === 'All' ? true : room.floor.toString() === floorFilter;
      const matchType = typeFilter === 'All' ? true : room.type === typeFilter;
      const matchSearch = searchRoom === '' ? true : room.id.includes(searchRoom);
      return matchFloor && matchType && matchSearch;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  // Dynamic Month List for Billing Filter
  const uniqueMonths = Array.from(new Set(bills.map(b => b.month)));

  // Filtered Bills logic
  const filteredBills = bills.filter(bill => {
    const matchStatus = billStatusFilter === 'All' ? true : bill.status === billStatusFilter;
    const matchMonth = billMonthFilter === 'All' ? true : bill.month === billMonthFilter;
    const matchSearch = billSearch.trim() === '' ? true : (
      bill.studentName.toLowerCase().includes(billSearch.toLowerCase()) ||
      bill.studentMobile.includes(billSearch) ||
      bill.roomId.includes(billSearch)
    );
    return matchStatus && matchMonth && matchSearch;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pendingApprovals = bills.filter(b => b.status === 'Pending Cash' || b.status === 'Pending Split');

  const getGroupedBills = () => {
    const groups = {};
    filteredBills.forEach(bill => {
      if (!groups[bill.month]) {
        groups[bill.month] = [];
      }
      groups[bill.month].push(bill);
    });
    return groups;
  };
  const groupedBills = getGroupedBills();

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '0 16px 48px 16px', maxWidth: '1280px', margin: '0 auto' }}>
      


      {/* Tabs Switcher */}
      <div className="glass-panel" style={{
        display: 'flex',
        gap: '6px',
        padding: '6px',
        marginBottom: '24px',
        maxWidth: '640px'
      }}>
        <button 
          className="btn" 
          onClick={() => setActiveTab('rooms')}
          style={{
            flex: 1,
            background: activeTab === 'rooms' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'rooms' ? '#020617' : 'white',
            border: 'none',
            padding: '10px 8px',
            fontSize: '0.85rem'
          }}
        >
          <Layers size={14} />
          Rooms
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('bills')}
          style={{
            flex: 1,
            background: activeTab === 'bills' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'bills' ? '#020617' : 'white',
            border: 'none',
            padding: '10px 8px',
            fontSize: '0.85rem'
          }}
        >
          <CreditCard size={14} />
          Billing System
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('complaints')}
          style={{
            flex: 1,
            background: activeTab === 'complaints' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'complaints' ? '#020617' : 'white',
            border: 'none',
            padding: '10px 8px',
            fontSize: '0.85rem'
          }}
        >
          <MessageSquare size={14} />
          Complaints
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            background: activeTab === 'settings' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'settings' ? '#020617' : 'white',
            border: 'none',
            padding: '10px 8px',
            fontSize: '0.85rem'
          }}
        >
          <Settings size={14} />
          More
        </button>
      </div>

      {/* TAB CONTENTS */}

      {/* Tab: Rooms list */}
      {activeTab === 'rooms' && (
        <div>
          {/* Filters Bar */}
          <div className="glass-panel" style={{
            padding: '16px 24px',
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Search Room Number..."
                value={searchRoom}
                onChange={(e) => setSearchRoom(e.target.value)}
              />
            </div>
            <div>
              <select className="select" value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
                <option value="All">All Floors</option>
                <option value="1">Floor 1</option>
                <option value="2">Floor 2</option>
                <option value="3">Floor 3</option>
                <option value="4">Floor 4</option>
                <option value="5">Floor 5</option>
              </select>
            </div>
            <div>
              <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="All">All Room Types</option>
                <option value="AC">AC Room</option>
                <option value="Non-AC">Non-AC Room</option>
              </select>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-text)', marginLeft: 'auto' }}>
              Showing {filteredRooms.length} Rooms
            </span>
          </div>

          {/* Rooms Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredRooms.map(room => {
              const occupiedCount = room.beds.filter(b => b.student !== null).length;

              return (
                <div key={room.id} className="glass-panel" style={{ padding: '24px' }}>
                  
                  {/* Room metadata */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '14px',
                    marginBottom: '16px',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>
                        Room {room.id}
                      </span>
                      <span className={`badge ${room.type === 'AC' ? 'badge-ac' : 'badge-nonac'}`}>
                        {room.type}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-muted-text)' }}>
                        Rent: <span style={{ color: 'white', fontWeight: '600' }}>{room.rate.toLocaleString()} INR</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleToggleAc(room.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        <Sparkles size={12} />
                        Convert to {room.type === 'AC' ? 'Non-AC' : 'AC'}
                      </button>
                      <button 
                        onClick={() => handleAddBed(room.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        disabled={room.beds.length >= 6}
                      >
                        <Plus size={12} />
                        Add Bed ({room.beds.length}/6)
                      </button>
                    </div>
                  </div>

                  {/* Bed grid inside this room */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '16px'
                  }}>
                    {room.beds.map(bed => {
                      const isOccupied = bed.student !== null;

                      return (
                        <div 
                           key={bed.id} 
                           className="glass-panel" 
                           style={{
                             padding: '16px',
                             background: isOccupied ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.001)',
                             border: isOccupied ? '1px solid rgba(255,255,255,0.08)' : '1px dashed var(--color-border)'
                           }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <span style={{ fontWeight: '700', fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>
                              Bed {bed.id}
                            </span>
                            {isOccupied ? (
                              <span className={`badge ${bed.student.paid ? 'badge-paid' : 'badge-unpaid'}`} style={{ fontSize: '0.7rem' }}>
                                {bed.student.paid ? 'Paid' : 'Unpaid'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-text)' }}>Vacant</span>
                            )}
                          </div>

                          {isOccupied ? (
                            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ color: 'white', fontWeight: '500' }}>{bed.student.name}</div>
                              <div style={{ color: 'var(--color-muted-text)' }}>Mobile: {bed.student.mobile}</div>
                              <div style={{ color: 'var(--color-muted-text)' }}>Coins: <span style={{ color: 'var(--color-accent)', fontWeight: '600' }}>{bed.student.coins}</span></div>
                              
                              <div style={{
                                marginTop: '10px',
                                display: 'flex',
                                gap: '6px',
                                borderTop: '1px solid var(--color-border)',
                                paddingTop: '10px'
                              }}>
                                {!bed.student.paid && (
                                  <button 
                                    onClick={() => handleOverridePayment(room.id, bed.id)}
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.7rem' }}
                                    title="Mark as Paid cash"
                                  >
                                    <CreditCard size={10} />
                                    Paid cash
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleCheckout(room.id, bed.id)}
                                  className="btn btn-destructive"
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.7rem' }}
                                >
                                  <UserX size={10} />
                                  Vacate
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                              <button 
                                onClick={() => setCheckinBed({ roomId: room.id, bedId: bed.id })}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                              >
                                <UserCheck size={12} />
                                Check In Student
                              </button>
                              <button 
                                onClick={() => handleDeleteBed(room.id, bed.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-destructive)',
                                  cursor: 'pointer',
                                  marginTop: '8px',
                                  fontSize: '0.7rem'
                                }}
                                disabled={room.beds.length <= 4}
                              >
                                Delete Bed
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Bills System */}
      {activeTab === 'bills' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '12px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                Billing Cycle Records
              </h3>
            </div>
          </div>

          {/* Cash Approval Queue */}
          {pendingApprovals.length > 0 && (
            <div className="glass-panel animate-in" style={{
              padding: '20px',
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h4 style={{
                fontSize: '0.9rem',
                color: '#F59E0B',
                fontFamily: 'var(--font-heading)',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#F59E0B',
                  boxShadow: '0 0 8px #F59E0B'
                }}></span>
                Pending Cash & Split Approvals ({pendingApprovals.length})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingApprovals.map(bill => {
                  const isSplit = bill.status === 'Pending Split';
                  return (
                    <div key={bill.id} className="glass-panel" style={{
                      padding: '14px 18px',
                      background: 'rgba(15, 23, 42, 0.4)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem' }}>
                          Room {bill.roomId} (Bed {bill.bedId}) — {bill.studentName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-text)', marginTop: '4px' }}>
                          Month: {bill.month} | Mode: {isSplit ? 'Split (Cash + Online)' : 'Full Cash'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#F59E0B', marginTop: '4px', fontWeight: '500' }}>
                          {isSplit 
                            ? `Online Paid: ${bill.onlineAmount.toLocaleString()} INR | Cash to Collect: ${bill.cashAmount.toLocaleString()} INR` 
                            : `Cash to Collect: ${bill.cashAmount.toLocaleString()} INR`
                          }
                        </div>
                      </div>

                      <button 
                        onClick={() => handleApprovePayment(bill.id)}
                        className="btn btn-primary"
                        style={{
                          background: '#F59E0B',
                          borderColor: '#F59E0B',
                          color: '#020617',
                          fontSize: '0.8rem',
                          padding: '8px 14px'
                        }}
                      >
                        <CheckCircle size={14} />
                        Approve Collection
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters Row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted-text)' }}>
                <Search size={14} />
              </span>
              <input 
                type="text" 
                className="input" 
                placeholder="Search Room, Student Name or Mobile..."
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
              />
            </div>
            
            <div>
              <select 
                className="select" 
                value={billStatusFilter} 
                onChange={(e) => setBillStatusFilter(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <select 
                className="select" 
                value={billMonthFilter} 
                onChange={(e) => setBillMonthFilter(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="All">All Months</option>
                {uniqueMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bills Table */}
          {Object.keys(groupedBills).length === 0 ? (
            <p style={{
              color: 'var(--color-muted-text)',
              fontSize: '0.9rem',
              textAlign: 'center',
              padding: '60px 0',
              fontStyle: 'italic'
            }}>
              No billing records matched your filters.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {Object.keys(groupedBills)
                .sort((a, b) => {
                  const parseMonthYear = (str) => {
                    const parts = str.split(' ');
                    const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    return { year: parseInt(parts[1]), month: mNames.indexOf(parts[0]) };
                  };
                  const aVal = parseMonthYear(a);
                  const bVal = parseMonthYear(b);
                  if (aVal.year !== bVal.year) return bVal.year - aVal.year;
                  return bVal.month - aVal.month;
                })
                .map(month => {
                  const monthBills = groupedBills[month];
                  const total = monthBills.length;
                  const paid = monthBills.filter(b => b.status === 'Paid').length;
                  const unpaid = monthBills.filter(b => b.status === 'Unpaid').length;
                  const pending = monthBills.filter(b => b.status.startsWith('Pending')).length;
                  const revenue = monthBills.reduce((acc, b) => b.status === 'Paid' ? acc + b.amountPaid : acc, 0);

                  return (
                    <div key={month} className="glass-panel animate-in" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.35)' }}>
                      {/* Month Header Banner */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        borderBottom: '1px solid var(--color-border)',
                        paddingBottom: '12px',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', fontFamily: 'var(--font-heading)' }}>
                            {month.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-text)' }}>
                            ({total} Invoice{total > 1 ? 's' : ''})
                          </span>
                        </div>

                        {/* Mini Month Stats Grid */}
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--color-accent)' }}>
                            Paid: <strong>{paid}</strong> (₹{revenue.toLocaleString()})
                          </span>
                          {pending > 0 && (
                            <span style={{ color: '#F59E0B' }}>
                              Pending: <strong>{pending}</strong>
                            </span>
                          )}
                          <span style={{ color: 'var(--color-destructive)' }}>
                            Unpaid: <strong>{unpaid}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Room Groupings Accordion */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        {(() => {
                          const roomGrouped = {};
                          monthBills.forEach(bill => {
                            if (!roomGrouped[bill.roomId]) {
                              roomGrouped[bill.roomId] = [];
                            }
                            roomGrouped[bill.roomId].push(bill);
                          });

                          return Object.keys(roomGrouped)
                            .sort((a, b) => a.localeCompare(b))
                            .map(roomId => {
                              const roomBills = roomGrouped[roomId];
                              const isExpanded = !!expandedRooms[`${month}_${roomId}`];
                              const totalRoomBills = roomBills.length;
                              const paidRoomBills = roomBills.filter(b => b.status === 'Paid').length;
                              const pendingRoomBills = roomBills.filter(b => b.status.startsWith('Pending')).length;
                              const unpaidRoomBills = roomBills.filter(b => b.status === 'Unpaid').length;

                              // Calculate borders and glowing shadows based on payment statuses inside room
                              let roomStatusColor = 'rgba(239, 68, 68, 0.3)'; // Default: red/unpaid
                              if (unpaidRoomBills === 0 && pendingRoomBills === 0 && paidRoomBills > 0) {
                                roomStatusColor = 'rgba(16, 185, 129, 0.4)'; // All paid: green
                              } else if (pendingRoomBills > 0) {
                                roomStatusColor = 'rgba(245, 158, 11, 0.4)'; // Pending: gold
                              }

                              return (
                                <div key={roomId} style={{
                                  border: '1px solid var(--color-border)',
                                  borderLeft: `4px solid ${roomStatusColor}`,
                                  borderRadius: '10px',
                                  background: 'rgba(15, 23, 42, 0.2)',
                                  overflow: 'hidden',
                                  transition: 'all 0.3s ease',
                                  boxShadow: isExpanded ? `0 4px 20px -2px ${roomStatusColor}` : 'none',
                                  marginBottom: '8px'
                                }}>
                                  {/* Accordion Header */}
                                  <div 
                                    onClick={() => toggleRoomExpand(month, roomId)}
                                    style={{
                                      padding: '14px 20px',
                                      background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      userSelect: 'none',
                                      transition: 'background 0.2s ease'
                                    }}
                                    className="hover-card-header"
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ 
                                        fontWeight: '700', 
                                        fontSize: '0.9rem', 
                                        color: 'white', 
                                        fontFamily: 'var(--font-heading)',
                                        letterSpacing: '0.5px'
                                      }}>
                                        Room {roomId}
                                      </span>
                                      <span style={{ 
                                        fontSize: '0.7rem', 
                                        color: 'var(--color-muted-text)',
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '2px 8px',
                                        borderRadius: '12px'
                                      }}>
                                        {totalRoomBills} Occupant{totalRoomBills > 1 ? 's' : ''}
                                      </span>
                                    </div>

                                    {/* Room Badges Summary */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', fontWeight: '500' }}>
                                        {paidRoomBills > 0 && (
                                          <span style={{ 
                                            color: '#10B981', 
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                          }}>
                                            {paidRoomBills} Paid
                                          </span>
                                        )}
                                        {pendingRoomBills > 0 && (
                                          <span style={{ 
                                            color: '#F59E0B', 
                                            background: 'rgba(245, 158, 11, 0.08)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                          }}>
                                            {pendingRoomBills} Pending
                                          </span>
                                        )}
                                        {unpaidRoomBills > 0 && (
                                          <span style={{ 
                                            color: '#EF4444', 
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                          }}>
                                            {unpaidRoomBills} Unpaid
                                          </span>
                                        )}
                                      </div>
                                      <span style={{ 
                                        fontSize: '0.75rem', 
                                        color: 'var(--color-muted-text)',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease',
                                        display: 'inline-block'
                                      }}>
                                        ▼
                                      </span>
                                    </div>
                                  </div>

                                  {/* Accordion Content Table */}
                                  {isExpanded && (
                                    <div style={{ 
                                      padding: '16px 20px', 
                                      borderTop: '1px solid var(--color-border)', 
                                      background: 'rgba(5, 8, 22, 0.4)' 
                                    }}>
                                      <div style={{ overflowX: 'auto' }}>
                                        <table style={{
                                          width: '100%',
                                          borderCollapse: 'collapse',
                                          fontSize: '0.8rem',
                                          textAlign: 'left'
                                        }}>
                                          <thead>
                                            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted-text)' }}>
                                              <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bed</th>
                                              <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resident Details</th>
                                              <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Original Rent</th>
                                              <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount Paid</th>
                                              <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {roomBills.map(bill => (
                                              <tr key={bill.id} style={{ 
                                                borderBottom: '1px dashed rgba(255,255,255,0.03)',
                                                transition: 'background 0.2s ease'
                                              }}>
                                                <td style={{ padding: '12px 10px', fontWeight: '700', color: 'white' }}>Bed {bill.bedId}</td>
                                                <td style={{ padding: '12px 10px' }}>
                                                  <div style={{ fontWeight: '500', color: 'white' }}>{bill.studentName}</div>
                                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)', marginTop: '2px' }}>{bill.studentMobile}</div>
                                                </td>
                                                <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{bill.originalRent.toLocaleString()} INR</td>
                                                <td style={{ padding: '12px 10px', color: '#94a3b8' }}>
                                                  {bill.status === 'Paid' ? (
                                                    <span style={{ color: '#10B981', fontWeight: '600' }}>{bill.amountPaid.toLocaleString()} INR</span>
                                                  ) : '-'}
                                                </td>
                                                <td style={{ padding: '12px 10px' }}>
                                                  <span 
                                                    className={`badge`}
                                                    style={{
                                                      fontSize: '0.65rem',
                                                      padding: '3px 8px',
                                                      borderRadius: '20px',
                                                      fontWeight: '600',
                                                      display: 'inline-block',
                                                      ...(bill.status === 'Paid' ? {
                                                        background: 'rgba(16, 185, 129, 0.12)',
                                                        color: '#10B981',
                                                        border: '1px solid rgba(16, 185, 129, 0.3)'
                                                      } : bill.status === 'Unpaid' ? {
                                                        background: 'rgba(239, 68, 68, 0.12)',
                                                        color: '#EF4444',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)'
                                                      } : {
                                                        background: 'rgba(245, 158, 11, 0.12)',
                                                        color: '#F59E0B',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)'
                                                      })
                                                    }}
                                                  >
                                                    {bill.status}
                                                  </span>
                                                </td>
                                                <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                                  {bill.status === 'Unpaid' ? (
                                                    <button 
                                                      onClick={() => handlePayBillDirect(bill.id)} 
                                                      className="btn btn-primary"
                                                      style={{ padding: '5px 12px', fontSize: '0.7rem', borderRadius: '6px' }}
                                                    >
                                                      <CreditCard size={11} style={{ marginRight: '4px' }} />
                                                      Collect
                                                    </button>
                                                  ) : bill.status.startsWith('Pending') ? (
                                                    <button 
                                                      onClick={() => handleApprovePayment(bill.id)} 
                                                      className="btn btn-primary"
                                                      style={{ 
                                                        padding: '5px 12px', 
                                                        fontSize: '0.7rem',
                                                        borderRadius: '6px',
                                                        background: '#F59E0B',
                                                        borderColor: '#F59E0B',
                                                        color: '#020617',
                                                        fontWeight: '600'
                                                      }}
                                                    >
                                                      <CheckCircle size={11} style={{ marginRight: '4px' }} />
                                                      Approve
                                                    </button>
                                                  ) : (
                                                    <button 
                                                      onClick={async () => {
                                                        try {
                                                          const formattedDateTime = new Date(bill.paymentDate).toLocaleDateString() + ' ' + new Date(bill.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                                          setActiveReceipt({
                                                            hostelHeading: 'LuxeHostel Operations',
                                                            studentName: bill.studentName,
                                                            timeAndDate: formattedDateTime,
                                                            mobileNumber: bill.studentMobile,
                                                            roomNumber: `${bill.roomId} (Bed ${bill.bedId})`,
                                                            amountPaid: `${bill.amountPaid.toLocaleString()} INR`,
                                                            originalRent: `${bill.originalRent.toLocaleString()} INR`,
                                                            discountApplied: `${bill.discountApplied.toLocaleString()} INR`,
                                                            coinsEarned: bill.coinsEarned,
                                                            totalCoinsAvailable: 0,
                                                            month: bill.month,
                                                            paymentType: bill.paymentType === 'Split' ? 'Split (Online + Cash)' : bill.paymentType || 'Cash'
                                                          });
                                                        } catch(e) {}
                                                      }} 
                                                      className="btn btn-secondary"
                                                      style={{ padding: '5px 12px', fontSize: '0.7rem', borderRadius: '6px' }}
                                                    >
                                                      <Printer size={11} style={{ marginRight: '4px' }} />
                                                      Receipt
                                                    </button>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            });
                        })()}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Complaints */}
      {activeTab === 'complaints' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '12px'
          }}>
            <MessageSquare size={18} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
              Central Hostel Tickets Logs
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-text)', marginLeft: 'auto' }}>
              {complaints.length} Total Complaints
            </span>
          </div>

          {complaints.length === 0 ? (
            <p style={{
              color: 'var(--color-muted-text)',
              fontSize: '0.9rem',
              textAlign: 'center',
              padding: '60px 0',
              fontStyle: 'italic'
            }}>
              No student complaints in database.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {complaints.map(complaint => (
                <div 
                  key={complaint.id} 
                  className="glass-panel" 
                  style={{
                    padding: '16px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span className="badge badge-ac" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                        {complaint.category}
                      </span>
                      <span style={{ fontWeight: '600', color: 'white', fontFamily: 'var(--font-heading)' }}>
                        Room {complaint.room} (Bed {complaint.bed})
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-text)' }}>
                        by {complaint.studentName}
                      </span>
                    </div>
                    <p style={{ color: 'var(--color-foreground)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                      {complaint.description}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)', marginTop: '6px' }}>
                      Filed: {new Date(complaint.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-text)' }}>Status:</span>
                    <select 
                      className="select"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', width: '130px' }}
                      value={complaint.status}
                      onChange={(e) => handleUpdateComplaintStatus(complaint.id, e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Settings (renamed to More) */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Row 1: Detailed Stats (Occupancy & Revenue) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            
            {/* Occupancy Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '12px'
              }}>
                <Users size={18} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', color: 'white' }}>
                  Detailed Occupancy
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-muted-text)' }}>Total Beds Available:</span>
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>{stats.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-muted-text)' }}>Occupied Beds:</span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: '600', fontSize: '1.1rem' }}>{stats.occupied}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-muted-text)' }}>Vacant Beds:</span>
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>{stats.total - stats.occupied}</span>
                </div>
                
                {/* Progress bar */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--color-muted-text)' }}>Occupancy Rate</span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: '600' }}>{stats.percent}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${stats.percent}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Analytics Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '12px'
              }}>
                <DollarSign size={18} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', color: 'white' }}>
                  Revenue Analysis
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-muted-text)' }}>Total Revenue Collected:</span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: '700', fontSize: '1.25rem' }}>{revenue.toLocaleString()} INR</span>
                </div>
                
                {/* Monthly breakdown */}
                <div style={{ marginTop: '8px' }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-muted-text)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Monthly Revenue Collection
                  </span>
                  
                  {Object.keys(bills.reduce((acc, b) => {
                    if (b.status === 'Paid') {
                      acc[b.month] = (acc[b.month] || 0) + b.amountPaid;
                    }
                    return acc;
                  }, {})).length === 0 ? (
                    <div style={{ color: 'var(--color-muted-text)', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px 0' }}>
                      No payments collected yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                      {Object.entries(bills.reduce((acc, b) => {
                        if (b.status === 'Paid') {
                          acc[b.month] = (acc[b.month] || 0) + (b.amountPaid || 0);
                        }
                        return acc;
                      }, {})).map(([month, amt]) => (
                        <div key={month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ color: 'white', fontSize: '0.85rem' }}>{month}</span>
                          <span style={{ color: 'white', fontWeight: '600', fontSize: '0.85rem' }}>{amt.toLocaleString()} INR</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Room Rate Settings Form */}
          <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '12px'
            }}>
              <Settings size={18} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                Base Room Rate Settings
              </h3>
            </div>

            {settingsMsg && (
              <div className="glass-panel" style={{
                padding: '10px 14px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                borderLeft: '4px solid var(--color-accent)',
                background: 'rgba(34,197,94,0.05)'
              }}>
                {settingsMsg}
              </div>
            )}

            <form onSubmit={handleUpdateRates} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)' }}>
                  AIR CONDITIONED (AC) RATE (INR / MONTH)
                </label>
                <input 
                  type="number" 
                  className="input" 
                  value={acRate}
                  onChange={(e) => setAcRate(e.target.value)}
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)' }}>
                  NON-AC RATE (INR / MONTH)
                </label>
                <input 
                  type="number" 
                  className="input" 
                  value={nonAcRate}
                  onChange={(e) => setNonAcRate(e.target.value)}
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
                Save & Apply Rates
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Checkin Student Modal Overlay */}
      {checkinBed && (
        <div className="modal-overlay" onClick={() => setCheckinBed(null)}>
          <div 
            className="modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '24px', maxWidth: '440px' }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '10px'
            }}>
              <h3 style={{ fontSize: '1.1rem' }}>Check In: Room {checkinBed.roomId} Bed {checkinBed.bedId}</h3>
              <button onClick={() => setCheckinBed(null)} style={{ background: 'none', border: 'none', color: 'var(--color-muted-text)', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCheckin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)' }}>
                  STUDENT NAME
                </label>
                <input 
                  type="text" 
                  className="input" 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter full name"
                  required
                  disabled={checkinLoading}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)' }}>
                  MOBILE NUMBER
                </label>
                <input 
                  type="text" 
                  className="input" 
                  value={studentMobile}
                  onChange={(e) => setStudentMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  required
                  disabled={checkinLoading}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '10px', marginTop: '10px' }}
                disabled={checkinLoading}
              >
                {checkinLoading ? 'Checking In...' : 'Confirm Check-in'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Generate Monthly Cycle Modal */}
      {showGenModal && (
        <div className="modal-overlay" onClick={() => setShowGenModal(false)}>
          <div 
            className="modal animate-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '24px', maxWidth: '440px' }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '10px'
            }}>
              <h3 style={{ fontSize: '1.15rem' }}>Generate Monthly Bills</h3>
              <button 
                onClick={() => setShowGenModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted-text)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateCycle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-text)', lineHeight: '1.5' }}>
                This creates unpaid rent bills for all currently occupied beds in the hostel for the selected month, setting their active payment status to "Unpaid".
              </p>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)' }}>
                  BILLING CYCLE MONTH
                </label>
                <input 
                  type="text"
                  className="input"
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  placeholder="e.g. September 2026"
                  required
                />
              </div>

              <button 
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                disabled={genLoading}
              >
                {genLoading ? 'Generating Bills...' : 'Confirm & Create Bills'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div 
            className="modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '24px', maxWidth: '400px' }}
          >
            <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: 'white' }}>
              {confirmAction.title}
            </h3>
            <p style={{ color: 'var(--color-muted-text)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
              {confirmAction.message}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-destructive" 
                style={{ flex: 1 }}
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
              >
                Confirm
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt Dialog Modal */}
      {activeReceipt && (
        <div className="modal-overlay" onClick={() => setActiveReceipt(null)}>
          <div 
            className="modal print-area" 
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '0',
              maxWidth: '460px',
              background: '#0a0f1d',
              border: '2px solid rgba(34,197,94,0.3)',
              borderRadius: '16px',
              fontFamily: 'var(--font-body)'
            }}
          >
            {/* Action Bar (Hidden on print) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 18px',
              borderBottom: '1px solid var(--color-border)',
              background: 'rgba(255,255,255,0.02)'
            }} className="no-print">
              <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: '600', fontFamily: 'var(--font-heading)' }}>
                BILL TRANSACTION RECEIPT
              </span>
              <button 
                onClick={() => setActiveReceipt(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted-text)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Real Bill Content Area */}
            <div style={{ padding: '32px 24px', color: '#f8fafc' }}>
              
              {/* Heading */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h1 style={{
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  letterSpacing: '3px',
                  fontFamily: 'var(--font-heading)',
                  color: 'white',
                  textTransform: 'uppercase'
                }}>
                  LuxeHostel
                </h1>
                <div style={{
                  height: '2px',
                  width: '60px',
                  backgroundColor: 'var(--color-accent)',
                  margin: '8px auto 0 auto'
                }}></div>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-muted-text)',
                  fontFamily: 'var(--font-heading)',
                  marginTop: '6px'
                }}>
                  Rent Payment Invoice ({activeReceipt.month})
                </p>
              </div>

              {/* Receipt Details Layout */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderBottom: '1px dashed var(--color-border)', paddingBottom: '20px', marginBottom: '20px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Student Name
                  </span>
                  <span style={{ fontWeight: '600', color: 'white', textAlign: 'right' }}>
                    {activeReceipt.studentName}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Mobile Number
                  </span>
                  <span style={{ fontWeight: '500', color: 'white' }}>
                    {activeReceipt.mobileNumber}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Hostel Room Number
                  </span>
                  <span style={{ fontWeight: '600', color: 'white', fontFamily: 'var(--font-heading)' }}>
                    {activeReceipt.roomNumber}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Time and Date
                  </span>
                  <span style={{ fontWeight: '500', color: 'white', fontSize: '0.85rem' }}>
                    {activeReceipt.timeAndDate}
                  </span>
                </div>

                {activeReceipt.paymentType && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Payment Method
                    </span>
                    <span style={{ fontWeight: '600', color: 'var(--color-accent)' }}>
                      {activeReceipt.paymentType}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Details Calculation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-muted-text)' }}>Original Rent:</span>
                  <span>{activeReceipt.originalRent}</span>
                </div>
                {activeReceipt.discountApplied !== '0 INR' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                    <span>Coins Discount Applied:</span>
                    <span>-{activeReceipt.discountApplied}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-accent)', fontStyle: 'italic' }}>
                  <span>Reward Coins Earned:</span>
                  <span>+{activeReceipt.coinsEarned} Coins</span>
                </div>
              </div>

              {/* Final Amount Block */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <span style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-heading)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '4px'
                }}>
                  Amount Paid (Cash Override)
                </span>
                <span style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: 'white',
                  fontFamily: 'var(--font-heading)'
                }}>
                  {activeReceipt.amountPaid}
                </span>
              </div>

              {/* Footer Stamp */}
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-muted-text)', marginTop: '24px' }}>
                <div style={{
                  border: '1.5px solid var(--color-accent)',
                  color: 'var(--color-accent)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  fontWeight: '700',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.7rem',
                  letterSpacing: '1px',
                  transform: 'rotate(-4deg)',
                  marginBottom: '12px'
                }}>
                  PAID TRANSACTION SECURE
                </div>
                <p>Thank you for staying at LuxeHostel.</p>
                <p style={{ fontSize: '0.65rem', opacity: '0.5', marginTop: '4px' }}>Txn Ref: LH-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
              </div>

            </div>

            {/* Print Controls (Hidden on print) */}
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              background: 'rgba(255,255,255,0.02)'
            }} className="no-print">
              <button 
                onClick={handlePrint}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Printer size={16} />
                Print Bill
              </button>
              <button 
                onClick={() => setActiveReceipt(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
