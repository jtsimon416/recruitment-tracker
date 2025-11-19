import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/HireLogicChat.css';
import { Sparkles } from 'lucide-react';
import { supabase } from '../services/supabaseClient'; // Import Supabase client

const HireLogicChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tabTop, setTabTop] = useState(80); // Initial top position
  const [startY, setStartY] = useState(0); // Y-coordinate where drag started
  const [startTop, setStartTop] = useState(0); // Initial top of the tab when drag started
  const [messages, setMessages] = useState([]); // Stores chat messages
  const [inputMessage, setInputMessage] = useState(''); // Current message in input
  const [isLoading, setIsLoading] = useState(false); // Loading state for AI response
  const chatMessagesRef = useRef(null); // Ref for scrolling chat messages

  const location = useLocation();

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const newUserMessage = { sender: 'user', text: messageText };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'hire-logic-ai', // Your Supabase Edge Function name
        {
          body: JSON.stringify({ userQuestion: messageText }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (error) {
        console.error('Supabase function error:', error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'ai', text: 'Sorry, I encountered an error. Please try again.' },
        ]);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'ai', text: data.answer },
        ]);
      }
    } catch (error) {
      console.error('Error invoking Supabase function:', error);
      setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'ai', text: 'Sorry, I encountered an error. Please try again.' },
        ]);
    } finally {
      setIsLoading(false);
    }
  };
  const getFaqsForPage = (pathname) => {
    // Define page-specific FAQs here
    const faqs = {
      '/dashboard': [
        'What are the key metrics on this dashboard?',
        'How are my weekly stats calculated?',
        'Can you summarize the team pipeline?',
        'What do the different colors on the funnel mean?',
      ],
      '/activetracker': [
        'How do I move a candidate to the next stage?',
        'What does the "Hire Logic AI" button do?',
        'Can I filter candidates by position?',
        'How is the "Days in Stage" calculated?',
      ],
      // Add more pages and their FAQs as needed
      '/talentpool': [
        'How do I add a new candidate?',
        'What is the difference between "Add to Pipeline" and "Not a Fit"?',
        'Can I search for candidates with specific skills?',
        'How do I view a candidate\'s resume?',
      ],
      '/directorreview': [
        'What is the purpose of the Director Review stage?',
        'How do I approve or reject a candidate?',
        'Can I see the AI analysis for a candidate?',
        'What happens after I make a decision?',
      ],
      '/positions': [
        'How do I create a new position?',
        'Can I edit an existing job description?',
        'What does the "Active" status mean?',
        'How do I see the candidates for a specific position?',
      ],
      '/clients': [
        'How do I add a new client?',
        'Can I associate multiple positions with one client?',
        'Where can I store client contact information?',
        'How do I view our history with a client?',
      ],
      '/recruiters': [
        'How do I add a new recruiter to the team?',
        'Can I see a recruiter\'s performance metrics?',
        'What are the different roles a recruiter can have?',
        'How do I assign a recruiter to a position?',
      ],
      '/commissions': [
        'How are commissions calculated?',
        'Can I see a breakdown of my earnings?',
        'When are commission payouts processed?',
        'Is there a history of past commissions?',
      ],
      '/companydocuments': [
        'How do I upload a new company document?',
        'Can I organize documents into folders?',
        'Who has access to these documents?',
        'How do I share a document with someone?',
      ],
    };
    return faqs[pathname] || [
      'What can you do?',
      'How do I navigate to the dashboard?',
      'Can you explain the talent pool?',
      'How do I add a new client?'
    ];
  };

  const faqs = getFaqsForPage(location.pathname);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleMouseDown = (e) => {
    if (isHovered || isOpen) { // Only allow dragging when expanded
      setIsDragging(true);
      setStartY(e.clientY);
      setStartTop(tabTop);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const newTop = startTop + deltaY;

    // Prevent dragging off-screen vertically
    const minTop = 0;
    const maxTop = window.innerHeight - 50; // Assuming tab height is around 50px
    setTabTop(Math.max(minTop, Math.min(newTop, maxTop)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, startTop]);

  // Scroll to bottom of chat messages when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);


  return (
    <>
      <div
        className={`hire-logic-tab ${isOpen ? 'hidden' : ''} ${isDragging ? 'dragging' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={toggleChat}
        onMouseDown={handleMouseDown}
        style={{ top: `${tabTop}px` }}
      >
        <div className="sparkle-icon">
          <Sparkles size={24} />
        </div>
        <span className={`tab-text ${isHovered || isOpen ? 'visible' : ''}`}>
          ASK HIRE LOGIC AI ASSISTANT
        </span>
      </div>

      {isOpen && (
        <div className="hire-logic-chat-window">
          <div className="chat-header">
            <h3>Hire Logic AI Assistant <span className="sparkle-header-icon"><Sparkles size={20} /></span></h3>
            <button onClick={toggleChat} className="close-chat-btn">&times;</button>
          </div>
          <div className="chat-body">
            <div className="chat-messages" ref={chatMessagesRef}>
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
              {isLoading && (
                <div className="chat-message ai loading">
                  Thinking...
                </div>
              )}
            </div>
          </div>
          {messages.length === 0 && (
            <div className="faq-section">
              <h4>Frequently Asked Questions</h4>
              <div className="faq-buttons">
                {faqs.map((faq, index) => (
                  <button key={index} className="faq-btn" onClick={() => handleSendMessage(faq)} disabled={isLoading}>
                    {faq}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="chat-footer">
            <input
              type="text"
              placeholder="Ask a question..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSendMessage(inputMessage);
              }}
              disabled={isLoading}
            />
            <button onClick={() => handleSendMessage(inputMessage)} disabled={isLoading}>Send</button>
          </div>
        </div>
      )}
    </>
  );
};

export default HireLogicChat;
