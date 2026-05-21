import React from 'react';
import { useNavigate } from 'react-router-dom';

const exercises = [
    {
        id: 'squat',
        name: 'Squat',
        category: 'Legs',
        difficulty: 'Beginner',
        duration: '10–15 min',
        calories: '150–200 kcal',
        emoji: '🏋️',
        description: 'Build lower body strength and improve mobility.',
    },
];

export default function ExerciseSelectionPage() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.logo}>PoseFit</h1>
                <div style={styles.headerRight}>
                    <span style={styles.welcome}>Hi, {user?.first_name}!</span>
                    <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
                </div>
            </div>

            <div style={styles.body}>
                <h2 style={styles.pageTitle}>Choose Your Exercise</h2>
                <p style={styles.pageSub}>Select a workout to get started</p>

                <div style={styles.grid}>
                    {exercises.map((ex) => (
                        <div
                            key={ex.id}
                            style={styles.card}
                            onClick={() => navigate(`/exercises/${ex.id}`)}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={styles.cardEmoji}>{ex.emoji}</div>
                            <div style={styles.cardBadge}>{ex.category}</div>
                            <h3 style={styles.cardName}>{ex.name}</h3>
                            <p style={styles.cardDesc}>{ex.description}</p>
                            <div style={styles.cardMeta}>
                                <span style={styles.metaItem}>⏱ {ex.duration}</span>
                                <span style={styles.metaItem}>🔥 {ex.calories}</span>
                            </div>
                            <div style={styles.difficultyRow}>
                                <span style={{
                                    ...styles.difficultyBadge,
                                    background: ex.difficulty === 'Beginner' ? '#dcfce7' : ex.difficulty === 'Intermediate' ? '#fef9c3' : '#fee2e2',
                                    color: ex.difficulty === 'Beginner' ? '#166534' : ex.difficulty === 'Intermediate' ? '#854d0e' : '#991b1b',
                                }}>
                                    {ex.difficulty}
                                </span>
                            </div>
                            <button style={styles.selectBtn}>View Exercise →</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'Segoe UI, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #1e293b', background: '#0f172a', position: 'sticky', top: 0, zIndex: 10 },
    logo: { color: '#38bdf8', margin: 0, fontSize: '1.6rem' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
    welcome: { color: '#94a3b8', fontSize: '14px' },
    logoutBtn: { padding: '8px 18px', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
    body: { padding: '50px 40px', maxWidth: '1100px', margin: '0 auto' },
    pageTitle: { fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' },
    pageSub: { color: '#64748b', fontSize: '1rem', marginBottom: '40px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' },
    card: { background: '#1e293b', borderRadius: '16px', padding: '28px 24px', cursor: 'pointer', border: '1px solid #334155', transition: 'transform 0.2s ease, box-shadow 0.2s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
    cardEmoji: { fontSize: '2.5rem', marginBottom: '12px' },
    cardBadge: { display: 'inline-block', background: '#0f172a', color: '#38bdf8', fontSize: '11px', padding: '3px 10px', borderRadius: '999px', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.5px' },
    cardName: { fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' },
    cardDesc: { color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' },
    cardMeta: { display: 'flex', gap: '12px', marginBottom: '14px' },
    metaItem: { color: '#64748b', fontSize: '12px' },
    difficultyRow: { marginBottom: '18px' },
    difficultyBadge: { fontSize: '11px', padding: '3px 10px', borderRadius: '999px', fontWeight: 600 },
    selectBtn: { width: '100%', padding: '11px', background: '#38bdf8', color: '#0f172a', fontWeight: 700, fontSize: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};