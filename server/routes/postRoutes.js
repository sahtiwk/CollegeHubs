const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');

// POST /api/posts - Create a new post (Require Auth)
router.post('/', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const post = await Post.create({
      content: content.trim(),
      author: req.user._id,
      likes: [],
    });

    // Populate author fields
    await post.populate('author', 'username fullName profilePicture rankTitle college');

    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/posts - Get all posts, sorted by newest first
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username fullName profilePicture rankTitle college')
      .sort({ createdAt: -1 })
      .exec();

    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// PUT /api/posts/:id/like - Toggle like on a post
router.put('/:id/like', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const isLiked = post.likes.some(
      (likeId) => likeId.toString() === userId.toString()
    );

    if (isLiked) {
      // Unlike: remove user from likes array
      post.likes = post.likes.filter(
        (likeId) => likeId.toString() !== userId.toString()
      );
    } else {
      // Like: add user to likes array
      post.likes.push(userId);
    }

    await post.save();

    // Populate author fields
    await post.populate('author', 'username fullName profilePicture rankTitle college');

    res.json(post);
  } catch (err) {
    console.error('Error toggling like:', err.message);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

module.exports = router;