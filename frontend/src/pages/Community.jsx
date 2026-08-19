import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { MessageSquare, Heart, PlusCircle, Tag, User, Calendar, CornerDownRight } from 'lucide-react';

const Community = () => {
  const { user } = useAuth();
  
  // Feed States
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  // Create Post Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('General');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Comment States
  const [commentInputs, setCommentInputs] = useState({});

  const categories = ['All', 'General', 'Health Tips', 'Medical News', 'Mental Health', 'Support Group'];

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const url = activeCategory === 'All' ? '/posts' : `/posts?category=${activeCategory}`;
      const response = await api.get(url);
      if (response.success && response.data) {
        setPosts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!postTitle.trim() || !postContent.trim()) {
      setCreateError('Post title and content are required.');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await api.post('/posts', {
        title: postTitle,
        content: postContent,
        category: postCategory,
      });

      if (response.success) {
        // Clear forms and reload feed
        setPostTitle('');
        setPostContent('');
        setPostCategory('General');
        setModalOpen(false);
        fetchPosts();
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create post.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await api.post(`/posts/${postId}/like`);
      if (response.success && response.data) {
        // Update specific post in the state list
        setPosts(prev =>
          prev.map(post => (post._id === postId ? { ...post, likes: response.data.likes } : post))
        );
      }
    } catch (err) {
      console.error('Failed to like post:', err.message);
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId];

    if (!commentText || !commentText.trim()) return;

    try {
      const response = await api.post(`/posts/${postId}/comment`, {
        content: commentText,
      });

      if (response.success && response.data) {
        // Update post with the new comments list returned
        setPosts(prev =>
          prev.map(post => (post._id === postId ? { ...post, comments: response.data.comments } : post))
        );
        // Clear input field for this post
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (err) {
      console.error('Failed to submit comment:', err.message);
    }
  };

  const handleCommentInputChange = (postId, value) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  const getRoleColor = (role) => {
    if (role === 'doctor') return 'text-emerald-400';
    if (role === 'admin') return 'text-purple-400';
    return 'text-sky-400';
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Community Forum</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Share advice, tips, and seek support in our encrypted medical community.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="flex items-center space-x-1">
          <PlusCircle className="w-4 h-4" />
          <span>New Discussion</span>
        </Button>
      </div>

      {/* Category Horizontal scroll tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              activeCategory === cat
                ? 'bg-brand-500 border-brand-500 text-dark-950 shadow-md shadow-brand-500/10'
                : 'glass-card border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts Feed */}
      {loading ? (
        <Loader />
      ) : posts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-white text-base">No discussions found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Be the first to start a thread in this category! Ask a question or share a healthcare tip.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => {
            const hasLiked = post.likes.includes(user?._id);
            return (
              <div key={post._id} className="glass-card rounded-2xl p-6 border border-slate-800/80 transition-all hover:border-slate-700/60 shadow-lg">
                
                {/* Meta details */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-8 h-8 bg-slate-800 border border-slate-700/80 rounded-full flex items-center justify-center text-white font-bold">
                      {post.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-200">{post.authorName}</h5>
                      <span className={`text-[9px] uppercase tracking-wider font-semibold ${getRoleColor(post.author?.role)}`}>
                        {post.author?.role || 'patient'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400 font-semibold">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Title & Body */}
                <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Tags & Action Buttons */}
                <div className="flex justify-between items-center border-t border-slate-800/80 pt-3">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/15 text-[10px] text-brand-400 font-medium">
                    <Tag className="w-3 h-3" />
                    <span>{post.category}</span>
                  </span>

                  <div className="flex items-center space-x-4">
                    {/* Like Action */}
                    <button
                      onClick={() => handleLike(post._id)}
                      className={`flex items-center space-x-1.5 text-xs font-semibold transition-colors py-1 px-2 rounded-lg hover:bg-red-500/5 ${
                        hasLiked ? 'text-red-400' : 'text-slate-400 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{post.likes.length}</span>
                    </button>
                    {/* Comments Count */}
                    <span className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments.length}</span>
                    </span>
                  </div>
                </div>

                {/* Nested Comments Display */}
                {post.comments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/50 space-y-2.5">
                    {post.comments.map(comment => (
                      <div key={comment._id} className="flex space-x-2 text-xs bg-slate-900/30 p-2.5 rounded-xl border border-slate-850">
                        <CornerDownRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-300">{comment.authorName}</span>
                            <span className="text-[9px] text-slate-500">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-400 mt-0.5">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment Input Form */}
                <form onSubmit={(e) => handleCommentSubmit(e, post._id)} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add comment to conversation..."
                    value={commentInputs[post._id] || ''}
                    onChange={(e) => handleCommentInputChange(post._id, e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 focus:shadow-[0_0_0_1px_rgba(14,165,233,0.15)]"
                  />
                  <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                    Reply
                  </Button>
                </form>

              </div>
            );
          })}
        </div>
      )}

      {/* Create Post Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Start New Discussion">
        <form onSubmit={handleCreatePost} className="space-y-4">
          {createError && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center">
              {createError}
            </div>
          )}

          <Input
            label="Discussion Title"
            placeholder="e.g., Quick tips on managing hypertension diet"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
          />

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Discussion Category
            </label>
            <select
              value={postCategory}
              onChange={(e) => setPostCategory(e.target.value)}
              className="glass-input px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-700/50 text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              {categories.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat} className="bg-slate-950">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Discussion Content
            </label>
            <textarea
              placeholder="Describe your question or advice in detail here..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="glass-input px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-700/50 text-slate-100 focus:border-brand-500 focus:outline-none h-32 resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createLoading}>
              Publish Post
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Community;
