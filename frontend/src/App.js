import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Upload, DollarSign, Tag, Package, Dumbbell, Laptop, Ticket, Palette, Lamp, Grid3x3, User, LogOut, Shirt, NotebookPen, CircleQuestionMark, Footprints } from 'lucide-react';
import logo from './BruinBuyTransparent.svg';

const API_URL = 'http://localhost:8080/api';

const categories = [
  { name: 'All', value: 'all', icon: Grid3x3 },
  { name: 'Clothing', value: 'Clothing', icon: Shirt },
  { name: 'Sports Equipment', value: 'Sports Equipment', icon: Dumbbell },
  { name: 'Shoes', value: 'Shoes', icon: Footprints },
  { name: 'Class Supplies', value: 'Class Supplies', icon: NotebookPen },
  { name: 'Electronics', value: 'Electronics', icon: Laptop },
  { name: 'Tickets', value: 'Tickets', icon: Ticket },
  { name: 'Art', value: 'Art', icon: Palette },
  { name: 'Decorations', value: 'Decorations', icon: Lamp },
  { name: 'Other', value: 'Other', icon: CircleQuestionMark },
];

const BruinBuy = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [posts, setPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  useEffect(() => {
    if (!showProfile) {
      loadPosts();
    }
  }, [filterCategory, filterType, priceRange, searchTerm, showProfile]);

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
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setShowProfile(false);
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
      setShowAuthModal(true);
      return;
    }

    try {
      const payload = {
        ...postData,
        price: parseFloat(postData.price)
      };

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create post');
      
      const newPost = await response.json();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header - Full Width */}
      <div className="bg-blue-600 text-white shadow-lg fixed top-0 left-0 right-0 z-40">
        <div className="px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="BruinBuy Logo" className="h-20 w-20" />
            <div>
              <h1 className="text-3xl font-bold">BruinBuy</h1>
              <p className="text-blue-100 text-sm mt-1">UCLA Student Marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <User size={20} />
                  {user.name}
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md"
                >
                  <Plus size={20} />
                  Create Post
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md"
              >
                <User size={20} />
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Left Sidebar */}
      <div className="w-64 bg-white shadow-lg fixed left-0 top-[100px] bottom-0 overflow-y-auto">
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      filterCategory === cat.value && !showProfile
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
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
      <div className="flex-1 ml-64 mt-[100px]">
        <div className="p-8">
          {showProfile ? (
            <ProfilePage user={user} token={token} onDeletePost={deletePost} />
          ) : loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading posts...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onDelete={deletePost}
                    canDelete={user && post.user_id === user.id}
                  />
                ))}
              </div>

              {posts.length === 0 && (
                <div className="text-center py-12">
                  <Package size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No posts found. Create the first one!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={(token, user) => {
            setToken(token);
            setUser(user);
            localStorage.setItem('token', token);
            setShowAuthModal(false);
          }}
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
    </div>
  );
};

const ProfilePage = ({ user, token, onDeletePost }) => {
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
                src={`http://localhost:8080${user.profile_picture_url}`} 
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
            <p className="text-gray-600 mb-4">{user.email}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Total Posts: {myPosts.length}</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mb-6">My Posts</h3>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : myPosts.length === 0 ? (
        <div className="text-center py-12">
          <Package size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">You haven't created any posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myPosts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onDelete={handleDelete}
              canDelete={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AuthModal = ({ onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    if (!formData.email.endsWith('@ucla.edu')) {
      setError('Please use a @ucla.edu email address');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Login' : 'Sign Up'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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

const PostCard = ({ post, onDelete, canDelete }) => {
  const [showFullView, setShowFullView] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
        <div onClick={() => setShowFullView(true)}>
          {post.media && post.media.length > 0 ? (
            <div className="relative h-48 bg-gray-200">
              {post.media[0].type.startsWith('image/') ? (
                <img src={`http://localhost:8080${post.media[0].url}`} alt={post.title} className="w-full h-full object-cover" />
              ) : (
                <video src={`http://localhost:8080${post.media[0].url}`} className="w-full h-full object-cover" />
              )}
              {post.media.length > 1 && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                  +{post.media.length - 1} more
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-32 bg-gray-100" />
          )}

          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{post.title}</h3>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                post.type === 'selling' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {post.type === 'selling' ? 'Selling' : 'Buying'}
              </span>
            </div>
            
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{post.description}</p>
            
            {/* User info with profile picture */}
            <div className="flex items-center gap-2 mb-3">
              {post.user_profile_picture_url ? (
                <img 
                  src={`http://localhost:8080${post.user_profile_picture_url}`} 
                  alt={post.user_name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center">
                  <User size={14} className="text-blue-600" />
                </div>
              )}
              <p className="text-xs text-gray-500">{post.user_name}</p>
            </div>

            {post.location && (
              <p className="text-xs text-gray-500 mb-2">📍 {post.location}</p>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-500">
                <Tag size={16} />
                {post.category}
              </span>
              <span className="text-xl font-bold text-blue-600">
                {post.type === 'buying' ? 'Will Pay: ' : ''}${post.price}
              </span>
            </div>
          </div>
        </div>
        
        {canDelete && (
          <div className="px-4 pb-4">
            <button
              onClick={() => onDelete(post.id)}
              className="w-full bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            >
              Delete Post
            </button>
          </div>
        )}
      </div>

      {showFullView && (
        <PostFullView post={post} onClose={() => setShowFullView(false)} />
      )}
    </>
  );
};

const PostFullView = ({ post, onClose }) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{post.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {post.media && post.media.length > 0 && (
            <div className="mb-6">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4">
                {post.media[currentMediaIndex].type.startsWith('image/') ? (
                  <img 
                    src={`http://localhost:8080${post.media[currentMediaIndex].url}`}
                    alt={`Media ${currentMediaIndex + 1}`}
                    className="w-full h-96 object-contain"
                  />
                ) : (
                  <video 
                    src={`http://localhost:8080${post.media[currentMediaIndex].url}`}
                    controls
                    className="w-full h-96"
                  />
                )}
              </div>
              
              {post.media.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {post.media.map((media, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentMediaIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        idx === currentMediaIndex ? 'border-blue-600' : 'border-gray-300'
                      }`}
                    >
                      {media.type.startsWith('image/') ? (
                        <img src={`http://localhost:8080${media.url}`} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <video src={`http://localhost:8080${media.url}`} className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`px-4 py-2 rounded-lg font-semibold ${
                post.type === 'selling' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {post.type === 'selling' ? 'Selling' : 'Looking to Buy'}
              </span>
              <span className="text-3xl font-bold text-blue-600">
                {post.type === 'buying' ? 'Willing to Pay: ' : ''}${post.price}
              </span>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg">
                <Tag size={16} />
                {post.category}
              </span>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              {post.user_profile_picture_url ? (
                <img 
                  src={`http://localhost:8080${post.user_profile_picture_url}`} 
                  alt={post.user_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                  <User size={24} className="text-blue-600" />
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Posted by</p>
                <p className="font-semibold text-gray-900">{post.user_name}</p>
              </div>
            </div>
            {post.location && (
              <p className="text-sm text-gray-500 mt-2">📍 {post.location}</p>
            )}
          </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{post.description}</p>
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
    if (!formData.title || !formData.description || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Post Type *</label>
            <div className="flex gap-4">
              <button
                onClick={() => setFormData({...formData, type: 'selling'})}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  formData.type === 'selling'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Selling
              </button>
              <button
                onClick={() => setFormData({...formData, type: 'buying'})}
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
                      <img src={`http://localhost:8080${media.url}`} alt="Upload" className="w-full h-24 object-cover rounded-lg" />
                    ) : (
                      <video src={`http://localhost:8080${media.url}`} className="w-full h-24 object-cover rounded-lg" />
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

export default BruinBuy;