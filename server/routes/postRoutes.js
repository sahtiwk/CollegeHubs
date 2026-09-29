const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { requireTenant, scopedFilter } = require('../services/hubAccess');
const { authenticate } = require('../middleware/auth');

// POST /api/posts - Create a new post (Require Auth)
router.post('/', authenticate, requireTenant, async (req, res) => {
  try {
    const { content } = req.body;

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const post = await Post.create({
      hubId: req.hub.hubId,
      content: content.trim(),
      author: req.user._id,
      likes: [],
    });

    // Populate author fields
    await post.populate({ path: 'author', select: 'username fullName profilePicture rankTitle college', match: scopedFilter(req.hub, { membershipStatus: 'active' }) });

    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err.message);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/posts - Get all posts, sorted by newest first
router.get('/', authenticate, requireTenant, async (req, res) => {
  try {
    const posts = await Post.find(scopedFilter(req.hub))
      .populate({ path: 'author', select: 'username fullName profilePicture rankTitle college', match: scopedFilter(req.hub, { membershipStatus: 'active' }) })
      .sort({ createdAt: -1 })
      .exec();

    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// PUT /api/posts/:id/like - Toggle like on a post
router.put('/:id/like', authenticate, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!/^[a-f0-9]{24}$/i.test(id)) return res.status(404).json({ error: 'Post not found' });
    const post = await Post.findOne(scopedFilter(req.hub, { _id: id }));
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
    await post.populate({ path: 'author', select: 'username fullName profilePicture rankTitle college', match: scopedFilter(req.hub, { membershipStatus: 'active' }) });

    res.json(post);
  } catch (err) {
    console.error('Error toggling like:', err.message);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

module.exports = router;