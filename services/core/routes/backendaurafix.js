// ─── ADD THIS TO YOUR POST CREATION ROUTE ────────────────────────────────────
// In your server routes file (e.g. server/routes/posts.js or similar)
// Find your POST /api/posts route and add the aura increment after saving the post:

// BEFORE (what you likely have):
router.post('/', authMiddleware, async (req, res) => {
    try {
      const post = new Post({
        author: req.user._id,
        content: req.body.content,
      });
      await post.save();
      const populated = await post.populate('author', 'username fullName profilePicture rankTitle');
      res.status(201).json(populated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // AFTER (add the aura increment block):
  router.post('/', authMiddleware, async (req, res) => {
    try {
      const post = new Post({
        author: req.user._id,
        content: req.body.content,
      });
      await post.save();
  
      // ── AURA BOOST: +10 Aura for posting ──────────────────────────────────
      const AURA_PER_POST = 10;
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { auraPoints: AURA_PER_POST },
      });
      // ──────────────────────────────────────────────────────────────────────
  
      const populated = await post.populate('author', 'username fullName profilePicture rankTitle');
      res.status(201).json(populated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // ─── ALSO ADD AURA FOR LIKES RECEIVED ─────────────────────────────────────────
  // In your PUT /api/posts/:id/like route, after toggling the like:
  // When someone LIKES your post, give the POST AUTHOR +5 Aura
  // Find the section where you check if already liked:
  
  // After the like toggle logic, add:
  if (!alreadyLiked) {
    // Someone just liked — give author Aura
    await User.findByIdAndUpdate(post.author, {
      $inc: { auraPoints: 5 },
    });
  }
  // If unlike, optionally deduct: $inc: { auraPoints: -5 }
  
  // ─── AURA AMOUNTS (adjust as you like) ───────────────────────────────────────
  // Post created:     +10 Aura
  // Like received:    +5 Aura
  // Comment made:     +3 Aura (add similarly to comment route)
  // Daily login:      +2 Aura (add to auth/login route)
  // ─────────────────────────────────────────────────────────────────────────────