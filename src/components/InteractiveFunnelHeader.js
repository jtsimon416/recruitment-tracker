import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronRight, Users } from 'lucide-react';
import './InteractiveFunnelHeader.css';

// Define stage configuration with colors and labels
const FUNNEL_STAGES = [
    { id: 'Screening', label: 'Screening', color: 'var(--soft-lavender)', glowClass: 'screening-glow' },
    { id: 'Submit to Client', label: 'Submission', color: 'var(--peachy-rose)', glowClass: 'submission-glow' },
    { id: 'Interview 1', label: 'Interview 1', color: 'var(--dusty-pink)', glowClass: 'interview-glow' },
    { id: 'Interview 2', label: 'Interview 2', color: 'var(--rose-gold)', glowClass: 'interview-glow' },
    { id: 'Offer', label: 'Offer', color: 'var(--accent-green)', glowClass: 'offer-glow' },
    { id: 'Hired', label: 'Hired', color: 'var(--accent-blue)', glowClass: 'hired-glow' }
];

const InteractiveFunnelHeader = ({ pipelineData, selectedStage, onStageSelect }) => {

    // Calculate counts for each stage
    const stageCounts = useMemo(() => {
        const counts = {};
        FUNNEL_STAGES.forEach(stage => {
            counts[stage.id] = 0;
        });

        // Also track 'Rejected' though it's not in the main funnel visual
        counts['Rejected'] = 0;

        if (pipelineData) {
            pipelineData.forEach(candidate => {
                if (counts.hasOwnProperty(candidate.stage)) {
                    counts[candidate.stage]++;
                } else if (candidate.stage === 'Rejected') {
                    counts['Rejected']++;
                }
            });
        }
        return counts;
    }, [pipelineData]);

    const totalActive = useMemo(() => {
        return FUNNEL_STAGES.reduce((acc, stage) => acc + (stageCounts[stage.id] || 0), 0);
    }, [stageCounts]);

    return (
        <div className="funnel-container">
            <div className="funnel-title">
                <Filter size={16} />
                <span>Pipeline Funnel</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>
                    Total Active: <strong>{totalActive}</strong>
                </span>
            </div>

            <div className="funnel-track">
                {FUNNEL_STAGES.map((stage, index) => {
                    const count = stageCounts[stage.id] || 0;
                    const isActive = selectedStage === stage.id;
                    const isAllSelected = selectedStage === 'all';

                    // Calculate width percentage - simple equal distribution for now
                    // Could be dynamic based on count, but equal looks better for UI

                    return (
                        <motion.div
                            key={stage.id}
                            className={`funnel-slice ${isActive ? 'active' : ''} ${isActive ? stage.glowClass : ''}`}
                            onClick={() => onStageSelect(isActive ? 'all' : stage.id)} // Toggle off if clicked again
                            style={{ color: stage.color }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, zIndex: 10 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="slice-content">
                                <motion.span
                                    className="slice-count"
                                    key={count} // Trigger animation on count change
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                >
                                    {count}
                                </motion.span>
                                <span className="slice-label">{stage.label}</span>
                            </div>

                            {/* Connector Arrow (except for last item) */}
                            {index < FUNNEL_STAGES.length - 1 && (
                                <div className="funnel-connector">
                                    <ChevronRight size={16} />
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default InteractiveFunnelHeader;
