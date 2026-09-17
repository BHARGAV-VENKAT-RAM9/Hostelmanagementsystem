import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  MessageSquare, 
  Coins, 
  Printer, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  FileText,
  User,
  Phone,
  Calendar,
  Layers,
  Send,
  Loader,
  Check,
  Search,
  ArrowRight
} from 'lucide-react';

export default function StudentDashboard({ state, user, onRefresh }) {
  const { rooms, complaints, bills = [] } = state;
  const room = rooms[user.room];

  // Tab State: 'overview' | 'billing'
  const [activeSubTab, setActiveSubTab] = useState('overview');

  // Complaint form state
  const [complaintCategory, setComplaintCategory] = useState('Cleaning');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintBed, setComplaintBed] = useState('A');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintMsg, setComplaintMsg] = useState('');

  // Billing filter
  const [selectedBillingBed, setSelectedBillingBed] = useState('All');

  // Interactive Payment Gateway States
  const [payingItem, setPayingItem] = useState(null); // { type: 'bed', data: bed } or { type: 'bill', data: bill }
  const [checkoutStep, setCheckoutStep] = useState('summary'); // 'summary' | 'gateway' | 'processing'
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [redeemCoins, setRedeemCoins] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [payMode, setPayMode] = useState('online'); // 'online' | 'cash' | 'split'
  const [onlinePart, setOnlinePart] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null); // Receipt object

  const getNetTotal = () => {
    if (!payingItem) return 0;
    const rent = payingItem.type === 'bill' ? payingItem.data.originalRent : room.rate;
    const studentCoins = payingItem.type === 'bed' 
      ? payingItem.data.student.coins 
      : (room.beds.find(b => b.id === payingItem.data.bedId)?.student?.coins || 0);
    const discount = redeemCoins ? Math.min(studentCoins, rent) : 0;
    return rent - discount;
  };

  // Card/UPI input states (for mock validation)
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('123');
  const [upiId, setUpiId] = useState('student@ybl');

  if (!room) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading room data...</div>;
  }

  // Handle complaint filing
  const handleFileComplaint = async (e) => {
    e.preventDefault();
    if (!complaintDesc.trim()) return;

    setSubmittingComplaint(true);
    setComplaintMsg('');

    // Find student name on the selected bed
    const bedObj = room.beds.find(b => b.id === complaintBed);
    const studentName = bedObj && bedObj.student ? bedObj.student.name : 'Resident';

    try {
      const response = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          bedId: complaintBed,
          studentName,
          category: complaintCategory,
          description: complaintDesc
        })
      });

      if (!response.ok) throw new Error('Failed to file complaint');
      
      setComplaintDesc('');
      setComplaintMsg('Complaint registered successfully!');
      onRefresh();
    } catch (err) {
      setComplaintMsg('Error: ' + err.message);
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Simulate payment processing flow, then trigger backend payment API
  const handleStartPaymentSim = () => {
    if (payMode === 'cash') {
      handleExecutePayment();
    } else {
      setCheckoutStep('gateway');
    }
  };

  const handleExecutePayment = async () => {
    setCheckoutStep('processing');
    setProcessingPayment(true);

    const steps = payMode === 'cash' ? [
      'Registering cash collection request with LuxeHostel admin...',
      'Verifying resident details & current billing cycle...',
      'Preparing pending transaction logs...',
      'Submitting collection credentials...'
    ] : [
      'Initializing secure handshake with payment processor...',
      'Verifying account details & credit clearance...',
      'Redeeming rewards coins discount (if selected)...',
      'Securing settlement with LuxeHostel merchant account...',
      'Finalizing transaction credentials...'
    ];

    // Loop through simulated messages to give a premium checkout experience
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => {
        setProcessingMessage(steps[i]);
        setTimeout(resolve, 600);
      });
    }

    try {
      let activeBillId = payingItem.type === 'bill' ? payingItem.data.id : null;
      if (payingItem.type === 'bed') {
        const bedId = payingItem.data.id;
        const roomBedIds = room.beds.map(b => b.id);
        const roomBills = bills.filter(b => b.roomId === room.id && roomBedIds.includes(b.bedId));
        const activeBill = roomBills.find(b => b.bedId === bedId && (b.status === 'Unpaid' || b.status.startsWith('Pending')));
        if (activeBill) {
          activeBillId = activeBill.id;
        }
      }

      if (!activeBillId) {
        throw new Error('No active unpaid billing cycle found for this bed.');
      }

      let payload = {
        billId: activeBillId,
        paymentType: payMode === 'online' ? 'Online' : payMode === 'cash' ? 'Cash' : 'Split',
        redeemCoins
      };

      if (payMode === 'split') {
        const netTotal = getNetTotal();
        const onlineAmt = Number(onlinePart || 0);
        const cashAmt = netTotal - onlineAmt;
        
        if (onlineAmt <= 0 || cashAmt <= 0) {
          throw new Error('Online amount and Cash amount must both be greater than 0.');
        }
        
        payload.onlineAmount = onlineAmt;
        payload.cashAmount = cashAmt;
      }

      const response = await fetch('http://localhost:5000/api/bills/request-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment processing failed');

      if (payMode === 'online') {
        setActiveReceipt(data.receipt);
      } else {
        alert(payMode === 'cash'
          ? 'Cash payment approval request registered. Once the admin receives the cash and approves it, your bill will be updated.'
          : `Split payment request registered. Online portion of ${Number(onlinePart).toLocaleString()} INR is processed. Please pay the cash portion of ${(getNetTotal() - Number(onlinePart)).toLocaleString()} INR to the admin to complete approval.`
        );
      }
      setPayingItem(null);
      setRedeemCoins(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
      setCheckoutStep('summary');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Filter complaints for this room
  const roomComplaints = complaints.filter(c => c.room === room.id);

  // Filter bills for beds inside this room
  const roomBedIds = room.beds.map(b => b.id);
  const roomBills = bills.filter(b => b.roomId === room.id && roomBedIds.includes(b.bedId));

  // Further filter bills by selected Bed ID in the Billing Sub-Tab
  const filteredRoomBills = roomBills.filter(bill => {
    if (selectedBillingBed === 'All') return true;
    return bill.bedId === selectedBillingBed;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '0 16px 48px 16px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Room Summary Header */}
      <div className="glass-panel" style={{
        padding: '24px 32px',
        marginBottom: '32px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            Room {room.id} Dashboard
          </h2>
          <p style={{ color: 'var(--color-muted-text)', fontSize: '0.9rem', marginTop: '4px' }}>
            Floor {room.floor} • Base Rate: <span style={{ color: 'white', fontWeight: '600' }}>{room.rate.toLocaleString()} INR/month</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span className={`badge ${room.type === 'AC' ? 'badge-ac' : 'badge-nonac'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            {room.type} Room
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="glass-panel" style={{
        display: 'inline-flex',
        gap: '6px',
        padding: '4px',
        marginBottom: '32px'
      }}>
        <button 
          className="btn" 
          onClick={() => setActiveSubTab('overview')}
          style={{
            background: activeSubTab === 'overview' ? 'var(--color-accent)' : 'transparent',
            color: activeSubTab === 'overview' ? '#020617' : 'white',
            border: 'none',
            padding: '8px 16px',
            fontSize: '0.85rem'
          }}
        >
          Room Overview & complaints
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveSubTab('billing')}
          style={{
            background: activeSubTab === 'billing' ? 'var(--color-accent)' : 'transparent',
            color: activeSubTab === 'billing' ? '#020617' : 'white',
            border: 'none',
            padding: '8px 16px',
            fontSize: '0.85rem'
          }}
        >
          Billing & Monthly Bills
        </button>
      </div>

      {/* Conditionally Render Content based on selected Sub-Tab */}
      {activeSubTab === 'overview' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '32px',
          alignItems: 'start'
        }}>
          
          {/* Beds Occupancy section */}
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
              Room Bed Occupants
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {room.beds.map(bed => {
                const hasStudent = bed.student !== null;

                return (
                  <div 
                    key={bed.id} 
                    className="glass-panel" 
                    style={{
                      padding: '20px',
                      background: hasStudent ? 'rgba(15, 23, 42, 0.6)' : 'rgba(15, 23, 42, 0.2)',
                      borderLeft: hasStudent 
                        ? (bed.student.paid ? '4px solid var(--color-accent)' : '4px solid var(--color-destructive)')
                        : '1px solid var(--glass-border)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      borderBottom: '1px solid var(--color-border)',
                      paddingBottom: '8px'
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '700',
                        fontSize: '1.1rem'
                      }}>
                        Bed {bed.id}
                      </span>
                      {hasStudent ? (
                        <span className={`badge ${bed.student.paid ? 'badge-paid' : 'badge-unpaid'}`}>
                          {bed.student.paid ? 'Paid' : 'Unpaid'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-text)' }}>Vacant</span>
                      )}
                    </div>

                    {hasStudent ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                          <User size={14} style={{ color: 'var(--color-muted-text)' }} />
                          <span style={{ fontWeight: '500' }}>{bed.student.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-muted-text)' }}>
                          <Phone size={14} />
                          <span>{bed.student.mobile}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-muted-text)' }}>
                          <Calendar size={14} />
                          <span>In: {bed.student.checkInDate}</span>
                        </div>

                        {/* Coins Row */}
                        <div className="glass-panel" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(34,197,94,0.05)',
                          border: '1px dashed rgba(34,197,94,0.2)',
                          borderRadius: '6px',
                          marginTop: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-accent)' }}>
                            <Coins size={14} />
                            <span style={{ fontWeight: '600' }}>{bed.student.coins} Coins</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)' }}>
                            1 Coin = 1 INR
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                          {!bed.student.paid ? (() => {
                            const activeBill = roomBills.find(b => b.bedId === bed.id && (b.status === 'Unpaid' || b.status.startsWith('Pending')));
                            const isPendingApp = activeBill && activeBill.status.startsWith('Pending');
                            return isPendingApp ? (
                              <button 
                                disabled
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '8px', fontSize: '0.8rem', opacity: 0.7, cursor: 'not-allowed' }}
                              >
                                Pending Approval
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                  if (activeBill) {
                                    setPayingItem({ type: 'bill', data: activeBill });
                                  } else {
                                    setPayingItem({ type: 'bed', data: bed });
                                  }
                                  setCheckoutStep('summary');
                                  setRedeemCoins(false);
                                  setPayMode('online');
                                  setOnlinePart('');
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                              >
                                <CreditCard size={14} />
                                Pay Rent
                              </button>
                            );
                          })() : (
                            <button 
                              onClick={async () => {
                                // Find latest paid bill for receipt rendering
                                const latestPaid = roomBills
                                  .filter(b => b.bedId === bed.id && b.status === 'Paid')
                                  .sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0];
                                
                                if (latestPaid) {
                                  const formattedDateTime = new Date(latestPaid.paymentDate).toLocaleDateString() + ' ' + new Date(latestPaid.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                  setActiveReceipt({
                                    hostelHeading: 'LuxeHostel Operations',
                                    studentName: bed.student.name,
                                    timeAndDate: formattedDateTime,
                                    mobileNumber: bed.student.mobile,
                                    roomNumber: `${room.id} (Bed ${bed.id})`,
                                    amountPaid: `${latestPaid.amountPaid.toLocaleString()} INR`,
                                    originalRent: `${latestPaid.originalRent.toLocaleString()} INR`,
                                    discountApplied: `${latestPaid.discountApplied.toLocaleString()} INR`,
                                    coinsEarned: latestPaid.coinsEarned,
                                    totalCoinsAvailable: bed.student.coins,
                                    month: latestPaid.month,
                                    paymentType: latestPaid.paymentType === 'Split' ? 'Split (Online + Cash)' : latestPaid.paymentType || 'Cash'
                                  });
                                } else {
                                  // Fallback mock values
                                  const now = new Date();
                                  const formattedDateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                  setActiveReceipt({
                                    hostelHeading: 'LuxeHostel Operations',
                                    studentName: bed.student.name,
                                    timeAndDate: formattedDateTime,
                                    mobileNumber: bed.student.mobile,
                                    roomNumber: `${room.id} (Bed ${bed.id})`,
                                    amountPaid: `${room.rate.toLocaleString()} INR`,
                                    originalRent: `${room.rate.toLocaleString()} INR`,
                                    discountApplied: '0 INR',
                                    coinsEarned: 0,
                                    totalCoinsAvailable: bed.student.coins,
                                    month: 'August 2026',
                                    paymentType: 'Cash'
                                  });
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                            >
                              <Printer size={14} />
                              View Bill
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p style={{
                        color: 'var(--color-muted-text)',
                        fontSize: '0.85rem',
                        fontStyle: 'italic',
                        padding: '24px 0',
                        textAlign: 'center'
                      }}>
                        Bed is vacant.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complaints split */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            marginTop: '16px'
          }}>
            
            {/* Complaints form */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '10px'
              }}>
                <MessageSquare size={18} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                  File Room Complaint
                </h3>
              </div>

              {complaintMsg && (
                <div className="glass-panel" style={{
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  borderLeft: '4px solid var(--color-accent)',
                  background: 'rgba(34,197,94,0.05)'
                }}>
                  {complaintMsg}
                </div>
              )}

              <form onSubmit={handleFileComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)' }}>
                    SELECT BED
                  </label>
                  <select 
                    className="select"
                    value={complaintBed}
                    onChange={(e) => setComplaintBed(e.target.value)}
                  >
                    {room.beds.filter(b => b.student !== null).map(b => (
                      <option key={b.id} value={b.id}>Bed {b.id} ({b.student.name})</option>
                    ))}
                    {room.beds.filter(b => b.student === null).map(b => (
                      <option key={b.id} value={b.id} disabled>Bed {b.id} (Vacant)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)' }}>
                    COMPLAINT CATEGORY
                  </label>
                  <select 
                    className="select"
                    value={complaintCategory}
                    onChange={(e) => setComplaintCategory(e.target.value)}
                  >
                    <option value="Cleaning">Cleaning</option>
                    <option value="AC Repair">AC Repair</option>
                    <option value="Cupboard Problems">Cupboard Problems</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--color-muted-text)', fontFamily: 'var(--font-heading)' }}>
                    DESCRIPTION
                  </label>
                  <textarea 
                    className="input" 
                    rows="3"
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    placeholder="Detail your request..."
                    style={{ resize: 'none', fontFamily: 'var(--font-body)' }}
                    required
                    disabled={submittingComplaint}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submittingComplaint || room.beds.filter(b => b.student !== null).length === 0}
                >
                  <Send size={14} />
                  {submittingComplaint ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </form>
            </div>

            {/* Active Complaints status */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '10px'
              }}>
                <FileText size={18} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                  Active Room Complaints
                </h3>
              </div>

              {roomComplaints.length === 0 ? (
                <p style={{
                  color: 'var(--color-muted-text)',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  padding: '40px 0',
                  fontStyle: 'italic'
                }}>
                  No complaints registered for this room.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '310px', overflowY: 'auto', paddingRight: '4px' }}>
                  {roomComplaints.map(complaint => (
                    <div 
                      key={complaint.id} 
                      className="glass-panel" 
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px'
                      }}>
                        <span style={{ fontWeight: '600', color: 'white' }}>
                          {complaint.category} (Bed {complaint.bed})
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          color: complaint.status === 'Resolved' ? 'var(--color-accent)' : 
                                 complaint.status === 'In Progress' ? '#60a5fa' : '#f59e0b'
                        }}>
                          ● {complaint.status}
                        </span>
                      </div>
                      <p style={{ color: 'var(--color-muted-text)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                        {complaint.description}
                      </p>
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.3)',
                        textAlign: 'right'
                      }}>
                        Filed: {new Date(complaint.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* Sub-Tab: Billing & Monthly Bills */
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '12px'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: 'var(--color-accent)' }} />
              Room Billing History
            </h3>
            
            <div>
              <select 
                className="select" 
                value={selectedBillingBed}
                onChange={(e) => setSelectedBillingBed(e.target.value)}
                style={{ width: '180px', fontSize: '0.85rem', padding: '6px 12px' }}
              >
                <option value="All">All Room Beds</option>
                {room.beds.filter(b => b.student !== null).map(b => (
                  <option key={b.id} value={b.id}>Bed {b.id} ({b.student.name})</option>
                ))}
              </select>
            </div>
          </div>

          {filteredRoomBills.length === 0 ? (
            <p style={{
              color: 'var(--color-muted-text)',
              fontSize: '0.85rem',
              textAlign: 'center',
              padding: '60px 0',
              fontStyle: 'italic'
            }}>
              No billing logs found.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted-text)' }}>
                    <th style={{ padding: '12px 8px' }}>Bed</th>
                    <th style={{ padding: '12px 8px' }}>Student</th>
                    <th style={{ padding: '12px 8px' }}>Billing Cycle</th>
                    <th style={{ padding: '12px 8px' }}>Original Rent</th>
                    <th style={{ padding: '12px 8px' }}>Amount Paid</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoomBills.map(bill => (
                    <tr key={bill.id} style={{ borderBottom: '1px dashed var(--color-border)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: '600', color: 'white' }}>Bed {bill.bedId}</td>
                      <td style={{ padding: '12px 8px' }}>{bill.studentName}</td>
                      <td style={{ padding: '12px 8px' }}>{bill.month}</td>
                      <td style={{ padding: '12px 8px' }}>{bill.originalRent.toLocaleString()} INR</td>
                      <td style={{ padding: '12px 8px' }}>{bill.status === 'Paid' ? `${bill.amountPaid.toLocaleString()} INR` : '-'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span 
                          className={`badge ${bill.status === 'Paid' ? 'badge-paid' : bill.status === 'Unpaid' ? 'badge-unpaid' : ''}`}
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            ...(bill.status.startsWith('Pending') ? {
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#F59E0B',
                              border: '1px solid rgba(245, 158, 11, 0.3)'
                            } : {})
                          }}
                        >
                          {bill.status === 'Pending Cash' ? 'Pending Cash Approval' : bill.status === 'Pending Split' ? 'Pending Split Approval' : bill.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {bill.status === 'Unpaid' ? (
                          <button 
                            onClick={() => {
                              setPayingItem({ type: 'bill', data: bill });
                              setCheckoutStep('summary');
                              setRedeemCoins(false);
                              setPayMode('online');
                              setOnlinePart('');
                            }}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <CreditCard size={10} />
                            Pay Now
                          </button>
                        ) : bill.status.startsWith('Pending') ? (
                          <button 
                            disabled
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: 0.7, cursor: 'not-allowed' }}
                          >
                            Awaiting Approval
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              const formattedDateTime = new Date(bill.paymentDate).toLocaleDateString() + ' ' + new Date(bill.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                              setActiveReceipt({
                                hostelHeading: 'LuxeHostel Operations',
                                studentName: bill.studentName,
                                timeAndDate: formattedDateTime,
                                mobileNumber: bill.studentMobile,
                                roomNumber: `${room.id} (Bed ${bill.bedId})`,
                                amountPaid: `${bill.amountPaid.toLocaleString()} INR`,
                                originalRent: `${bill.originalRent.toLocaleString()} INR`,
                                discountApplied: `${bill.discountApplied.toLocaleString()} INR`,
                                coinsEarned: bill.coinsEarned,
                                totalCoinsAvailable: 0,
                                month: bill.month,
                                paymentType: bill.paymentType === 'Split' ? 'Split (Online + Cash)' : bill.paymentType || 'Cash'
                              });
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <Printer size={10} />
                            View Bill
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pay Rent Modal + Mock Payment Gateway */}
      {payingItem && (
        <div className="modal-overlay" onClick={() => setPayingItem(null)}>
          <div 
            className="modal animate-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              padding: '0', 
              maxWidth: '440px',
              background: '#0d1326',
              border: '1px solid var(--color-accent)'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                {checkoutStep === 'summary' && `Checkout Rent - Bed ${payingItem.data.id || payingItem.data.bedId}`}
                {checkoutStep === 'gateway' && 'Mock Payment Gateway'}
                {checkoutStep === 'processing' && 'Processing Transaction...'}
              </h3>
              {!processingPayment && (
                <button 
                  onClick={() => setPayingItem(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-muted-text)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Step 1: Summary Review */}
            {checkoutStep === 'summary' && (
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-muted-text)' }}>Student Resident:</span>
                    <span style={{ fontWeight: '500', color: 'white' }}>
                      {payingItem.type === 'bill' ? payingItem.data.studentName : payingItem.data.student.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-muted-text)' }}>Monthly rent due:</span>
                    <span style={{ fontWeight: '600', color: 'white' }}>
                      {payingItem.type === 'bill' ? payingItem.data.originalRent.toLocaleString() : room.rate.toLocaleString()} INR
                    </span>
                  </div>

                  {/* Coin discount options */}
                  {((payingItem.type === 'bed' && payingItem.data.student.coins > 0) || 
                    (payingItem.type === 'bill' && room.beds.find(b => b.id === payingItem.data.bedId)?.student?.coins > 0)) && (
                    <div className="glass-panel" style={{
                      padding: '12px',
                      background: 'rgba(34,197,94,0.05)',
                      border: '1px dashed rgba(34,197,94,0.2)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-accent)' }}>
                          Available Coins: {payingItem.type === 'bed' ? payingItem.data.student.coins : room.beds.find(b => b.id === payingItem.data.bedId).student.coins}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)' }}>
                          Save on this payment cycle
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={redeemCoins}
                        onChange={(e) => setRedeemCoins(e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: 'var(--color-accent)'
                        }}
                      />
                    </div>
                  )}

                  {/* Net Summary Calculation */}
                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1rem',
                    fontWeight: '700'
                  }}>
                    <span>Net Total:</span>
                    <span style={{ color: 'var(--color-accent)' }}>
                      {getNetTotal().toLocaleString()} INR
                    </span>
                  </div>

                  {/* Payment Mode Selection */}
                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--color-muted-text)', textTransform: 'uppercase', fontWeight: '600' }}>
                      SELECT PAYMENT METHOD
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: payMode === 'online' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: payMode === 'online' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--color-border)',
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="radio" 
                          name="payMode" 
                          value="online" 
                          checked={payMode === 'online'} 
                          onChange={(e) => setPayMode(e.target.value)}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white' }}>Online Payment</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)' }}>Pay instantly via simulated Card or UPI</span>
                        </div>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: payMode === 'cash' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: payMode === 'cash' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--color-border)',
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="radio" 
                          name="payMode" 
                          value="cash" 
                          checked={payMode === 'cash'} 
                          onChange={(e) => setPayMode(e.target.value)}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white' }}>Cash Payment</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)' }}>Hand over physical cash to the Admin for approval</span>
                        </div>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: payMode === 'split' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: payMode === 'split' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--color-border)',
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="radio" 
                          name="payMode" 
                          value="split" 
                          checked={payMode === 'split'} 
                          onChange={(e) => {
                            setPayMode(e.target.value);
                            setOnlinePart(Math.floor(getNetTotal() / 2).toString()); // default to half-half
                          }}
                          style={{ accentColor: 'var(--color-accent)' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white' }}>Split Payment (Cash + Online)</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)' }}>Pay a portion online, and the rest in physical cash</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Split calculator fields */}
                  {payMode === 'split' && (
                    <div className="glass-panel" style={{
                      padding: '16px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      marginTop: '8px'
                    }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted-text)', marginBottom: '6px' }}>
                          ONLINE AMOUNT (INR)
                        </label>
                        <input 
                          type="number"
                          className="input"
                          value={onlinePart}
                          onChange={(e) => setOnlinePart(e.target.value)}
                          placeholder="Enter online amount"
                          max={getNetTotal()}
                          min={1}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'white' }}>
                        <span>Pending Cash Amount:</span>
                        <span style={{ fontWeight: '700', color: 'var(--color-accent)' }}>
                          {Math.max(0, getNetTotal() - Number(onlinePart || 0)).toLocaleString()} INR
                        </span>
                      </div>
                      {Number(onlinePart || 0) <= 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-destructive)' }}>
                          ⚠️ Online amount must be greater than zero.
                        </span>
                      )}
                      {Number(onlinePart || 0) >= getNetTotal() && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-destructive)' }}>
                          ⚠️ Online amount must be less than the net total.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleStartPaymentSim}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}
                  disabled={payMode === 'split' && (Number(onlinePart || 0) <= 0 || Number(onlinePart || 0) >= getNetTotal())}
                >
                  {payMode === 'cash' ? 'Request Cash Approval' : 'Proceed to Secure Checkout'}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* Step 2: Payment Gateway Selector */}
            {checkoutStep === 'gateway' && (
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-text)', marginBottom: '16px' }}>
                  Select a payment method to simulate the transaction. No real money will be charged.
                </p>

                <div className="glass-panel" style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-text)' }}>Online Payment Portion:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-accent)', fontFamily: 'var(--font-heading)' }}>
                    {(payMode === 'split' ? Number(onlinePart || 0) : getNetTotal()).toLocaleString()} INR
                  </span>
                </div>

                {/* Tab select */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`btn ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                  >
                    UPI / Apps
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                  >
                    Card Payment
                  </button>
                </div>

                {/* Form fields based on selected method */}
                {paymentMethod === 'upi' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted-text)', marginBottom: '6px' }}>UPI ID</label>
                      <input 
                        type="text" 
                        className="input" 
                        value={upiId} 
                        onChange={(e) => setUpiId(e.target.value)} 
                        placeholder="username@bank"
                      />
                    </div>
                    {/* Simulated visual QR code */}
                    <div style={{
                      margin: '10px auto 0 auto',
                      width: '120px',
                      height: '120px',
                      background: 'white',
                      padding: '8px',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '2px solid var(--color-accent)'
                    }}>
                      {/* Fake pixel QR blocks generated in CSS/HTML */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', height: '30px' }}>
                        <div style={{ width: '30px', background: 'black' }}></div>
                        <div style={{ width: '40px', background: 'white' }}></div>
                        <div style={{ width: '30px', background: 'black' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around', height: '40px', alignItems: 'center' }}>
                        <div style={{ width: '20px', height: '20px', background: 'black' }}></div>
                        <div style={{ width: '15px', height: '15px', background: 'black' }}></div>
                        <div style={{ width: '20px', height: '20px', background: 'black' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', height: '30px' }}>
                        <div style={{ width: '30px', background: 'black' }}></div>
                        <div style={{ width: '20px', background: 'white' }}></div>
                        <div style={{ width: '30px', background: 'black' }}></div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)', textAlign: 'center', fontWeight: '500' }}>
                      Scan QR or Enter UPI to simulate transaction
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted-text)', marginBottom: '6px' }}>CARD NUMBER</label>
                      <input 
                        type="text" 
                        className="input" 
                        value={cardNumber} 
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="XXXX XXXX XXXX XXXX" 
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted-text)', marginBottom: '6px' }}>EXPIRY</label>
                        <input 
                          type="text" 
                          className="input" 
                          value={cardExpiry} 
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY" 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted-text)', marginBottom: '6px' }}>CVV</label>
                        <input 
                          type="password" 
                          className="input" 
                          value={cardCvv} 
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Final Button */}
                <div style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <button 
                    type="button" 
                    onClick={() => setCheckoutStep('summary')} 
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px' }}
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    onClick={handleExecutePayment} 
                    className="btn btn-primary"
                    style={{ padding: '10px 20px' }}
                  >
                    Simulate Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Processing loader screen */}
            {checkoutStep === 'processing' && (
              <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <Loader size={36} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                    Authenticating Mock Payment...
                  </h4>
                  <p style={{ color: 'var(--color-muted-text)', fontSize: '0.8rem', minHeight: '36px', lineHeight: '1.4' }}>
                    {processingMessage}
                  </p>
                </div>
              </div>
            )}
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
                BILL GENERATED SUCCESSFULLY
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
                  Official Payment Receipt ({activeReceipt.month})
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
                  Amount Paid
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

      {/* Global CSS animation injections */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1.5s linear infinite;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
