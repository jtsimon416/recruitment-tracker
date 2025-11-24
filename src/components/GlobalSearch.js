import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Search, User, Briefcase, Building, ArrowRight } from 'lucide-react';
import './GlobalSearch.css';

const GlobalSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const { candidates, positions, clients, pipeline } = useData();

    // Toggle search with Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            } else if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            setQuery('');
            setActiveIndex(0);
        }
    }, [isOpen]);

    // Filter Logic with metadata
    const results = useMemo(() => {
        if (!query.trim()) return [];

        const lowerQuery = query.toLowerCase();
        const limit = 5;

        const matchedCandidates = candidates
            .filter(c => c.name.toLowerCase().includes(lowerQuery))
            .slice(0, limit)
            .map(c => {
                // Build metadata string with location and phone
                const metaParts = [];
                if (c.location) metaParts.push(c.location);
                if (c.phone) metaParts.push(c.phone);
                const metadata = metaParts.length > 0 ? metaParts.join(' • ') : 'No location or phone';

                return {
                    type: 'candidate',
                    id: c.id,
                    title: c.name,
                    subtitle: c.email || 'No email',
                    metadata: metadata,
                    icon: User,
                    link: '/talent-pool',
                    state: { openCandidateId: c.id }
                };
            });

        const matchedPositions = positions
            .filter(p => p.title.toLowerCase().includes(lowerQuery))
            .slice(0, limit)
            .map(p => {
                // Count active candidates for this position
                const activeCandidates = pipeline.filter(
                    pip => pip.position_id === p.id && pip.status === 'Active'
                ).length;

                return {
                    type: 'position',
                    id: p.id,
                    title: p.title,
                    subtitle: p.clients?.company_name || 'Unknown Client',
                    metadata: `${p.status || 'Active'} • ${activeCandidates} candidate${activeCandidates !== 1 ? 's' : ''}`,
                    icon: Briefcase,
                    link: '/positions'
                };
            });

        const matchedClients = clients
            .filter(c => c.company_name.toLowerCase().includes(lowerQuery))
            .slice(0, limit)
            .map(c => {
                // Count active positions for this client
                const activePositions = positions.filter(
                    p => p.client_id === c.id && p.status !== 'Closed'
                ).length;

                return {
                    type: 'client',
                    id: c.id,
                    title: c.company_name,
                    subtitle: c.industry || 'Industry not specified',
                    metadata: `${activePositions} active position${activePositions !== 1 ? 's' : ''}`,
                    icon: Building,
                    link: '/clients'
                };
            });

        return [...matchedCandidates, ...matchedPositions, ...matchedClients];
    }, [query, candidates, positions, clients, pipeline]);

    // Keyboard Navigation
    useEffect(() => {
        const handleNavigation = (e) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + results.length) % results.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[activeIndex]) {
                    handleSelect(results[activeIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleNavigation);
        return () => window.removeEventListener('keydown', handleNavigation);
    }, [isOpen, results, activeIndex]);

    const handleSelect = (item) => {
        setIsOpen(false);
        navigate(item.link, { state: item.state });
    };

    if (!isOpen) return null;

    return (
        <div className="global-search-overlay" onClick={() => setIsOpen(false)}>
            <div className="global-search-container" onClick={e => e.stopPropagation()}>
                <div className="global-search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="global-search-input"
                        placeholder="Search candidates, jobs, clients..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <span className="esc-hint">ESC</span>
                </div>

                <div className="global-search-results">
                    {results.length === 0 && query && (
                        <div className="no-results">
                            <p>No results found for "{query}"</p>
                        </div>
                    )}

                    {results.length === 0 && !query && (
                        <div className="no-results">
                            <p>Type to search...</p>
                        </div>
                    )}

                    {results.map((item, index) => (
                        <div
                            key={`${item.type}-${item.id}`}
                            className={`search-result-item ${index === activeIndex ? 'active' : ''}`}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            <div className="result-icon">
                                <item.icon size={18} />
                            </div>
                            <div className="result-content">
                                <span className="result-title">{item.title}</span>
                                <span className="result-subtext">{item.subtitle}</span>
                                {item.metadata && <span className="result-metadata">{item.metadata}</span>}
                            </div>
                            {index === activeIndex && <ArrowRight size={16} className="enter-icon" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
