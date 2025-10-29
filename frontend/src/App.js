import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Upload, DollarSign, Tag, Package } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

const BruinBuy = () => {
  const [posts, setPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(false);

  const categories = ['Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Other'];

  useEffect(() => {
    loadPosts();
  }, [filterCategory, filterType, priceRange, searchTerm]);

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
      alert('Failed to load posts. Make sure the backend is running on http://localhost:8080');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData) => {
    try {
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
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
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete post');
      
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">BruinBuy</h1>
              <p className="text-blue-100 text-sm mt-1">UCLA Student Marketplace</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md"
            >
              <Plus size={20} />
              Create Post
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="selling">Selling</option>
                <option value="buying">Looking to Buy</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="flex items-center text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading posts...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <PostCard key={post.id} post={post} onDelete={deletePost} />
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

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createPost}
          categories={categories}
        />
      )}
    </div>
  );
};

const PostCard = ({ post, onDelete }) => {
  const [showFullView, setShowFullView] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
        <div onClick={() => setShowFullView(true)}>
          {post.media && post.media.length > 0 && (
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
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.description}</p>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-500">
                <Tag size={16} />
                {post.category}
              </span>
              <span className="text-xl font-bold text-blue-600">${post.price}</span>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <button
            onClick={() => onDelete(post.id)}
            className="w-full bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            Delete Post
          </button>
        </div>
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
              <span className="text-3xl font-bold text-blue-600">${post.price}</span>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg">
                <Tag size={16} />
                {post.category}
              </span>
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

const CreatePostModal = ({ onClose, onCreate, categories }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: categories[0],
    type: 'selling',
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
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price ($) *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the item..."
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