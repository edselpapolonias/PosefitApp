import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// ─── Data ─────────────────────────────────────────────────────────────────────
const steps = [
    { num: 1, text: 'Stand with feet shoulder-width apart, toes slightly turned out.' },
    { num: 2, text: 'Brace your core and keep your chest tall as you begin to lower.' },
    { num: 3, text: 'Push knees out in line with your toes as you descend.' },
    { num: 4, text: 'Lower until thighs are at least parallel to the floor.' },
    { num: 5, text: 'Drive through your heels to return to standing.' },
];

const tips = [
    'Keep your weight in your heels',
    "Don't let knees cave inward",
    'Look straight ahead throughout',
];

// ─── Component ────────────────────────────────────────────────────────────────
// ─── Options ──────────────────────────────────────────────────────────────────
const setsOptions = [2, 3, 4, 5, 6];
const repsOptions = [8, 10, 12, 15, 18];
const restOptions = [10, 20, 30, 60];

export default function SquatPage() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const initials = user
        ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
        : 'U';

    const [sets, setSets] = useState(3);
    const [reps, setReps] = useState(12);
    const [rest, setRest] = useState(60);

    return (
        <div style={s.page}>

            {/* ─── Top Nav / Breadcrumb ─────────────────────────────── */}
            <motion.nav
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={s.nav}
            >
                <div style={s.breadcrumb}>
                    <button
                        id="back-to-exercises"
                        onClick={() => navigate('/exercises')}
                        style={s.breadcrumbLink}
                        onMouseEnter={e => e.currentTarget.style.color = '#F15025'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888'}
                    >
                        ← Exercises
                    </button>
                    <span style={s.breadcrumbSep}>/</span>
                    <span style={s.breadcrumbCurrent}>Squat</span>
                </div>

                <div id="user-avatar" style={s.avatar}>{initials}</div>
            </motion.nav>

            {/* ─── Main Content ─────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                style={s.main}
            >
                <div style={s.grid}>

                    {/* ═══════════ LEFT COLUMN ═══════════ */}
                    <div style={s.leftCol}>

                        {/* Illustration / Pose Guide Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                            style={s.illustrationCard}
                        >
                            <span style={{ fontSize: '4rem' }}>🏋️</span>
                            <p style={s.illustrationLabel}>Illustration / pose guide</p>
                        </motion.div>

                        {/* Title & Description */}
                        <h1 style={s.title}>Squat</h1>
                        <p style={s.description}>
                            A compound lower-body movement targeting glutes, quads, and hamstrings
                            while engaging your core for stability. Great for building strength and overall
                            mobility.
                        </p>

                        {/* How to Perform */}
                        <h2 style={s.sectionLabel}>HOW TO PERFORM</h2>

                        <div style={s.stepsList}>
                            {steps.map((step, i) => (
                                <motion.div
                                    key={step.num}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.35, delay: 0.2 + i * 0.07 }}
                                    style={s.stepRow}
                                >
                                    <div style={s.stepCircle}>{step.num}</div>
                                    <p style={s.stepText}>{step.text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* ═══════════ RIGHT COLUMN ═══════════ */}
                    <div style={s.rightCol}>

                        {/* Stat Card — Sets */}
                        <motion.div
                            whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(241,80,37,0.1)' }}
                            style={s.statCard}
                        >
                            <p style={s.statLabel}>Sets</p>
                            <div style={s.optionsRow}>
                                {setsOptions.map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setSets(val)}
                                        style={sets === val ? s.optionActive : s.optionInactive}
                                        onMouseEnter={e => { if (sets !== val) e.currentTarget.style.borderColor = '#F15025'; }}
                                        onMouseLeave={e => { if (sets !== val) e.currentTarget.style.borderColor = '#E6E8E6'; }}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Stat Card — Reps per set */}
                        <motion.div
                            whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(241,80,37,0.1)' }}
                            style={s.statCard}
                        >
                            <p style={s.statLabel}>Reps per set</p>
                            <div style={s.optionsRow}>
                                {repsOptions.map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setReps(val)}
                                        style={reps === val ? s.optionActive : s.optionInactive}
                                        onMouseEnter={e => { if (reps !== val) e.currentTarget.style.borderColor = '#F15025'; }}
                                        onMouseLeave={e => { if (reps !== val) e.currentTarget.style.borderColor = '#E6E8E6'; }}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Stat Card — Rest between sets */}
                        <motion.div
                            whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(241,80,37,0.1)' }}
                            style={s.statCard}
                        >
                            <p style={s.statLabel}>Rest between sets</p>
                            <div style={s.optionsRow}>
                                {restOptions.map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setRest(val)}
                                        style={rest === val ? s.optionActive : s.optionInactive}
                                        onMouseEnter={e => { if (rest !== val) e.currentTarget.style.borderColor = '#F15025'; }}
                                        onMouseLeave={e => { if (rest !== val) e.currentTarget.style.borderColor = '#E6E8E6'; }}
                                    >
                                        {val}s
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Tips Card */}
                        <div style={s.tipsCard}>
                            <div style={s.tipsHeader}>
                                <span style={{ fontSize: '1rem' }}>✨</span>
                                <span style={s.tipsTitle}>Tips</span>
                            </div>
                            {tips.map((tip, i) => (
                                <div key={i} style={s.tipRow}>
                                    <span style={s.tipCheck}>✓</span>
                                    <span style={s.tipText}>{tip}</span>
                                </div>
                            ))}
                        </div>

                        {/* Start Now Button */}
                        <motion.button
                            id="start-now-btn"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(`/exercises/squat/start?sets=${sets}&reps=${reps}&rest=${rest}`)}
                            style={s.startBtn}
                            onMouseEnter={e => e.currentTarget.style.background = '#d9441c'}
                            onMouseLeave={e => e.currentTarget.style.background = '#F15025'}
                        >
                            Start Now ▶
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ═══════════════════════ STYLES ═══════════════════════ */

const s = {
    // Page
    page: {
        minHeight: '100vh',
        background: '#F7F7F7',
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
        color: '#222',
    },

    // Nav
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
    breadcrumbLink: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '14px',
        cursor: 'pointer',
        fontWeight: 500,
        fontFamily: 'inherit',
        padding: 0,
        transition: 'color 0.2s',
    },
    breadcrumbSep: { color: '#CED0CE', fontWeight: 400 },
    breadcrumbCurrent: { fontWeight: 700, color: '#222' },
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

    // Main
    main: {
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '32px 28px 48px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: '32px',
        alignItems: 'start',
    },

    // Left Column
    leftCol: {},

    // Illustration Card
    illustrationCard: {
        borderRadius: '16px',
        border: '2px dashed #CED0CE',
        background: '#FFFFFF',
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        marginBottom: '24px',
    },
    illustrationLabel: {
        color: '#999',
        fontSize: '13px',
        fontWeight: 500,
        marginTop: '12px',
        letterSpacing: '0.3px',
    },

    // Title & Description
    title: {
        fontSize: '2rem',
        fontWeight: 800,
        color: '#222',
        margin: '0 0 10px',
        lineHeight: 1.2,
    },
    description: {
        color: '#666',
        fontSize: '14px',
        lineHeight: '1.7',
        margin: '0 0 28px',
        maxWidth: '480px',
    },

    // How to Perform
    sectionLabel: {
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: '#999',
        margin: '0 0 20px',
    },
    stepsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    stepRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
    },
    stepCircle: {
        flexShrink: 0,
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '2px solid #F15025',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 700,
        color: '#F15025',
        background: 'transparent',
    },
    stepText: {
        color: '#444',
        fontSize: '14px',
        lineHeight: '1.6',
        margin: 0,
        paddingTop: '4px',
    },



    // Right Column
    rightCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'sticky',
        top: '80px',
    },

    // Stat Cards
    statCard: {
        borderRadius: '16px',
        background: '#FFFFFF',
        border: '1px solid #E6E8E6',
        padding: '18px 22px',
        cursor: 'default',
        transition: 'box-shadow 0.2s',
    },
    statLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        margin: '0 0 4px',
        textAlign: 'center',
    },
    statValue: {
        fontSize: '1.8rem',
        fontWeight: 800,
        color: '#F15025',
        margin: 0,
        lineHeight: 1.2,
    },

    // Option pills
    optionsRow: {
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: '8px',
    },
    optionActive: {
        padding: '8px 20px',
        borderRadius: '999px',
        border: '2px solid #F15025',
        background: '#F15025',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s',
    },
    optionInactive: {
        padding: '8px 20px',
        borderRadius: '999px',
        border: '2px solid #E6E8E6',
        background: '#fff',
        color: '#444',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s',
    },

    // Tips Card
    tipsCard: {
        borderRadius: '16px',
        background: '#FFF5F2',
        border: '1px solid rgba(241,80,37,0.15)',
        padding: '20px 22px',
    },
    tipsHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '14px',
    },
    tipsTitle: {
        fontSize: '14px',
        fontWeight: 700,
        color: '#222',
    },
    tipRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        marginBottom: '8px',
    },
    tipCheck: {
        color: '#22c55e',
        fontWeight: 700,
        fontSize: '15px',
        lineHeight: '1.4',
    },
    tipText: {
        fontSize: '13px',
        color: '#444',
        lineHeight: '1.5',
    },

    // Start Now Button
    startBtn: {
        width: '100%',
        padding: '16px 24px',
        borderRadius: '999px',
        background: '#F15025',
        color: '#FFFFFF',
        fontSize: '15px',
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(241,80,37,0.25)',
        fontFamily: 'inherit',
        letterSpacing: '0.3px',
        transition: 'background 0.2s',
    },
};