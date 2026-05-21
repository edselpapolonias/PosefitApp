import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function LoginPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ first_name: '', last_name: '', password: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post('http://localhost:8000/api/users/login/', form, { withCredentials: true });
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/exercises');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.logo}>PoseFit</h1>
                <h2 style={styles.title}>Welcome back</h2>
                {error && <p style={styles.error}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input style={styles.input} name="first_name" placeholder="First Name" onChange={handleChange} required />
                    <input style={styles.input} name="last_name" placeholder="Last Name" onChange={handleChange} required />
                    <input style={styles.input} name="password" type="password" placeholder="Password" onChange={handleChange} required />
                    <button style={styles.button} type="submit">Log In</button>
                </form>
                <p style={styles.link}>Don't have an account? <Link to="/register">Register</Link></p>
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' },
    card: { background: '#1e293b', padding: '40px', borderRadius: '16px', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' },
    logo: { color: '#38bdf8', textAlign: 'center', fontSize: '2rem', margin: '0 0 4px' },
    title: { color: '#e2e8f0', textAlign: 'center', fontSize: '1.1rem', fontWeight: 400, margin: '0 0 24px' },
    input: { width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box' },
    button: { width: '100%', padding: '13px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', fontSize: '15px', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '4px' },
    error: { color: '#f87171', textAlign: 'center', marginBottom: '12px', fontSize: '13px' },
    link: { color: '#94a3b8', textAlign: 'center', marginTop: '16px', fontSize: '13px' },
};