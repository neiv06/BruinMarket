import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Upload, DollarSign, CircleParking, Tag, Package, Dumbbell, Laptop, Ticket, Sofa, Lamp, Grid3x3, User, LogOut, Shirt, NotebookPen, CircleQuestionMark, Footprints, MessageCircle, MoreVertical, Trash2, Edit, CheckCircle, Github } from 'lucide-react';
import logo from './BruinMarketTransparent.svg';
import Chat from './Chat.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const categories = [
  { name: 'All', value: 'all', icon: Grid3x3 },
  { name: 'Clothing', value: 'Clothing', icon: Shirt },
  { name: 'Sports Equipment', value: 'Sports Equipment', icon: Dumbbell },
  { name: 'Shoes', value: 'Shoes', icon: Footprints },
  { name: 'Class Supplies', value: 'Class Supplies', icon: NotebookPen },
  { name: 'Electronics', value: 'Electronics', icon: Laptop },
  { name: 'Tickets', value: 'Tickets', icon: Ticket },
  { name: 'Parking Spots', value: 'Parking Spots', icon: CircleParking },
  { name: 'Furniture', value: 'Furniture', icon: Sofa },
  { name: 'Decorations', value: 'Decorations', icon: Lamp },
  { name: 'Other', value: 'Other', icon: CircleQuestionMark },
];

const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }
};

const BruinMarket = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showAuthModal, setShowAuthModal] = useState({ show: false, isSignUp: false });
  const [showProfile, setShowProfile] = useState(false);
  const [posts, setPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [initialConversation, setInitialConversation] = useState(null);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(!!localStorage.getItem('token'));
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [isNavigatingToAll, setIsNavigatingToAll] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [viewMarketplaceWithoutLogin, setViewMarketplaceWithoutLogin] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      // No token, immediately show landing page
      setCheckingAuth(false);
      setUser(null);
    }
  }, [token]);

  // Also check on mount if there's no token
  useEffect(() => {
    if (!token) {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (!showProfile) {
      loadPosts();
    }
  }, [filterCategory, filterType, priceRange, searchTerm, showProfile]);

  useEffect(() => {
    // Trigger fade-in animation for marketplace when user is logged in
    if (user && token) {
      setTimeout(() => setShowMarketplace(true), 10);
    } else {
      setShowMarketplace(false);
    }
  }, [user, token]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setCheckingAuth(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setShowProfile(false);
  };

  const navigateToAll = () => {
    // Trigger fade-out
    setIsNavigatingToAll(true);
    
    // After a short delay, reset filters and trigger fade-in
    setTimeout(() => {
      setFilterCategory('all');
      setFilterType('all');
      setPriceRange({ min: '', max: '' });
      setSearchTerm('');
      setShowProfile(false);
      setViewingUserProfile(null);
      setIsNavigatingToAll(false);
    }, 250);
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterType !== 'all') params.append('type', filterType);
      if (priceRange.min) params.append('min_price', priceRange.min);
      if (priceRange.max) params.append('max_price', priceRange.max);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/posts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData) => {
    if (!token) {
      alert('Please login to create a post');
      setShowAuthModal({ show: true, isSignUp: false });
      return;
    }

    console.log('Token:', token); // ADD THIS
    console.log('Post Data:', postData); // ADD THIS

    try {
      const payload = {
        ...postData,
        price: parseFloat(postData.price)
      };

      console.log('Payload:', payload);
      console.log('Condition in payload:', payload.condition);

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error data:', errorData);
        throw new Error(errorData.error || 'Failed to create post');
      }
      
      const newPost = await response.json();
      console.log('New post from server:', newPost);
      console.log('Condition in new post:', newPost.condition);
      setPosts([newPost, ...posts]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete post');
        return;
      }
      
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const markAsSold = async (postId, soldStatus) => {
    try {
      const response = await fetch(`${API_URL}/posts/${postId}/sold`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sold: soldStatus })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Error updating post sold status:', errorMessage, response.status);
        alert(`Failed to update post sold status: ${errorMessage}`);
        return;
      }
      
      // Reload posts to get updated data
      loadPosts();
    } catch (error) {
      console.error('Error updating post sold status:', error);
      alert(`Failed to update post sold status: ${error.message || 'Please try again.'}`);
    }
  };

  const updatePost = async (postId, postData) => {
    try {
      const payload = {
        ...postData,
        price: parseFloat(postData.price)
      };

      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update post');
      }
      
      // Reload posts to get updated data
      loadPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
      throw error;
    }
  };

  const openChatWithUser = async (userId) => {
    if (!token) {
      alert('Please login to message sellers');
      return;
    }
    
    try {
      const url = `${API_URL}/conversations/${userId}`;
      console.log('Opening chat with user:', userId);
      console.log('URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response:', response.status, errorData);
        throw new Error(errorData.error || `Failed to create conversation (${response.status})`);
      }
      
      const conversation = await response.json();
      console.log('Conversation created/retrieved:', conversation);
      setInitialConversation(conversation);
      setShowChat(true);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(`Failed to create conversation: ${error.message || 'Please try again.'}`);
    }
  };

  const viewUserProfile = async (userId) => {
    if (!token) {
      alert('Please login to view profiles');
      return;
    }
    
    try {
      const url = `${API_URL}/users/${userId}`;
      console.log('Fetching user profile from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response:', response.status, errorData);
        throw new Error(errorData.error || `Failed to fetch user profile (${response.status})`);
      }
      
      const data = await response.json();
      console.log('User profile data:', data);
      setViewingUserProfile(data);
      setShowProfile(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      alert(`Failed to load user profile: ${error.message || 'Please try again.'}`);
    }
  };

  // Show landing page if user is not logged in (wait for auth check to complete)
  // Only show loading if we have a token and are checking auth
  if (checkingAuth && token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-sky-50/30 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if no token or no user (unless viewing marketplace without login)
  if ((!token || !user) && !viewMarketplaceWithoutLogin) {
    return (
      <LandingPage 
        onLogin={() => setShowAuthModal({ show: true, isSignUp: false })}
        onSignUp={() => setShowAuthModal({ show: true, isSignUp: true })}
        onAuthSuccess={(token, user) => {
          setToken(token);
          setUser(user);
          localStorage.setItem('token', token);
          setShowAuthModal({ show: false, isSignUp: false });
        }}
        onViewMarketplace={() => {
          setViewMarketplaceWithoutLogin(true);
          setShowMarketplace(true);
        }}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
      />
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-all duration-500 ease-out ${
      showMarketplace ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`}>
      {/* Blurred background image */}
      <div 
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: `url(/landing_page_background.jpg)`,
          backgroundPosition: 'center top',
          filter: 'blur(32px) brightness(0.8)',
          transform: 'scale(1.1)'
        }}
      />
      {/* Overlay for better content readability */}
      <div className="absolute inset-0 bg-white/30" />
      
      <div className="relative z-10">
      {/* Header - Full Width */}
      {/* <div className="bg-blue-600 text-white shadow-lg fixed top-0 left-0 right-0 z-40"> */}
      <div className="bg-gradient-to-r from-blue-500 via-sky-500 to-blue-500 text-white shadow-lg fixed top-0 left-0 right-0 z-40">
        <div className="px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={navigateToAll}>
            <img src={logo} alt="BruinMarket Logo" className="h-20 w-20" />
            <div>
              <h1 className="text-3xl font-bold">BruinMarket</h1>
              <p className="text-blue-100 text-sm mt-1">UCLA Student Marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <User size={20} />
                  {user.name}
                </button>
                <button
                    onClick={() => setShowChat(true)}
                    className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <MessageCircle size={20} />
                    Messages
                  </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300 shadow-md hover:scale-105 hover:shadow-xl"
                >
                  <Plus size={20} />
                  Create Post
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal({ show: true, isSignUp: false })}
                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300 shadow-md hover:scale-105 hover:shadow-xl"
              >
                <User size={20} />
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Left Sidebar */}
      {/* <div className="w-64 bg-white shadow-lg fixed left-0 top-[100px] bottom-0 overflow-y-auto"> */}
      <div className="w-64 bg-gradient-to-b from-white via-sky-100 to-sky-200 shadow-lg fixed left-0 top-[100px] bottom-0 overflow-y-auto border-r border-amber-300/20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-blue-600">Marketplace</h2>
          </div>
          
          {/* Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Categories</label>
            <div className="space-y-1">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setFilterCategory(cat.value);
                      setShowProfile(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                      filterCategory === cat.value && !showProfile
                        ? 'bg-blue-600 text-white hover:scale-105 hover:shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100 hover:scale-105 hover:shadow-md'
                    }`}
                  >
                    <IconComponent size={20} />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              <option value="selling">Selling</option>
              <option value="buying">Looking to Buy</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ml-64 mt-[100px] transition-all duration-500 ease-out ${
        isNavigatingToAll ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        <div className="p-8">
          {viewingUserProfile ? (
            <OtherUserProfile 
              profileData={viewingUserProfile} 
              token={token}
              onClose={() => setViewingUserProfile(null)}
              onViewUserProfile={viewUserProfile}
            />
          ) : showProfile ? (
            <ProfilePage user={user} token={token} onDeletePost={deletePost} onEdit={setEditingPost} />
          ) : loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading posts...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onDelete={deletePost}
                    onEdit={() => setEditingPost(post)}
                    onMarkAsSold={markAsSold}
                    canDelete={user && post.user_id === user.id}
                    token={token}
                    onMessageUser={openChatWithUser}
                    onViewUserProfile={viewUserProfile}
                  />
                ))}
              </div>

              {posts.length === 0 && (
                <div className="text-center py-12">
                  <Package size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-white text-lg">No posts found. Create the first one!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAuthModal.show && (
        <AuthModal 
          key={`auth-${showAuthModal.isSignUp}`}
          onClose={() => setShowAuthModal({ show: false, isSignUp: false })}
          onSuccess={(token, user) => {
            setToken(token);
            setUser(user);
            localStorage.setItem('token', token);
            setShowAuthModal({ show: false, isSignUp: false });
          }}
          initialIsSignUp={showAuthModal.isSignUp}
        />
      )}

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createPost}
          categories={categories.filter(c => c.value !== 'all')}
          token={token}
        />
      )}
      {showChat && (
        <Chat
          user={user}
          token={token}
          initialConversation={initialConversation}
          onClose={() => {
            setShowChat(false);
            setInitialConversation(null);
          }}
        />
      )}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onUpdate={async (postData) => {
            await updatePost(editingPost.id, postData);
            setEditingPost(null);
          }}
          categories={categories.filter(c => c.value !== 'all')}
          token={token}
        />
      )}
      </div>
    </div>
  );
};

const LandingPage = ({ onLogin, onSignUp, onAuthSuccess, onViewMarketplace, showAuthModal, setShowAuthModal }) => {
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'UCLA Student Marketplace';
  const [isTyping, setIsTyping] = useState(true);
  const [showLogo, setShowLogo] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showViewMarketplace, setShowViewMarketplace] = useState(false);

  useEffect(() => {
    // Fade in and drop logo after a short delay
    const logoTimeout = setTimeout(() => {
      setShowLogo(true);
    }, 300);
    
    // Fade in and drop title after logo
    const titleTimeout = setTimeout(() => {
      setShowTitle(true);
    }, 600);
    
    // Fade in and drop buttons after title
    const buttonsTimeout = setTimeout(() => {
      setShowButtons(true);
    }, 900);
    
    // Fade in and drop View Marketplace button after buttons
    const viewMarketplaceTimeout = setTimeout(() => {
      setShowViewMarketplace(true);
    }, 1200);

    return () => {
      clearTimeout(logoTimeout);
      clearTimeout(titleTimeout);
      clearTimeout(buttonsTimeout);
      clearTimeout(viewMarketplaceTimeout);
    };
  }, []);

  useEffect(() => {
    if (isTyping && displayedText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(fullText.slice(0, displayedText.length + 1));
      }, 100);
      return () => clearTimeout(timeout);
    } else if (displayedText.length === fullText.length) {
      setIsTyping(false);
    }
  }, [displayedText, isTyping, fullText]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Beta label and GitHub link in top left */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
        <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-full border border-white/30">
          Beta
        </span>
        <a
          href="https://github.com/neiv06/BruinMarket"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-full border border-white/30 hover:bg-white/30 hover:scale-110 transition-all duration-300"
          aria-label="View on GitHub"
        >
          <Github size={20} />
        </a>
      </div>
      
      {/* Blurred background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(/landing_page_background.jpg)`,
          filter: 'blur(12px)',
          transform: 'scale(1.1)'
        }}
      />
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-blue-900/40" />
      
      <div className="text-center px-8 relative z-10">
        {/* Logo */}
        <div className={`mb-8 flex justify-center transition-all duration-1000 ease-out ${showLogo ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          <img src={logo} alt="BruinMarket Logo" className="h-60 w-60 brightness-0 invert" />
        </div>
        
        {/* Title */}
        <h1 className={`text-6xl font-bold text-white mb-6 transition-all duration-1000 ease-out ${showTitle ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>BruinMarket</h1>
        
        {/* Typing Animation Subtitle */}
        <div className="mb-12 h-8">
          <p className="text-2xl text-white/90">
            {displayedText}
            {isTyping && <span className="animate-pulse text-white">|</span>}
          </p>
        </div>
        
        {/* Buttons */}
        <div className={`flex gap-6 justify-center transition-all duration-1000 ease-out ${showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          <button
            onClick={onLogin}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-400 hover:bg-gray-100"
          >
            Log In
          </button>
          <button
            onClick={onSignUp}
            className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-400 hover:bg-white/10"
          >
            Sign Up
          </button>
        </div>
        
        {/* View Marketplace Button */}
        <div className={`flex justify-center mt-6 transition-all duration-1000 ease-out ${showViewMarketplace ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          <button
            onClick={onViewMarketplace}
            className="px-8 py-3 bg-white/20 backdrop-blur-sm text-white border-2 border-white/50 rounded-lg font-semibold text-base transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-400 hover:bg-white/30 hover:border-white"
          >
            View Marketplace
          </button>
        </div>
        
        {/* Mobile App coming soon text */}
        <p className={`italic text-sm text-gray-300 mt-6 transition-all duration-1000 ease-out ${showTitle ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          mobile app coming soon
        </p>
      </div>

      {showAuthModal.show && (
        <AuthModal 
          key={`auth-${showAuthModal.isSignUp}`}
          onClose={() => setShowAuthModal({ show: false, isSignUp: false })}
          onSuccess={onAuthSuccess}
          initialIsSignUp={showAuthModal.isSignUp}
        />
      )}
    </div>
  );
};

const ProfilePage = ({ user, token, onDeletePost, onEdit }) => {
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    loadMyPosts();
  }, []);

  const loadMyPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/my-posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyPosts(data || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId) => {
    await onDeletePost(postId);
    setMyPosts(myPosts.filter(p => p.id !== postId));
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploadingPicture(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      
      // Update user state with new profile picture
      user.profile_picture_url = data.url;
      window.location.reload(); // Reload to update all instances
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <div className="relative">
            {user.profile_picture_url ? (
              <img 
                src={`${API_URL.replace('/api', '')}${user.profile_picture_url}`} 
                alt={user.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-blue-200 flex items-center justify-center border-4 border-blue-300">
                <User size={48} className="text-blue-600" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
                disabled={uploadingPicture}
              />
              {uploadingPicture ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Upload size={20} />
              )}
            </label>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h2>
            {user.year && (
              <p className="text-lg text-gray-600 mb-2">{user.year}</p>
            )}
            {/* <p className="text-gray-600 mb-4">{user.email}</p> */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Total Posts: {myPosts.length}</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mb-6">My Posts</h3>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : myPosts.length === 0 ? (
        <div className="text-center py-12">
          <Package size={64} className="mx-auto text-white mb-4" />
          <p className="text-white text-lg">You haven't created any posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {myPosts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              token={token}
              onDelete={handleDelete}
              onEdit={() => onEdit(post)}
              canDelete={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const OtherUserProfile = ({ profileData, token, onClose, onViewUserProfile }) => {
  const { user, posts } = profileData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">User Profile</h2>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-200 hover:text-white transition-colors"
        >
          <X size={20} />
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <div className="relative">
            {user.profile_picture_url ? (
              <img 
                src={`${API_URL.replace('/api', '')}${user.profile_picture_url}`}
                alt={user.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-blue-200 flex items-center justify-center border-4 border-blue-300">
                <User size={48} className="text-blue-600" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h2>
            <p className="text-gray-600 mb-4">{user.email}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Total Posts: {posts.length}</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white mb-6">{user.name}'s Posts</h3>
      
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <Package size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">This user hasn't created any posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              token={token}
              canDelete={false}
              onViewUserProfile={onViewUserProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AuthModal = ({ onClose, onSuccess, initialIsSignUp = false }) => {
  const [isLogin, setIsLogin] = useState(!initialIsSignUp);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    year: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsLogin(!initialIsSignUp);
    // Reset and trigger fade-in and pull-up animation
    setIsVisible(false);
    setTimeout(() => setIsVisible(true), 10);
  }, [initialIsSignUp]);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    if (!formData.email.endsWith('@ucla.edu')) {
      setError('Please use a @ucla.edu email address');
      setLoading(false);
      return;
    }

    if (!isLogin && !formData.year) {
      setError('Please select your year');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        setLoading(false);
        return;
      }

      onSuccess(data.token, data.user);
    } catch (error) {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className={`bg-white rounded-lg max-w-md w-full p-8 transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Login' : 'Sign Up'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-all duration-300 hover:scale-110 hover:rotate-90">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Year</option>
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">UCLA Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="yourname@ucla.edu"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-blue-600 hover:text-blue-700 text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

const PostCard = ({ post, onDelete, onEdit, onMarkAsSold, canDelete, token, onMessageUser, onViewUserProfile }) => {
  const [showFullView, setShowFullView] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-2xl hover:shadow-amber-400/60 hover:scale-[1.02] transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-amber-300/60 hover:-translate-y-1 relative">
        <div onClick={() => setShowFullView(true)}>
          {post.media && post.media.length > 0 && (
            <div className="relative h-48 bg-gray-200">
              {post.media[0].type.startsWith('image/') ? (
                <img src={`${API_URL.replace('/api', '')}${post.media[0].url}`} alt={post.title} className="w-full h-full object-cover" />
              ) : (
                <video src={`${API_URL.replace('/api', '')}${post.media[0].url}`} className="w-full h-full object-cover" />
              )}
              {post.media.length > 1 && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                  +{post.media.length - 1} more
                </div>
              )}
            </div>
          )}

          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-base font-semibold text-gray-900 flex-1 break-words">{post.title}</h3>
              <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                post.type === 'selling' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {post.type === 'selling' ? 'Selling' : 'Buying'}
              </span>
            </div>
            
            {/* User info with profile picture */}
            <div className="flex items-center gap-2 mb-2">
              {post.user_profile_picture_url ? (
                <img 
                  src={`${API_URL.replace('/api', '')}${post.user_profile_picture_url}`} 
                  alt={post.user_name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center">
                  <User size={14} className="text-blue-600" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs text-gray-500">{post.user_name}</p>
                {post.created_at && (
                  <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
                )}
              </div>
              {post.type === 'selling' && post.condition && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap flex-shrink-0">
                  {post.condition}
                </span>
              )}
            </div>

            {post.location && (
              <p className="text-xs text-gray-500 mb-2">📍 {post.location}</p>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-500">
                <Tag size={16} />
                {post.category}
              </span>
              <div className="relative">
                {post.sold ? (
                  <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg">
                    SOLD
                  </span>
                ) : (
                  <span className="text-lg font-bold text-blue-600">
                    {post.price === 0 ? 'Free' : `${post.type === 'buying' ? 'Will Pay: ' : ''}$${post.price}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFullView && (
        <PostFullView 
          post={post} 
          token={token} 
          onClose={() => setShowFullView(false)} 
          onMessageUser={onMessageUser}
          onViewUserProfile={onViewUserProfile}
          onDelete={onDelete}
          onEdit={onEdit}
          onMarkAsSold={onMarkAsSold}
          canDelete={canDelete}
        />
      )}
    </>
  );
};

const PostFullView = ({ post, token, onClose, onMessageUser, onViewUserProfile, onDelete, onEdit, onMarkAsSold, canDelete }) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // Trigger fade-in and pull-up animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full min-h-screen bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className={`bg-white rounded-lg max-w-4xl w-full max-h-[72vh] min-h-[10vh] flex flex-col overflow-hidden transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 -translate-y-12' : 'opacity-0 translate-y-8'
      }`}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">{post.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-all duration-300 hover:scale-110 hover:rotate-90">
            <X size={24} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="p-6">
          {post.media && post.media.length > 0 && (
            <div className="mb-6">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 h-72">
                {/* Blurred and darkened background */}
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${API_URL.replace('/api', '')}${post.media[currentMediaIndex].url})`,
                    filter: 'blur(20px) brightness(0.3)',
                    transform: 'scale(1.1)'
                  }}
                />
                {/* Media content on top */}
                <div className="relative z-10 h-full flex items-center justify-center">
                  {post.media[currentMediaIndex].type.startsWith('image/') ? (
                    <img 
                      src={`${API_URL.replace('/api', '')}${post.media[currentMediaIndex].url}`}
                      alt={`Media ${currentMediaIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <video 
                      src={`${API_URL.replace('/api', '')}${post.media[currentMediaIndex].url}`}
                      controls
                      className="max-w-full max-h-full"
                    />
                  )}
                </div>
              </div>
              
              {post.media.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {post.media.map((media, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentMediaIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                        idx === currentMediaIndex ? 'border-blue-600' : 'border-gray-300'
                      }`}
                    >
                      {media.type.startsWith('image/') ? (
                        <img src={`${API_URL.replace('/api', '')}${post.media[0].url}`} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <video src={`${API_URL.replace('/api', '')}${post.media[0].url}`} className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-4 py-2 rounded-lg font-semibold ${
                  post.type === 'selling' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {post.type === 'selling' ? 'Selling' : 'Looking to Buy'}
                </span>
                {post.type === 'selling' && post.condition && (
                  <span className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 border border-gray-300 whitespace-nowrap">
                    {post.condition}
                  </span>
                )}
              </div>
              <div className="relative">
                {post.sold ? (
                  <span className="px-6 py-3 bg-red-600 text-white font-bold text-2xl rounded-lg">
                    SOLD
                  </span>
                ) : (
                  <span className="text-3xl font-bold text-blue-600">
                    {post.price === 0 ? 'Free' : `${post.type === 'buying' ? 'Willing to Pay: ' : ''}$${post.price}`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg">
                <Tag size={16} />
                {post.category}
              </span>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              {post.user_profile_picture_url ? (
                <img 
                  src={`${API_URL.replace('/api', '')}${post.user_profile_picture_url}`} 
                  alt={post.user_name}
                  onClick={() => {
                    if (onViewUserProfile) {
                      onViewUserProfile(post.user_id);
                      onClose();
                    }
                  }}
                  className="w-12 h-12 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                />
              ) : (
                <div 
                  onClick={() => {
                    if (onViewUserProfile) {
                      onViewUserProfile(post.user_id);
                      onClose();
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                >
                  <User size={24} className="text-blue-600" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600">Posted by</p>
                <p 
                  onClick={() => {
                    if (onViewUserProfile) {
                      onViewUserProfile(post.user_id);
                      onClose();
                    }
                  }}
                  className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {post.user_name}
                </p>
                {post.created_at && (
                  <p className="text-xs text-gray-500 mt-1">{formatDate(post.created_at)}</p>
                )}
              </div>
              <button
                onClick={() => {
                  if (onMessageUser) {
                    onMessageUser(post.user_id);
                    onClose();
                  }
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <MessageCircle size={20} />
                Message
              </button>
            </div>
            {post.location && (
              <p className="text-sm text-gray-500 mt-2">📍 {post.location}</p>
            )}
          </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Description</h3>
                {canDelete && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                      }}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-all duration-300 hover:scale-110 hover:shadow-md"
                    >
                      <MoreVertical size={20} className="text-gray-600" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-full mr-2 top-0 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onEdit();
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-all duration-200 border-b border-gray-100"
                        >
                          <Edit size={18} className="text-blue-600" />
                          <span className="font-medium">Edit Post</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            const action = post.sold ? 'Unmark this post as sold?' : 'Mark this post as sold?';
                            if (window.confirm(action)) {
                              onMarkAsSold(post.id, !post.sold);
                            }
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-orange-600 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-3 transition-all duration-200 border-b border-gray-100"
                        >
                          <CheckCircle size={18} className="text-orange-600" />
                          <span className="font-medium">{post.sold ? 'Unmark as Sold' : 'Mark as Sold'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            if (window.confirm('Are you sure you want to delete this post?')) {
                              onDelete(post.id);
                              onClose();
                            }
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 transition-all duration-200"
                        >
                          <Trash2 size={18} className="text-red-600" />
                          <span className="font-medium">Delete Post</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{post.description}</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreatePostModal = ({ onClose, onCreate, categories, token }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: categories[0].value,
    type: 'selling',
    location: '',
    condition: '',
    media: []
  });
  const [uploading, setUploading] = useState(false);

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024;

    setUploading(true);

    for (const file of files) {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        
        setFormData(prev => ({
          ...prev,
          media: [...prev.media, {
            url: data.url,
            type: data.type,
          }]
        }));
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
  };

  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description || formData.price === '') {
      alert('Please fill in all required fields');
      return;
    }
    if (formData.type === 'selling' && !formData.condition) {
      alert('Please select a condition for selling posts');
      return;
    }
    if (parseFloat(formData.price) < 0) {
      alert('Price cannot be negative');
      return;
    }
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-all duration-300 hover:scale-110 hover:rotate-90">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Post Type *</label>
            <div className="flex gap-4">
              <button
                onClick={() => setFormData({...formData, type: 'selling', condition: formData.type === 'selling' ? formData.condition : ''})}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  formData.type === 'selling'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Selling
              </button>
              <button
                onClick={() => setFormData({...formData, type: 'buying', condition: ''})}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  formData.type === 'buying'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Looking to Buy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., iPhone 13 Pro Max"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.name}</option>
              ))}
            </select>
          </div>

          {formData.type === 'selling' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition *</label>
              <div className="grid grid-cols-2 gap-2">
                {['New', 'Used - like New', 'Used - Good', 'Used - Poor'].map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => setFormData({...formData, condition})}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      formData.condition === condition
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.type === 'buying' ? 'Willing to Pay ($)' : 'Price ($)'} *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="e.g., Hedrick Hall, Rieber Vista, 433 Midvale Ave, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder={formData.type === 'buying' ? 'Describe what you want...' : 'Describe the item...'}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images & Videos (Max 10MB each)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
                id="media-upload"
                disabled={uploading}
              />
              <label htmlFor="media-upload" className="cursor-pointer">
                {uploading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
                    <p className="text-gray-600">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-600">Click to upload images or videos</p>
                    <p className="text-gray-400 text-sm mt-1">Max 10MB per file</p>
                  </>
                )}
              </label>
            </div>

            {formData.media.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {formData.media.map((media, index) => (
                  <div key={index} className="relative group">
                    {media.type.startsWith('image/') ? (
                      <img src={`${API_URL.replace('/api', '')}${media.url}`} alt="Upload" className="w-full h-24 object-cover rounded-lg" />
                    ) : (
                      <video src={`${API_URL.replace('/api', '')}${media.url}`} className="w-full h-24 object-cover rounded-lg" />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Create Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditPostModal = ({ post, onClose, onUpdate, categories, token }) => {
  const [formData, setFormData] = useState({
    title: post.title || '',
    description: post.description || '',
    price: post.price || '',
    category: post.category || categories[0].value,
    type: post.type || 'selling',
    location: post.location || '',
    condition: post.condition || '',
    media: post.media ? post.media.map(m => ({ url: m.url, type: m.type })) : []
  });
  const [uploading, setUploading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024;

    setUploading(true);

    for (const file of files) {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      try {
        const formDataObj = new FormData();
        formDataObj.append('file', file);

        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataObj,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        
        setFormData(prev => ({
          ...prev,
          media: [...prev.media, {
            url: data.url,
            type: data.type,
          }]
        }));
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
  };

  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || formData.price === '') {
      alert('Please fill in all required fields');
      return;
    }
    if (formData.type === 'selling' && !formData.condition) {
      alert('Please select a condition for selling posts');
      return;
    }
    if (parseFloat(formData.price) < 0) {
      alert('Price cannot be negative');
      return;
    }
    try {
      await onUpdate(formData);
    } catch (error) {
      // Error already handled in onUpdate
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className={`bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Edit Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-all duration-300 hover:scale-110 hover:rotate-90">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Post Type *</label>
            <div className="flex gap-4">
              <button
                onClick={() => setFormData({...formData, type: 'selling', condition: formData.type === 'selling' ? formData.condition : ''})}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  formData.type === 'selling'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Selling
              </button>
              <button
                onClick={() => setFormData({...formData, type: 'buying', condition: ''})}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  formData.type === 'buying'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Looking to Buy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., iPhone 13 Pro Max"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.name}</option>
              ))}
            </select>
          </div>

          {formData.type === 'selling' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition *</label>
              <div className="grid grid-cols-2 gap-2">
                {['New', 'Used - like New', 'Used - Good', 'Used - Poor'].map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => setFormData({...formData, condition})}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      formData.condition === condition
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.type === 'buying' ? 'Willing to Pay ($)' : 'Price ($)'} *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="e.g., Hedrick Hall, Rieber Vista, 433 Midvale Ave, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your item..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Media</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="text-sm text-gray-600 mb-2">Upload images or videos</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                disabled={uploading}
                className="hidden"
                id="edit-media-upload"
              />
              <label
                htmlFor="edit-media-upload"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {uploading ? 'Uploading...' : 'Choose Files'}
              </label>
            </div>

            {formData.media.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {formData.media.map((media, index) => (
                  <div key={index} className="relative group">
                    {media.type.startsWith('image/') ? (
                      <img src={`${API_URL.replace('/api', '')}${post.media[0].url}`} alt="Upload" className="w-full h-24 object-cover rounded-lg" />
                    ) : (
                      <video src={`${API_URL.replace('/api', '')}${post.media[0].url}`} className="w-full h-24 object-cover rounded-lg" />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Update Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BruinMarket;