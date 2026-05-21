import React from 'react';
import { useNavigate } from 'react-router-dom';

const benefits = [
    { icon: '💪', title: 'Builds Muscle', desc: 'Targets quads, hamstrings, glutes, and calves for full lower body strength.' },
    { icon: '🔥', title: 'Burns Calories', desc: 'Burns 150–200 kcal per session, boosting your metabolism.' },
    { icon: '🦵', title: 'Improves Mobility', desc: 'Increases flexibility in hips, knees, and ankles over time.' },
    { icon: '🧍', title: 'Better Posture', desc: 'Strengthens your core and back, improving overall posture.' },
];

const steps = [
    { num: '01', title: 'Starting Position', desc: 'Stand with feet shoulder-width apart, toes slightly pointed outward.' },
    { num: '02', title: 'Lower Down', desc: 'Bend your knees and push your hips back as if sitting into a chair. Keep your chest up.' },
    { num: '03', title: 'Reach Depth', desc: 'Lower until your thighs are parallel to the floor. Keep knees aligned with toes.' },
    { num: '04', title: 'Drive Up', desc: 'Push through your heels to return to the starting position. Squeeze your glutes at the top.' },
];

export default function SquatPage() {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>

            {/* Header */}
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate('/exercises')}>← Back</button>
                <h1 style={styles.logo}>PoseFit</h1>
                <div style={{ width: '80px' }} />
            </div>

            {/* Hero */}
            <div style={styles.hero}>
                <div style={styles.heroLeft}>
                    <span style={styles.categoryTag}>🏋️ Legs · Beginner</span>
                    <h1 style={styles.heroTitle}>Squat</h1>
                    <p style={styles.heroDesc}>
                        The squat is one of the most fundamental movements in fitness. It trains nearly every muscle in your lower body, builds functional strength, and improves balance and coordination.
                    </p>
                    <div style={styles.statsRow}>
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>15</span>
                            <span style={styles.statLabel}>Reps</span>
                        </div>
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>3</span>
                            <span style={styles.statLabel}>Sets</span>
                        </div>
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>~200</span>
                            <span style={styles.statLabel}>Calories</span>
                        </div>
                        <div style={styles.statBox}>
                            <span style={styles.statValue}>10min</span>
                            <span style={styles.statLabel}>Duration</span>
                        </div>
                    </div>
                    <button style={styles.startBtn} onClick={() => { }}>
                        Start Now 🚀
                    </button>
                </div>

                <div style={styles.heroRight}>
                    <div style={styles.poseCard}>
                        <div style={styles.poseEmoji}>🏋️</div>
                        <p style={styles.poseLabel}>Squat Position</p>
                    </div>
                </div>
            </div>

            {/* How to Perform */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>How to Perform</h2>
                <div style={styles.stepsGrid}>
                    {steps.map((step) => (
                        <div key={step.num} style={styles.stepCard}>
                            <div style={styles.stepNum}>{step.num}</div>
                            <h3 style={styles.stepTitle}>{step.title}</h3>
                            <p style={styles.stepDesc}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Benefits */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Benefits</h2>
                <div style={styles.benefitsGrid}>
                    {benefits.map((b, i) => (
                        <div key={i} style={styles.benefitCard}>
                            <span style={styles.benefitIcon}>{b.icon}</span>
                            <div>
                                <h4 style={styles.benefitTitle}>{b.title}</h4>
                                <p style={styles.benefitDesc}>{b.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tips */}
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Tips & Reminders</h2>
                <div style={styles.tipsBox}>
                    {[
                        '✅ Keep your back straight throughout the movement.',
                        '✅ Do not let your knees cave inward.',
                        '✅ Breathe in as you go down, breathe out as you rise.',
                        '✅ Start with bodyweight before adding resistance.',
                        '⚠️ Stop if you feel any sharp pain in your knees or lower back.',
                    ].map((tip, i) => (
                        <p key={i} style={styles.tip}>{tip}</p>
                    ))}
                </div>
            </div>

            {/* Bottom CTA */}
            <div style={styles.bottomCTA}>
                <p style={styles.ctaText}>Ready to get moving?</p>
                <button style={styles.startBtn} onClick={() => { }}>
                    Start Now 🚀
                </button>
            </div>

        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'Segoe UI, sans-serif' },

    // Header
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, background: '#0f172a', zIndex: 10 },
    logo: { color: '#38bdf8', margin: 0, fontSize: '1.4rem' },
    backBtn: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },

    // Hero
    hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '60px 40px', maxWidth: '1100px', margin: '0 auto', gap: '40px', flexWrap: 'wrap' },
    heroLeft: { flex: 1, minWidth: '280px' },
    categoryTag: { background: '#1e293b', color: '#38bdf8', padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600 },
    heroTitle: { fontSize: '3.5rem', fontWeight: 800, color: '#f1f5f9', margin: '16px 0 16px', lineHeight: 1.1 },
    heroDesc: { color: '#94a3b8', fontSize: '15px', lineHeight: '1.8', marginBottom: '30px', maxWidth: '500px' },
    statsRow: { display: 'flex', gap: '16px', marginBottom: '36px', flexWrap: 'wrap' },
    statBox: { background: '#1e293b', borderRadius: '12px', padding: '14px 20px', textAlign: 'center', border: '1px solid #334155' },
    statValue: { display: 'block', fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' },
    statLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
    startBtn: { padding: '15px 40px', background: '#38bdf8', color: '#0f172a', fontWeight: 800, fontSize: '16px', border: 'none', borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.3px' },
    heroRight: { display: 'flex', justifyContent: 'center' },
    poseCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '24px', width: '260px', height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' },
    poseEmoji: { fontSize: '6rem', marginBottom: '16px' },
    poseLabel: { color: '#64748b', fontSize: '13px' },

    // Sections
    section: { padding: '40px 40px', maxWidth: '1100px', margin: '0 auto' },
    sectionTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '24px', borderLeft: '4px solid #38bdf8', paddingLeft: '14px' },

    // Steps
    stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
    stepCard: { background: '#1e293b', borderRadius: '14px', padding: '24px', border: '1px solid #334155' },
    stepNum: { fontSize: '2rem', fontWeight: 800, color: '#38bdf8', opacity: 0.5, marginBottom: '10px' },
    stepTitle: { fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' },
    stepDesc: { color: '#94a3b8', fontSize: '13px', lineHeight: '1.7' },

    // Benefits
    benefitsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' },
    benefitCard: { background: '#1e293b', borderRadius: '14px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start', border: '1px solid #334155' },
    benefitIcon: { fontSize: '1.8rem' },
    benefitTitle: { fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' },
    benefitDesc: { color: '#94a3b8', fontSize: '12px', lineHeight: '1.6' },

    // Tips
    tipsBox: { background: '#1e293b', borderRadius: '14px', padding: '28px', border: '1px solid #334155' },
    tip: { color: '#cbd5e1', fontSize: '14px', marginBottom: '12px', lineHeight: '1.7' },

    // Bottom CTA
    bottomCTA: { textAlign: 'center', padding: '60px 40px' },
    ctaText: { color: '#64748b', fontSize: '15px', marginBottom: '16px' },
};