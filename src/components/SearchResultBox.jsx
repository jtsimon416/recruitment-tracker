import React, { useState } from 'react';
import { Copy, Check, Sparkles, Zap, CheckCircle } from 'lucide-react';
import '../styles/RecruiterOutreach.css';

const SearchResultBox = ({ title, data, colorClass, iconType }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (data?.search) {
            navigator.clipboard.writeText(data.search);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!data) return null;

    const getIcon = () => {
        switch (iconType) {
            case 'unicorn': return <Sparkles size={20} />;
            case 'strong': return <Zap size={20} />;
            case 'acceptable': return <CheckCircle size={20} />;
            default: return <Sparkles size={20} />;
        }
    };

    return (
        <div className={`search-result-card ${colorClass}`}>
            <div className="result-card-header">
                <div className="header-title">
                    {getIcon()}
                    <h4>{title}</h4>
                </div>
                <button
                    className={`btn-copy-icon ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                    title="Copy to Clipboard"
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
            </div>

            <div className="result-card-body">
                <div className="code-block-container">
                    <pre className="search-code-block">
                        <code>{data.search}</code>
                    </pre>
                </div>

                <div className="explanation-section">
                    <h5>Why this works:</h5>
                    <p>{data.explanation}</p>
                </div>
            </div>
        </div>
    );
};

export default SearchResultBox;
