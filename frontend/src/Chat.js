import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, ArrowLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/api/ws';
const ORIGIN = API_URL.replace('/api', '');
const asset = (path) => `${ORIGIN}${path}`;

const Initial = ({ name, size = 40, active }) => (
  <div
    style={{ width: size, height: size }}
    className={`flex shrink-0 items-center justify-center rounded-full ${
      active ? 'bg-sun text-abyss' : 'bg-raised text-dim'
    }`}
  >
    <span className="num text-[12px] font-bold">
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  </div>
);

const Face = ({ picture, name, size = 40, active }) =>
  picture ? (
    <img
      src={asset(picture)}
      alt={name}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <Initial name={name} size={size} active={active} />
  );

const Chat = ({ user, token, onClose, initialConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(initialConversation);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState(null);
  const [wsReady, setWsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const messagesEndRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const isMountedRef = useRef(true);
  const wsRef = useRef(null);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    isMountedRef.current = true;
    loadConversations();
    connectWebSocket();

    if (initialConversation) setSelectedConversation(initialConversation);

    const t = setTimeout(() => {
      if (isMountedRef.current) setIsVisible(true);
    }, 10);

    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(t);
      isMountedRef.current = false;
      document.body.style.overflow = '';
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnection
        wsRef.current.close();
        wsRef.current = null;
      }
      setWs(null);
      setWsReady(false);
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation.id);
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectWebSocket = () => {
    if (!isMountedRef.current) return;

    setTimeout(() => {
      if (!isMountedRef.current) return;

      const websocket = new WebSocket(`${WS_URL}?token=${token}`);
      wsRef.current = websocket;

      websocket.onopen = () => {
        if (!isMountedRef.current) {
          websocket.close();
          return;
        }
        setWsReady(true);
      };

      websocket.onmessage = (event) => {
        if (!isMountedRef.current) return;
        const data = JSON.parse(event.data);

        if (data.type === 'message') {
          const currentConversation = selectedConversationRef.current;
          if (currentConversation && data.conversation_id === currentConversation.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message_id)) return prev;
              return [
                ...prev,
                {
                  id: data.message_id,
                  conversation_id: data.conversation_id,
                  sender_id: data.sender_id,
                  receiver_id: data.receiver_id,
                  content: data.content,
                  created_at: data.created_at,
                  read: false,
                },
              ];
            });
          }
          loadConversations();
        }
      };

      websocket.onerror = () => {
        if (!isMountedRef.current) return;
        setWsReady(false);
      };

      websocket.onclose = () => {
        if (!isMountedRef.current) return;
        setWsReady(false);
        setTimeout(() => {
          if (isMountedRef.current) connectWebSocket();
        }, 3000);
      };

      setWs(websocket);
    }, 100);
  };

  const loadConversations = async () => {
    if (!isMountedRef.current) return;
    try {
      const response = await fetch(`${API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && isMountedRef.current) {
        const data = await response.json();
        setConversations(data || []);
      }
    } catch (error) {
      if (isMountedRef.current) console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!isMountedRef.current) return;
    try {
      const response = await fetch(`${API_URL}/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok && isMountedRef.current) {
        const data = await response.json();
        setMessages(data || []);
      }
    } catch (error) {
      if (isMountedRef.current) console.error('Error loading messages:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !ws || !selectedConversation || !wsReady) {
      if (!wsReady) console.error('WebSocket not ready');
      return;
    }

    const otherUserId =
      selectedConversation.user1_id === user.id
        ? selectedConversation.user2_id
        : selectedConversation.user1_id;

    try {
      ws.send(
        JSON.stringify({
          type: 'message',
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          receiver_id: otherUserId,
          content: newMessage.trim(),
        })
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const getOtherUser = (conversation) =>
    conversation.user1_id === user.id
      ? { id: conversation.user2_id, name: conversation.user2_name, picture: conversation.user2_picture_url }
      : { id: conversation.user1_id, name: conversation.user1_name, picture: conversation.user1_picture_url };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (isMountedRef.current) onClose();
    }, 260);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const other = selectedConversation ? getOtherUser(selectedConversation) : null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-stretch justify-center bg-abyss/85 backdrop-blur-[3px] transition-opacity duration-300 md:items-center md:p-6 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`flex h-full w-full max-w-5xl flex-col border-line bg-panel transition-all duration-300 ease-out md:h-[640px] md:flex-row md:border ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        {/* Conversation list — hidden on mobile once a thread is open */}
        <div
          className={`w-full flex-col border-line md:flex md:w-[300px] md:shrink-0 md:border-r ${
            selectedConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <div>
              <div className="meta mb-1.5 flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${wsReady ? 'animate-blip bg-mint' : 'bg-dim'}`}
                />
                {wsReady ? 'Connected' : 'Connecting'}
              </div>
              <h2 className="type-head text-lg">Inbox</h2>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close messages"
              className="flex h-9 w-9 items-center justify-center border border-line text-ash transition-colors hover:border-ember hover:bg-ember hover:text-abyss"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <MessageCircle size={30} strokeWidth={1} className="mx-auto mb-4 text-[#1E6B93]" />
                <p className="text-sm text-ash">No conversations yet</p>
                <p className="meta mt-2 leading-relaxed">Hit “Message” on any listing to start one</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const otherUser = getOtherUser(conv);
                const active = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`relative flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left transition-colors ${
                      active ? 'bg-raised' : 'hover:bg-raised/60'
                    }`}
                  >
                    <span
                      className={`absolute inset-y-0 left-0 w-[2px] ${active ? 'bg-sun' : 'bg-transparent'}`}
                    />
                    <Face picture={otherUser.picture} name={otherUser.name} size={38} active={active} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-chalk">{otherUser.name}</p>
                      <p className="mt-1 truncate text-xs text-dim">
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={`flex flex-1 flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
          {selectedConversation && other ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  aria-label="Back to conversations"
                  className="flex h-8 w-8 items-center justify-center border border-line text-ash md:hidden"
                >
                  <ArrowLeft size={15} />
                </button>
                <Face picture={other.picture} name={other.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-chalk">{other.name}</p>
                  <p className="meta mt-1">Direct message</p>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="Close messages"
                  className="flex h-8 w-8 items-center justify-center border border-line text-ash transition-colors hover:border-ember hover:bg-ember hover:text-abyss md:hidden"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="blueprint flex-1 space-y-3 overflow-y-auto bg-[#002A42] p-4">
                {messages.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="meta">Say something first</p>
                  </div>
                )}
                {messages.map((message) => {
                  const isMe = message.sender_id === user.id;
                  return (
                    <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] px-3.5 py-2.5 md:max-w-md ${
                          isMe ? 'bg-sun text-abyss' : 'border border-line bg-panel text-chalk'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.content}
                        </p>
                        <p
                          className={`num mt-1.5 text-[10px] ${isMe ? 'text-abyss/60' : 'text-dim'}`}
                        >
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-px border-t border-line bg-line">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={wsReady ? 'Write a message…' : 'Connecting…'}
                  className="flex-1 border-0 bg-panel px-4 py-3.5 text-sm text-chalk outline-none placeholder:text-dim"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !wsReady}
                  aria-label="Send"
                  className="btn btn-sun rounded-none px-6 disabled:bg-panel disabled:text-dim"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="text-center">
                <MessageCircle size={38} strokeWidth={1} className="mx-auto mb-4 text-[#1E6B93]" />
                <p className="type-head text-base text-chalk">Pick a conversation</p>
                <p className="meta mt-2">Your messages stay on campus</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
