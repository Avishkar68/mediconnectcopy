import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @desc    Create a new community post
 * @route   POST /api/posts
 * @access  Private
 */
const createPost = async (req, res) => {
  const { title, content, category } = req.body;

  if (!title || !content) {
    return sendError(res, 'Post title and content are required', 400);
  }

  try {
    const post = await Post.create({
      author: req.user._id,
      authorName: req.user.name,
      title,
      content,
      category: category || 'General',
    });

    return sendSuccess(res, 'Community post created successfully', post, 201);
  } catch (error) {
    console.error('CreatePost Error:', error.message);
    return sendError(res, 'Server error creating post', 500);
  }
};

/**
 * @desc    Get all community posts
 * @route   GET /api/posts
 * @access  Private
 */
const getPosts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate('author', 'name role');

    return sendSuccess(res, 'Posts retrieved successfully', posts);
  } catch (error) {
    console.error('GetPosts Error:', error.message);
    return sendError(res, 'Server error fetching posts', 500);
  }
};

/**
 * @desc    Like or unlike a community post
 * @route   POST /api/posts/:id/like
 * @access  Private
 */
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return sendError(res, 'Post not found', 404);
    }

    const userId = req.user._id;
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // Unlike post
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      await post.save();
      return sendSuccess(res, 'Post unliked successfully', post);
    } else {
      // Like post
      post.likes.push(userId);
      await post.save();

      // Trigger notification for the author (if liking someone else's post)
      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          type: 'info',
          message: `${req.user.name} liked your post: "${post.title.substring(0, 20)}..."`,
        });
      }

      return sendSuccess(res, 'Post liked successfully', post);
    }
  } catch (error) {
    console.error('LikePost Error:', error.message);
    return sendError(res, 'Server error toggling like', 500);
  }
};

/**
 * @desc    Add a comment to a community post
 * @route   POST /api/posts/:id/comment
 * @access  Private
 */
const commentPost = async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return sendError(res, 'Comment content is required', 400);
  }

  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return sendError(res, 'Post not found', 404);
    }

    const newComment = {
      author: req.user._id,
      authorName: req.user.name,
      content,
    };

    post.comments.push(newComment);
    await post.save();

    // Trigger notification to post author (if commenting on someone else's post)
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        type: 'info',
        message: `${req.user.name} commented on your post: "${post.title.substring(0, 20)}..."`,
      });
    }

    return sendSuccess(res, 'Comment added successfully', post);
  } catch (error) {
    console.error('CommentPost Error:', error.message);
    return sendError(res, 'Server error adding comment', 500);
  }
};

export { createPost, getPosts, likePost, commentPost };
