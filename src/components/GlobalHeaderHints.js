import React from 'react';
import { useLocation } from 'react-router-dom';
import { Command } from 'lucide-react';
import '../styles/App.css'; // Ensure styles are available

const GlobalHeaderHints = () => {
    const location = useLocation();

    // Don't show Ctrl+K hint on Recruiter Outreach page (it has Ctrl+J)
    // Also optionally exclude Login or other specific pages if needed
    if (location.pathname === '/recruiter-outreach' || location.pathname === '/login') {
        return null;
    }

    return (
        <div className="global-header-hint-container">
            <div className="hotkey-hint-badge" title="Press Ctrl+K (or Cmd+K) to open the Command Center">
                <span className="hotkey-key">Ctrl</span> + <span className="hotkey-key">K</span>
                <span className="hotkey-label">Command Center</span>
            </div>
        </div>
    );
};

export default GlobalHeaderHints;
