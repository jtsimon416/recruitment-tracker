import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import '../styles/LoginPage.css';

function Login() {
  const navigate = useNavigate();
  const { session } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setIsError(true);
    } else {
      setMessage('Login successful! Redirecting...');
      setIsError(false);
      // Navigation will happen automatically via useEffect when session updates
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Animated Background Particles */}
      <div className="login-bg-particles"></div>

      {/* Shooting Stars */}
      <div className="login-shooting-star login-star-1"></div>
      <div className="login-shooting-star login-star-2"></div>
      <div className="login-shooting-star login-star-3"></div>

      {/* Floating Orbs */}
      <div className="login-floating-orb login-orb-1"></div>
      <div className="login-floating-orb login-orb-2"></div>

      {/* Login Container */}
      <div className="login-container">
        <div className="branding-area">
          <div className="logo-container">
            <h1>HIRE LOGIC</h1>
          </div>
          <p className="tagline-p">recruitment excellence</p>
        </div>

        <form onSubmit={handleLogin} className="form-card">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Sign In
          </button>
        </form>

        {message && (
          <div className={`message-box ${isError ? 'message-error' : 'message-success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;