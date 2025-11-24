import React from 'react';
import { motion } from 'framer-motion';
import './WelcomeScreen.css';
import logo from '../assets/logo.png';

const WelcomeScreen = () => {
    return (
        <motion.div
            className="welcome-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
        >
            <div className="holo-grid"></div>

            <div className="welcome-content">
                <img src={logo} alt="Hire Logic" className="welcome-logo" />

                <motion.h1
                    className="welcome-title"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    HIRE LOGIC
                </motion.h1>

                <motion.p
                    className="welcome-subtitle"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    Advanced Recruitment Intelligence System
                </motion.p>

                <motion.div
                    className="welcome-instruction"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                >
                    Select a module to begin
                </motion.div>
            </div>
        </motion.div>
    );
};

export default WelcomeScreen;
