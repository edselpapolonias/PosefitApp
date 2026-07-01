import React from 'react';
import { useNavigate } from 'react-router-dom';

const exercises = [
    {
        id: 'squat',
        name: 'Squat',
        category: 'Lower body',
        duration: '3 sets • 12 reps',
        tags: ['Glutes', 'Quads', 'Core'],
        emoji: '🏋️',
        enabled: true,
    },
    {
        id: 'plank',
        name: 'Plank',
        category: 'Core',
        duration: '3 sets • 30 sec hold',
        tags: ['Core', 'Shoulders', 'Stability'],
        emoji: '🧘',
        enabled: false,
    },
    {
        id: 'pushups',
        name: 'Push-ups',
        category: 'Upper body',
        duration: '3 sets • 15 reps',
        tags: ['Chest', 'Triceps', 'Core'],
        emoji: '💪',
        enabled: false,
    },
];

export default function ExerciseSelectionPage() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    
    const initials = user
        ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
        : 'U';

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleCardClick = (ex) => {
        if (ex.enabled) {
            navigate(`/exercises/${ex.id}`);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header / Nav */}
            <div style={styles.nav}>
                <div style={styles.breadcrumb}>
                    <span style={styles.breadcrumbCurrent}>Exercises</span>
                </div>
                <div style={styles.navRight}>
                    <span style={styles.welcome}>Hi, {user?.first_name || 'User'}!</span>
                    <button 
                        style={styles.logoutBtn} 
                        onClick={handleLogout}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#F15025';
                            e.currentTarget.style.color = '#F15025';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#E6E8E6';
                            e.currentTarget.style.color = '#666';
                        }}
                    >
                        Logout
                    </button>
                    <div id="user-avatar" style={styles.avatar}>{initials}</div>
                </div>
            </div>

            {/* Main body */}
            <div style={styles.body}>
                <h1 style={styles.pageTitle}>Choose an exercise</h1>
                <p style={styles.pageSub}>Select one to get started. Your form will be tracked in real time.</p>

                <div style={styles.grid}>
                    {exercises.map((ex) => (
                        <div
                            key={ex.id}
                            style={{
                                ...styles.card,
                                opacity: ex.enabled ? 1 : 0.75,
                                cursor: ex.enabled ? 'pointer' : 'default',
                            }}
                            onClick={() => handleCardClick(ex)}
                            onMouseEnter={e => {
                                if (ex.enabled) {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(241,80,37,0.08)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (ex.enabled) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }}
                        >
                            {/* Top box: Preview illustration */}
                            <div style={{
                                ...styles.cardTop,
                                background: ex.enabled ? '#FFF5F2' : '#F1F1F1'
                            }}>
                                {ex.emoji}
                            </div>

                            {/* Bottom box: Info */}
                            <div style={styles.cardBottom}>
                                <h3 style={styles.cardName}>{ex.name}</h3>
                                <p style={styles.cardSub}>
                                    {ex.category} • {ex.duration}
                                </p>
                                
                                <div style={styles.tagsRow}>
                                    {ex.tags.map((tag, idx) => (
                                        <span key={idx} style={styles.tagPill}>{tag}</span>
                                    ))}
                                </div>

                                <div style={styles.btnRow}>
                                    <button
                                        style={{
                                            ...styles.selectBtn,
                                            opacity: ex.enabled ? 1 : 0.5,
                                            cursor: ex.enabled ? 'pointer' : 'not-allowed',
                                        }}
                                        disabled={!ex.enabled}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCardClick(ex);
                                        }}
                                        onMouseEnter={e => {
                                            if (ex.enabled) {
                                                e.currentTarget.style.background = '#F15025';
                                                e.currentTarget.style.color = '#fff';
                                                e.currentTarget.style.borderColor = '#F15025';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (ex.enabled) {
                                                e.currentTarget.style.background = '#fff';
                                                e.currentTarget.style.color = '#222';
                                                e.currentTarget.style.borderColor = '#E6E8E6';
                                            }
                                        }}
                                    >
                                        {ex.enabled ? 'Select ➔' : 'Locked 🔒'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: '#F7F7F7',
        color: '#222',
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    },
    nav: {
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 32px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E6E8E6',
    },
    breadcrumb: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
    },
    breadcrumbCurrent: {
        fontWeight: 700,
        color: '#222',
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    welcome: {
        color: '#666',
        fontSize: '14px',
        fontWeight: 500,
    },
    logoutBtn: {
        padding: '8px 18px',
        background: 'transparent',
        border: '1px solid #E6E8E6',
        color: '#666',
        borderRadius: '999px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        fontFamily: 'inherit',
        transition: 'all 0.2s',
    },
    avatar: {
        height: '36px',
        width: '36px',
        borderRadius: '50%',
        background: '#F15025',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 700,
        boxShadow: '0 2px 8px rgba(241,80,37,0.25)',
    },
    body: {
        padding: '48px 32px 60px',
        maxWidth: '1100px',
        margin: '0 auto',
    },
    pageTitle: {
        fontSize: '2.2rem',
        fontWeight: 800,
        color: '#222',
        margin: '0 0 8px',
    },
    pageSub: {
        color: '#666',
        fontSize: '1rem',
        marginBottom: '40px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '32px',
        alignItems: 'start',
    },
    card: {
        background: '#FFFFFF',
        border: '1px solid #E6E8E6',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    },
    cardTop: {
        height: '180px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottom: '1px solid #E6E8E6',
        fontSize: '3.5rem',
    },
    cardBottom: {
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
    },
    cardName: {
        fontSize: '1.4rem',
        fontWeight: 800,
        color: '#222',
        margin: '0 0 4px',
    },
    cardSub: {
        color: '#666',
        fontSize: '13px',
        margin: '0 0 16px',
    },
    tagsRow: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '24px',
    },
    tagPill: {
        background: '#FFFFFF',
        border: '1px solid #E6E8E6',
        color: '#444',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: '600',
    },
    btnRow: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: 'auto',
    },
    selectBtn: {
        background: '#FFFFFF',
        border: '1px solid #E6E8E6',
        color: '#222',
        padding: '10px 24px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
    },
};