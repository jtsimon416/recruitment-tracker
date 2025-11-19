import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix 1: LoginPage.css is in src/styles, so the path is relative from src/index.js
import './index.css'; 
import App from './App';
import reportWebVitals from './reportWebVitals';
// New Import for Director Review Styles
import './styles/DirectorReview.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();