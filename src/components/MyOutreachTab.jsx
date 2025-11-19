import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useOutreachSearch } from '../hooks/useOutreachSearch';
import SearchResultBox from './SearchResultBox';
import { Sparkles, Search, MapPin, Code } from 'lucide-react';
import '../styles/RecruiterOutreach.css';

const MyOutreachTab = () => {
    const { positions } = useData();

    // Initialize from localStorage if available
    const [selectedRoleId, setSelectedRoleId] = useState(() => {
        return localStorage.getItem('last_outreach_role_id') || '';
    });

    const [location, setLocation] = useState('');
    const [skills, setSkills] = useState('');

    const { generateSearch, loading, error, results, loadSavedResults } = useOutreachSearch();

    // Filter for open positions only
    const openPositions = positions.filter(p => p.status === 'Open');

    // Load saved results when role is selected
    useEffect(() => {
        if (selectedRoleId) {
            loadSavedResults(selectedRoleId);
        }
    }, [selectedRoleId]);

    const handleRoleChange = (e) => {
        const newRoleId = e.target.value;
        setSelectedRoleId(newRoleId);
        localStorage.setItem('last_outreach_role_id', newRoleId);
    };

    const handleGenerate = () => {
        if (!selectedRoleId) return;

        const role = openPositions.find(p => p.id === selectedRoleId);
        if (role) {
            generateSearch(role.title, location, skills, selectedRoleId);
        }
    };

    return (
        <div className="my-outreach-tab">
            <div className="outreach-search-container">
                <div className="search-form-card">
                    <div className="card-header-with-icon">
                        <div className="icon-wrapper">
                            <Sparkles className="header-icon" size={24} />
                        </div>
                        <div className="header-text">
                            <h3>AI Boolean Search Generator</h3>
                            <p className="form-description">
                                Generate tiered LinkedIn Boolean search strings optimized for your open roles.
                            </p>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Select Role <span className="required">*</span></label>
                            <div className="input-with-icon">
                                <Search size={18} />
                                <select
                                    value={selectedRoleId}
                                    onChange={handleRoleChange}
                                    className="form-select"
                                >
                                    <option value="">-- Select an Open Role --</option>
                                    {openPositions.map(pos => (
                                        <option key={pos.id} value={pos.id}>{pos.title} - {pos.clients?.company_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <div className="input-with-icon">
                                <MapPin size={18} />
                                <input
                                    type="text"
                                    placeholder="e.g. New York, Remote, EMEA"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Extra Skills / Keywords</label>
                            <div className="input-with-icon">
                                <Code size={18} />
                                <input
                                    type="text"
                                    placeholder="e.g. SaaS, Startup, 'Series A'"
                                    value={skills}
                                    onChange={(e) => setSkills(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <span className="limit-note">Limit: 2 searches per role per day</span>
                        <button
                            className="btn-generate-ai"
                            onClick={handleGenerate}
                            disabled={loading || !selectedRoleId}
                        >
                            {loading ? (
                                <>
                                    <Sparkles className="spinning" size={18} /> Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} /> Generate Search Strings
                                </>
                            )}
                        </button>
                    </div>

                    {error && <div className="error-message-box">{error}</div>}
                </div>

                {results && (
                    <div className="results-grid">
                        <SearchResultBox
                            title="Unicorn (Top 5%)"
                            data={results.unicorn}
                            colorClass="result-unicorn"
                            iconType="unicorn"
                        />
                        <SearchResultBox
                            title="Strong (Top 20%)"
                            data={results.strong}
                            colorClass="result-strong"
                            iconType="strong"
                        />
                        <SearchResultBox
                            title="Acceptable (Top 50%)"
                            data={results.acceptable}
                            colorClass="result-acceptable"
                            iconType="acceptable"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyOutreachTab;
