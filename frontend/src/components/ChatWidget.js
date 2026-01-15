/**
 * MicLocker Chat Widget
 * 
 * ARCHITECTURE: Stateless UI
 * 
 * This widget is intentionally simple and stateless. All intelligence,
 * conversation history, and business logic lives in the backend.
 * 
 * This component can be replaced with Crisp, Intercom, or any other
 * chat widget - just redirect messages to /api/chatbot/message
 * 
 * To integrate with Crisp:
 * 1. Remove this component
 * 2. Add Crisp script to index.html
 * 3. Use Crisp's webhook to forward messages to our /api/chatbot/message
 * 4. Use our API response to send back to Crisp
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Minimize2, User, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Generate or retrieve session ID
const getSessionId = () => {
  let sessionId = localStorage.getItem('miclocker_chat_session');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('miclocker_chat_session', sessionId);
  }
  return sessionId;
};

const ChatWidget = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(getSessionId);
  const [isEscalated, setIsEscalated] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history when widget opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadConversationHistory();
    }
  }, [isOpen]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const loadConversationHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/chatbot/conversation/${sessionId}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      const data = await response.json();
      
      if (data.found && data.messages?.length > 0) {
        setMessages(data.messages.map((m, i) => ({
          id: i,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        })));
        setIsEscalated(data.escalated || false);
      } else {
        // Add welcome message
        setMessages([{
          id: 0,
          role: 'assistant',
          content: "Hi there! 👋 I'm MicLocker Support. How can I help you today?",
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Add welcome message on error
      setMessages([{
        id: 0,
        role: 'assistant',
        content: "Hi there! 👋 I'm MicLocker Support. How can I help you today?",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const sendMessage = async (messageText = inputValue) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: messages.length,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/chatbot/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            session_id: sessionId,
            message: messageText.trim(),
            user_id: user?.id || null,
            source: 'web_widget',
            context: {
              page: window.location.pathname,
              authenticated: isAuthenticated
            }
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const assistantMessage = {
          id: messages.length + 1,
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          suggestedActions: data.suggested_actions || [],
          intent: data.intent
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (data.escalate_to_human) {
          setIsEscalated(true);
        }
      } else {
        throw new Error(data.detail || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: messages.length + 1,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickReply = (action) => {
    sendMessage(action.value);
  };

  const startNewConversation = () => {
    // Clear session and start fresh
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('miclocker_chat_session', newSessionId);
    window.location.reload();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-yellow-400 text-black p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Open chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 bg-dark-500 rounded-2xl shadow-2xl border border-dark-300 transition-all duration-300 ${
        isMinimized ? 'w-72 h-14' : 'w-96 h-[32rem]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-300 bg-dark-400 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">MicLocker Support</h3>
            <p className="text-xs text-gray-400">
              {isEscalated ? 'Connecting to agent...' : 'AI Assistant'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-dark-300 rounded-lg transition-colors"
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-dark-300 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-80">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    message.role === 'user'
                      ? 'bg-primary text-black'
                      : message.isError
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-dark-400 text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Quick reply buttons */}
                  {message.role === 'assistant' && message.suggestedActions?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickReply(action)}
                          className="px-3 py-1.5 bg-dark-300 hover:bg-dark-200 text-xs text-white rounded-full transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-dark-400 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-gray-400">Typing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Escalation notice */}
          {isEscalated && (
            <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
              <p className="text-xs text-yellow-400 text-center">
                🎧 Your conversation has been escalated to our support team
              </p>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-dark-300">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-dark-400 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-500"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-primary hover:bg-yellow-400 disabled:bg-dark-400 disabled:text-gray-500 text-black rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Powered by MicLocker AI
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWidget;
