import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, User } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/api/ws';


const Chat = ({ user, token, onClose, initialConversation }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(initialConversation);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [ws, setWs] = useState(null);
    const [wsReady, setWsReady] = useState(false);
    const messagesEndRef = useRef(null);
    const selectedConversationRef = useRef(null);


    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
      }, [selectedConversation]);
  
    useEffect(() => {
      loadConversations();
      connectWebSocket();

      if (initialConversation) {
        setSelectedConversation(initialConversation);
      }
  
      return () => {
        if (ws) {
          ws.close();
        }
      };
    }, []);
  
    useEffect(() => {
      if (selectedConversation) {
        loadMessages(selectedConversation.id);
      }
    }, [selectedConversation]);
  
    useEffect(() => {
      scrollToBottom();
    }, [messages]);
  
    const connectWebSocket = () => {
        console.log('Attempting WebSocket connection...');
        console.log('Token:', token ? 'Token exists' : 'NO TOKEN');
        
        setTimeout(() => {
          const websocket = new WebSocket(`${WS_URL}?token=${token}`);
        
          websocket.onopen = () => {
            console.log(' WebSocket connected successfully!');
            setWsReady(true);
          };
        
          websocket.onmessage = (event) => {
            console.log('📨 Message received:', event.data);
            const data = JSON.parse(event.data);
            
            if (data.type === 'message') {
              // Use ref to get current conversation
              const currentConversation = selectedConversationRef.current;
              
              if (currentConversation && data.conversation_id === currentConversation.id) {
                setMessages(prev => {
                  // Check if message already exists to avoid duplicates
                  const exists = prev.some(m => m.id === data.message_id);
                  if (exists) return prev;
                  
                  return [...prev, {
                    id: data.message_id,
                    conversation_id: data.conversation_id,
                    sender_id: data.sender_id,
                    receiver_id: data.receiver_id,
                    content: data.content,
                    created_at: data.created_at,
                    read: false
                  }];
                });
              }
              // Update conversations list
              loadConversations();
            }
          };
        
          websocket.onerror = (error) => {
            console.error(' WebSocket error:', error);
            setWsReady(false);
          };
        
          websocket.onclose = (event) => {
            console.log('🔌 WebSocket closed. Code:', event.code, 'Reason:', event.reason);
            setWsReady(false);
            setTimeout(() => {
              console.log(' Attempting to reconnect...');
              connectWebSocket();
            }, 3000);
          };
        
          setWs(websocket);
        }, 100);
      };
  
    const loadConversations = async () => {
      try {
        const response = await fetch(`${API_URL}/conversations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setConversations(data || []);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };
  
    const loadMessages = async (conversationId) => {
      try {
        const response = await fetch(`${API_URL}/messages/${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data || []);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
  
    const sendMessage = () => {
        console.log('Send message called');
        console.log('Message:', newMessage.trim());
        console.log('WS exists:', !!ws);
        console.log('WS Ready:', wsReady);
        console.log('Selected conversation:', selectedConversation?.id);
        
        if (!newMessage.trim() || !ws || !selectedConversation || !wsReady) {
          if (!wsReady) {
            console.error('WebSocket not ready!');
            alert('Connection not ready. Please wait a moment and try again.');
          }
          return;
        }

      const otherUserId = selectedConversation.user1_id === user.id 
        ? selectedConversation.user2_id 
        : selectedConversation.user1_id;
  
      const message = {
        type: 'message',
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        receiver_id: otherUserId,
        content: newMessage.trim()
      };
  
      try {
        ws.send(JSON.stringify(message));
        setNewMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
      }
    };
  
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
  
    const getOtherUser = (conversation) => {
      if (conversation.user1_id === user.id) {
        return {
          id: conversation.user2_id,
          name: conversation.user2_name,
          picture: conversation.user2_picture_url
        };
      } else {
        return {
          id: conversation.user1_id,
          name: conversation.user1_name,
          picture: conversation.user1_picture_url
        };
      }
    };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl h-[600px] flex overflow-hidden shadow-2xl">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={24} />
              <h2 className="text-xl font-bold">Messages</h2>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Click "Message" on a post to start chatting</p>
              </div>
            ) : (
              conversations.map(conv => {
                const otherUser = getOtherUser(conv);
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {otherUser.picture ? (
                        <img
                          src={`http://localhost:8080${otherUser.picture}`}
                          alt={otherUser.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                          <User size={24} className="text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{otherUser.name}</p>
                        <p className="text-sm text-gray-500 truncate">{conv.last_message || 'No messages yet'}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-gray-100 p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {(() => {
                    const otherUser = getOtherUser(selectedConversation);
                    return (
                      <>
                        {otherUser.picture ? (
                          <img
                            src={`http://localhost:8080${otherUser.picture}`}
                            alt={otherUser.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                            <User size={20} className="text-blue-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{otherUser.name}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message) => {
                  const isMe = message.sender_id === user.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isMe
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isMe ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;