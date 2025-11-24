import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/App.css';

const FeatureBanner = () => {
    const [isDismissed, setIsDismissed] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // Check if user has dismissed the banner
        const dismissed = localStorage.getItem('featureBannerDismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('featureBannerDismissed', 'true');
        setIsDismissed(true);
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    if (isDismissed) return null;

    return (
        <div className="feature-banner">
            <div className="feature-banner-header" onClick={toggleExpand}>
                <div className="feature-banner-title">
                    <Lightbulb size={18} className="feature-icon" />
                    <span className="feature-text">New Features</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                <button
                    className="feature-banner-close"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss();
                    }}
                    title="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>

            {isExpanded && (
                <div className="feature-banner-content">
                    <div className="feature-item">
                        <div className="feature-shortcut">
                            <span className="hotkey-key">Ctrl</span> + <span className="hotkey-key">K</span>
                        </div>
                        <div className="feature-description">
                            <strong>Command Center</strong> - Quickly search candidates, jobs, and clients from anywhere
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-shortcut">
                            <span className="hotkey-key">Ctrl</span> + <span className="hotkey-key">J</span>
                        </div>
                        <div className="feature-description">
                            <strong>Quick Add</strong> - Instantly add a new candidate to your outreach pipeline
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeatureBanner;
