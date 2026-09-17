import React, { useState } from 'react';
import { 
  Layers, 
  Settings, 
  MessageSquare, 
  Users, 
  DollarSign, 
  CheckCircle, 
  Plus, 
  Trash2, 
  UserCheck, 
  UserX, 
  Sparkles,
  CreditCard,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function AdminDashboard({ state, onRefresh }) {
  const { rooms, baseRates, complaints, bills = [] } = state;

  // Tabs for subpages
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'complaints' | 'settings'

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
    if (bills && bills.length > 0) {
      let rev = 0;
      bills.forEach(bill => {
        if (bill.status === 'Paid') {
          rev += bill.amountPaid;
        }
      });
      return rev;
    }
    let rev = 0;
    Object.values(rooms).forEach(room => {
      room.beds.forEach(bed => {
        if (bed.student && bed.student.paid) {
          rev += room.rate;
        }
      });
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
      message: `Are you sure you want to vacate Room ${roomId} Bed ${bedId}? This will wipe reward coins for this student.`,
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

  // 6. Manual Cash Rent payment Override
  const handleOverridePayment = async (roomId, bedId) => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms/pay-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, bedId, redeemCoins: false })
      });
      if (!response.ok) throw new Error('Payment override failed');
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

  // Filtered rooms logic
  const filteredRooms = Object.values(rooms)
    .filter(room => {
      const matchFloor = floorFilter === 'All' ? true : room.floor.toString() === floorFilter;
      const matchType = typeFilter === 'All' ? true : room.type === typeFilter;
      const matchSearch = searchRoom === '' ? true : room.id.includes(searchRoom);
      return matchFloor && matchType && matchSearch;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div style={{ padding: '0 16px 48px 16px', maxWidth: '1280px', margin: '0 auto' }}>
      


      {/* Tabs Switcher */}
      <div className="glass-panel" style={{
        display: 'flex',
        gap: '6px',
        padding: '6px',
        marginBottom: '24px',
        maxWidth: '480px'
      }}>
        <button 
          className="btn" 
          onClick={() => setActiveTab('rooms')}
          style={{
            flex: 1,
            background: activeTab === 'rooms' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'rooms' ? '#020617' : 'white',
            border: 'none',
            padding: '10px'
          }}
        >
          <Layers size={14} />
          Manage Rooms
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('complaints')}
          style={{
            flex: 1,
            background: activeTab === 'complaints' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'complaints' ? '#020617' : 'white',
            border: 'none',
            padding: '10px'
          }}
        >
          <MessageSquare size={14} />
          Complaints Log
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            background: activeTab === 'settings' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'settings' ? '#020617' : 'white',
            border: 'none',
            padding: '10px'
          }}
        >
          <Settings size={14} />
          More
        </button>
      </div>

      {/* TAB CONTENTS */}

      {/* Tab 1: Rooms list */}
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

      {/* Tab 2: Complaints */}
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
            <FileText size={18} style={{ color: 'var(--color-accent)' }} />
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

      {/* Tab 3: Settings (renamed to More) */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
          
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

    </div>
  );
}
