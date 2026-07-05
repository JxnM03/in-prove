import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post(
                'http://localhost:3001/api/auth/login',
                { username, password }
            );
            onLogin(response.data.token, response.data.athlete);
        } catch (err) {
            setError('Invalid username or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-shell">
            <div className="login-card card">
                <div className="login-header">
                    <div className="brand-mark">in:prove</div>
                    <p>Smart food tracking for athletes</p>
                </div>

                <div className="login-form">
                    <div className="login-field">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            ❌ {error}
                        </div>
                    )}

                    <button
                        className="btn-primary login-btn"
                        onClick={handleSubmit}
                        disabled={isLoading || !username || !password}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;