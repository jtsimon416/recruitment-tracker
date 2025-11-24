import React from 'react';
import { motion } from 'framer-motion';

const QuestionForm = ({ questions, answers, onAnswerChange, onSubmit, isSubmitting }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ padding: '2rem' }}
        >
            <h3 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                Just a few questions...
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
                Please answer the following screening questions for this position.
            </p>

            {questions.map((question, index) => (
                <div key={index} style={{ marginBottom: '1.5rem' }}>
                    <label
                        style={{
                            display: 'block',
                            color: '#cbd5e1',
                            marginBottom: '0.5rem',
                            fontWeight: 500
                        }}
                    >
                        {index + 1}. {question}
                    </label>
                    <input
                        type="text"
                        value={answers[index] || ''}
                        onChange={(e) => onAnswerChange(index, e.target.value)}
                        placeholder="Your answer..."
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            fontSize: '1rem'
                        }}
                    />
                </div>
            ))}

            <button
                onClick={onSubmit}
                disabled={isSubmitting}
                style={{
                    background: '#e11d48',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 3rem',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    width: '100%',
                    marginTop: '1rem'
                }}
            >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
        </motion.div>
    );
};

export default QuestionForm;
