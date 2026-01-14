import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, ArrowLeft, User, Plus, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messagesAPI, usersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MessagesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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
  
  // New conversation modal state
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [newConversationMessage, setNewConversationMessage] = useState('');
  const [sendingNewMessage, setSendingNewMessage] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchThreads();
  }, [isAuthenticated, navigate, authLoading]);

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
      
      // Update unread count in navbar by refreshing threads
      fetchThreads();
      
      // Scroll messages container only, not the page
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      // Scroll only the messages container, not the page
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Search for users by username
  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return;
    
    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);
    
    try {
      const response = await usersAPI.searchUsers({ q: searchUsername.trim(), limit: 10 });
      const results = response.data.users || [];
      
      // Filter out current user
      const filteredResults = results.filter(u => u.id !== user.id);
      
      if (filteredResults.length === 0) {
        setSearchError('No users found with that username');
      }
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchError('Error searching for users');
    } finally {
      setSearchLoading(false);
    }
  };

  // Select a recipient from search results
  const handleSelectRecipient = (recipient) => {
    setSelectedRecipient(recipient);
    setSearchResults([]);
    setSearchUsername('');
  };

  // Send message to new recipient
  const handleSendNewConversation = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedRecipient || !newConversationMessage.trim()) return;

    setSendingNewMessage(true);
    try {
      await messagesAPI.send(selectedRecipient.id, newConversationMessage.trim());
      
      // Close modal and reset
      setShowNewMessageModal(false);
      setSelectedRecipient(null);
      setNewConversationMessage('');
      setSearchUsername('');
      setSearchResults([]);
      
      // Refresh threads and select the new one
      await fetchThreads();
      const threadsRes = await messagesAPI.getThreads({ limit: 50 });
      const newThread = threadsRes.data.threads?.find(t => 
        t.other_user_id === selectedRecipient.id || t.participants?.includes(selectedRecipient.id)
      );
      if (newThread) {
        selectThread(newThread);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingNewMessage(false);
    }
  };

  // Close modal and reset state
  const closeModal = () => {
    setShowNewMessageModal(false);
    setSelectedRecipient(null);
    setNewConversationMessage('');
    setSearchUsername('');
    setSearchResults([]);
    setSearchError('');
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen" data-testid="messages-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Threads List */}
          <div className="bg-dark-400 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-dark-300 flex items-center justify-between">
              <h2 className="font-semibold text-white">Conversations</h2>
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                data-testid="new-conversation-button"
                title="New Message"
              >
                <Plus className="w-5 h-5 text-black" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {/* New Conversation Slot */}
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="w-full p-4 text-left hover:bg-dark-300 transition-colors border-b border-dark-300 flex items-center gap-3"
                data-testid="new-conversation-slot"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border-2 border-dashed border-primary">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <span className="text-primary font-medium">Start New Conversation</span>
              </button>
              
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
                      {thread.other_user_avatar ? (
                        <img 
                          src={thread.other_user_avatar} 
                          alt={thread.other_username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                          <span className="text-primary font-bold">
                            {thread.other_username?.[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
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
                  <p className="text-sm mt-2">Click the + button to start messaging!</p>
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
                  {(selectedThread?.other_user_avatar || newRecipient?.profile_image) ? (
                    <img 
                      src={selectedThread?.other_user_avatar || newRecipient?.profile_image} 
                      alt={selectedThread?.other_username || newRecipient?.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold">
                        {(selectedThread?.other_username || newRecipient?.username)?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-white font-medium">
                    {selectedThread?.other_username || newRecipient?.username}
                  </span>
                </div>

                {/* Messages */}
                <div id="messages-container" className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, index) => {
                    const isOwnMessage = msg.sender_id === user.id;
                    const isLastOwnMessage = isOwnMessage && 
                      (index === messages.length - 1 || messages[index + 1]?.sender_id !== user.id);
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%]`}>
                          <div className={`rounded-lg px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-primary text-black'
                              : 'bg-dark-300 text-white'
                          }`}>
                            <p>{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-2 mt-1 text-xs ${
                            isOwnMessage ? 'justify-end' : 'justify-start'
                          }`}>
                            <span className="text-gray-500">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOwnMessage && isLastOwnMessage && (
                              <span className="text-gray-400">
                                {msg.is_read ? 'Read' : 'Delivered'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  <button
                    onClick={() => setShowNewMessageModal(true)}
                    className="btn btn-primary mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Conversation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" data-testid="new-message-modal">
          <div className="bg-dark-400 rounded-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="p-4 border-b border-dark-300 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">New Message</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white"
                data-testid="close-modal-button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {!selectedRecipient ? (
                <>
                  {/* Username Search */}
                  <div className="mb-4">
                    <label className="block text-gray-400 mb-2">Find a user</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                        placeholder="Enter username..."
                        className="flex-1"
                        data-testid="search-username-input"
                        autoFocus
                      />
                      <button
                        onClick={handleSearchUser}
                        className="btn btn-primary px-4"
                        disabled={searchLoading || !searchUsername.trim()}
                        data-testid="search-user-button"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Search Error */}
                  {searchError && (
                    <div className="text-red-400 text-sm mb-4">{searchError}</div>
                  )}

                  {/* Search Results */}
                  {searchLoading && (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      <p className="text-gray-400 text-sm mb-2">Select a user:</p>
                      {searchResults.map(u => (
                        <button
                          key={u.id}
                          onClick={() => handleSelectRecipient(u)}
                          className="w-full p-3 bg-dark-300 rounded-lg hover:bg-dark-200 transition-colors flex items-center gap-3"
                          data-testid={`user-result-${u.username}`}
                        >
                          <div className="w-10 h-10 bg-dark-500 rounded-full flex items-center justify-center">
                            {u.profile_image ? (
                              <img src={u.profile_image} alt={u.username} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <span className="text-primary font-bold">{u.username[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="text-left">
                            <span className="text-white font-medium block">{u.username}</span>
                            {u.category && (
                              <span className="text-gray-500 text-sm capitalize">{u.category.replace('_', ' ')}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Selected Recipient */}
                  <div className="mb-4 p-3 bg-dark-300 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-dark-500 rounded-full flex items-center justify-center">
                      {selectedRecipient.profile_image ? (
                        <img src={selectedRecipient.profile_image} alt={selectedRecipient.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold">{selectedRecipient.username[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">{selectedRecipient.username}</span>
                      {selectedRecipient.category && (
                        <span className="text-gray-500 text-sm block capitalize">{selectedRecipient.category.replace('_', ' ')}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedRecipient(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendNewConversation}>
                    <label className="block text-gray-400 mb-2">Your message</label>
                    <textarea
                      value={newConversationMessage}
                      onChange={(e) => setNewConversationMessage(e.target.value)}
                      placeholder="Write your message..."
                      rows={4}
                      className="w-full mb-4 resize-none"
                      data-testid="new-conversation-message-input"
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="btn btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                        disabled={sendingNewMessage || !newConversationMessage.trim()}
                        data-testid="send-new-conversation-button"
                      >
                        <Send className="w-4 h-4" />
                        {sendingNewMessage ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
