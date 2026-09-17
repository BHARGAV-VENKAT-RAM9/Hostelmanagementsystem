import React from 'react';
import { Layers, HelpCircle, Key, Users } from 'lucide-react';

export default function VisitorDashboard({ state, onOpenLogin }) {
  const { rooms } = state;

  // Group rooms by floor (1 to 5)
  const getFloors = () => {
    const floors = {};
    for (let f = 1; f <= 5; f++) {
      floors[f] = [];
    }
    Object.keys(rooms).forEach(roomId => {
      const room = rooms[roomId];
      floors[room.floor].push(room);
    });
    return floors;
  };

    const getStats = () => {
    let totalBeds = 0;
    let occupiedBeds = 0;
    let acCount = 0;
    let nonAcCount = 0;
    
    Object.values(rooms).forEach(room => {
      totalBeds += room.beds.length;
      room.beds.forEach(bed => {
        if (bed.student) occupiedBeds++;
      });
      if (room.type === 'AC') {
        acCount++;
      } else {
        nonAcCount++;
      }
    });
    
    return {
      totalBeds,
      occupiedBeds,
      acCount,
      nonAcCount,
      occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
    };
  };

  const stats = getStats();
  const floors = getFloors();

  return (
    <div style={{ padding: '0 16px 48px 16px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header Promo Card - Enhanced Two-Column Premium Layout */}
      <div className="glass-panel" style={{
        padding: '40px',
        marginBottom: '32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        alignItems: 'center',
        gap: '32px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.45) 100%)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}></div>

        {/* Left Column: Info & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            alignSelf: 'start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            color: 'var(--color-accent)',
            fontWeight: '600',
            fontFamily: 'var(--font-heading)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'inline-block',
              boxShadow: '0 0 8px var(--color-accent)'
            }}></span>
            LIVE SYSTEM PREVIEW
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: '700', lineHeight: '1.2', letterSpacing: '-0.03em', color: 'white' }}>
            Explore LuxeHostel Spaces & Occupancy
          </h2>
          <p style={{ color: 'var(--color-muted-text)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Browse through real-time bed availability, room air-conditioning configuration maps, and active hostel floors. 
            Logged-in residents can verify personal room numbers, settle bills, or lodge maintenance requests.
          </p>
          <div>
            <button onClick={onOpenLogin} className="btn btn-primary" style={{ gap: '10px' }}>
              <Key size={16} />
              Access Room Portal
            </button>
          </div>
        </div>

        {/* Right Column: Premium Live Stats Monitor */}
        <div className="glass-panel" style={{
          padding: '24px',
          background: 'rgba(2, 6, 23, 0.45)',
          borderColor: 'rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: 'inset 0 0 20px rgba(255,255,255,0.01)'
        }}>
          <h4 style={{
            fontSize: '0.8rem',
            color: 'white',
            fontFamily: 'var(--font-heading)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '10px'
          }}>
            Real-Time Monitor
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted-text)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Occupancy Rate
              </span>
              <span style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--color-accent)', fontFamily: 'var(--font-heading)' }}>
                {stats.occupancyRate}%
              </span>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)', marginTop: '2px' }}>
                {stats.occupiedBeds} / {stats.totalBeds} Beds Taken
              </p>
            </div>
            
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted-text)', textTransform: 'uppercase', marginBottom: '4px' }}>
                AC vs Non-AC
              </span>
              <span style={{ fontSize: '1.6rem', fontWeight: '700', color: 'white', fontFamily: 'var(--font-heading)' }}>
                {stats.acCount} / {stats.nonAcCount}
              </span>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-text)', marginTop: '2px' }}>
                Active Rooms
              </p>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(34, 197, 94, 0.05)', 
            border: '1px dashed rgba(34, 197, 94, 0.15)', 
            borderRadius: '8px', 
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem'
          }}>
            <span style={{ color: 'var(--color-muted-text)' }}>Available Beds:</span>
            <span style={{ color: 'var(--color-accent)', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>
              {stats.totalBeds - stats.occupiedBeds} Vacancies
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', color: 'var(--color-muted-text)' }}>
          System Legend
        </span>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-ac">AC</span>
            <span>Air Conditioned (7,500 INR/mo)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-nonac">Non-AC</span>
            <span>Standard Room (6,500 INR/mo)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '3px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
            </div>
            <span>Occupied / Vacant Beds</span>
          </div>
        </div>
      </div>

      {/* Floors Display */}
      <div className="floors-container">
        {Object.keys(floors)
          .sort((a, b) => b - a) // Show floor 5 at the top, floor 1 at the bottom
          .map(floorNum => {
            const floorRooms = floors[floorNum].sort((a, b) => a.id.localeCompare(b.id));
            return (
              <div key={floorNum} className="glass-panel" style={{ padding: '24px', background: 'rgba(15,23,42,0.2)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '12px'
                }}>
                  <Layers size={18} style={{ color: 'var(--color-accent)' }} />
                  <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                    FLOOR {floorNum}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-text)', marginLeft: 'auto' }}>
                    10 Rooms Total
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  {floorRooms.map(room => {
                    const totalBeds = room.beds.length;
                    const occupiedBeds = room.beds.filter(b => b.student !== null).length;
                    const isFull = occupiedBeds === totalBeds;

                    return (
                      <div 
                        key={room.id} 
                        className="glass-panel glass-panel-hover" 
                        style={{
                          padding: '16px',
                          background: 'rgba(15, 23, 42, 0.5)',
                          cursor: 'default'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px'
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-heading)',
                            fontWeight: '700',
                            fontSize: '1rem',
                            color: 'white'
                          }}>
                            Room {room.id}
                          </span>
                          <span className={`badge ${room.type === 'AC' ? 'badge-ac' : 'badge-nonac'}`}>
                            {room.type}
                          </span>
                        </div>

                        {/* Bed Progress Bar */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            color: 'var(--color-muted-text)',
                            marginBottom: '4px'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Users size={10} />
                              {occupiedBeds}/{totalBeds} Occupied
                            </span>
                            <span>{isFull ? 'Full' : 'Available'}</span>
                          </div>
                          <div style={{
                            height: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(occupiedBeds / totalBeds) * 100}%`,
                              height: '100%',
                              backgroundColor: isFull ? 'var(--color-destructive)' : 'var(--color-accent)',
                              transition: 'width 0.4s ease'
                            }}></div>
                          </div>
                        </div>

                        {/* Visual Dots for Beds */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'start',
                          gap: '6px',
                          alignItems: 'center'
                        }}>
                          {room.beds.map(bed => {
                            const isOccupied = bed.student !== null;
                            return (
                              <div
                                key={bed.id}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontFamily: 'var(--font-heading)',
                                  fontWeight: '600',
                                  backgroundColor: isOccupied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                  border: isOccupied 
                                    ? '1px solid rgba(34, 197, 94, 0.35)' 
                                    : '1px solid rgba(255, 255, 255, 0.05)',
                                  color: isOccupied ? 'var(--color-accent)' : 'var(--color-muted-text)'
                                }}
                                title={`Bed ${bed.id}: ${isOccupied ? 'Occupied' : 'Vacant'}`}
                              >
                                {bed.id}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
