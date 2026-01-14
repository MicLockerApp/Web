import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messagesAPI, usersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MessagesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const messagesEndRef = useRef(null);
  
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // For starting a new conversation
  const toUserId = searchParams.get('to');
  const [newRecipient, setNewRecipient] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchThreads();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (toUserId && !selectedThread) {
      fetchNewRecipient();
    }
  }, [toUserId]);

  const fetchThreads = async () => {
    try {
      const response = await messagesAPI.getThreads({ limit: 50 });
      setThreads(response.data.threads || []);
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewRecipient = async () => {
    try {
      const response = await usersAPI.getProfile(toUserId);
      setNewRecipient(response.data);
    } catch (error) {
      console.error('Error fetching recipient:', error);
    }
  };

  const selectThread = async (thread) => {
    setSelectedThread(thread);
    setNewRecipient(null);
    try {
      const response = await messagesAPI.getThread(thread.id);
      setMessages(response.data.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const recipientId = selectedThread?.other_user_id || toUserId;
      await messagesAPI.send(recipientId, newMessage.trim());
      setNewMessage('');
      
      if (selectedThread) {
        const response = await messagesAPI.getThread(selectedThread.id);
        setMessages(response.data.messages || []);
      } else {
        // Refresh threads to show new conversation
        await fetchThreads();
        // Find and select the new thread
        const threadsRes = await messagesAPI.getThreads({ limit: 50 });
        const newThread = threadsRes.data.threads?.find(t => 
          t.participants.includes(toUserId)
        );
        if (newThread) {
          selectThread(newThread);
        }
      }
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen" data-testid="messages-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Threads List */}
          <div className="bg-dark-400 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-dark-300">
              <h2 className="font-semibold text-white">Conversations</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {threads.length > 0 ? (
                threads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => selectThread(thread)}
                    className={`w-full p-4 text-left hover:bg-dark-300 transition-colors border-b border-dark-300 ${
                      selectedThread?.id === thread.id ? 'bg-dark-300' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {thread.other_username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="text-white font-medium">{thread.other_username}</span>
                          {thread.unread_count > 0 && (
                            <span className="bg-primary text-black text-xs font-bold px-2 py-0.5 rounded-full">
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm truncate">{thread.last_message}</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400">
                  <p>No conversations yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="md:col-span-2 bg-dark-400 rounded-xl overflow-hidden flex flex-col">
            {(selectedThread || newRecipient) ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-dark-300 flex items-center gap-3">
                  <button
                    onClick={() => { setSelectedThread(null); setNewRecipient(null); }}
                    className="md:hidden text-gray-400 hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {(selectedThread?.other_username || newRecipient?.username)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white font-medium">
                    {selectedThread?.other_username || newRecipient?.username}
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.sender_id === user.id
                          ? 'bg-primary text-black'
                          : 'bg-dark-300 text-white'
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === user.id ? 'text-black/60' : 'text-gray-500'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-300">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sending}
                      data-testid="message-input"
                    />
                    <button
                      type="submit"
                      className="btn btn-primary px-4"
                      disabled={sending || !newMessage.trim()}
                      data-testid="send-message-button"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
