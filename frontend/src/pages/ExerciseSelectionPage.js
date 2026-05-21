import React from 'react';
import { useNavigate } from 'react-router-dom';

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
                <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
            </div>
            <div style={styles.body}>
                <h2 style={styles.welcome}>Welcome, {user?.first_name}! 👋</h2>
                <p style={styles.sub}>Exercise Selection — coming soon</p>
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #1e293b' },
    logo: { color: '#38bdf8', margin: 0 },
    logoutBtn: { padding: '8px 18px', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '8px', cursor: 'pointer' },
    body: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' },
    welcome: { fontSize: '2rem', marginBottom: '8px' },
    sub: { color: '#64748b', fontSize: '1rem' },
};