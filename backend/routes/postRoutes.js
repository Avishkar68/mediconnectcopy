import express from 'express';
import {
  createPost,
  getPosts,
  likePost,
  commentPost,
} from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createPost)
  .get(protect, getPosts);

router.post('/:id/like', protect, likePost);
router.post('/:id/comment', protect, commentPost);

export default router;
