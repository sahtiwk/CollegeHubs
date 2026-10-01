const router = require('express').Router();
const Post = require('../models/Post');
const { requireTenant, scopedFilter } = require('../services/hubAccess');
const { authenticate } = require('../middleware/auth');
const { text, bodyObject, respondError, badInput } = require('../utils/validation');
const { pageInput, cursorFor } = require('../utils/pagination');
router.use(authenticate, requireTenant);
const author = hub => ({ path: 'author', select: 'username fullName profilePicture rankTitle', match: scopedFilter(hub, { membershipStatus: 'active' }) });
router.post('/', async (req, res) => {
  try {
    const content = text(bodyObject(req.body).content, 'Post content', 8192, true);
    if (Buffer.byteLength(content, 'utf8') > 8192) throw badInput('Post content must be at most 8 KiB');
    const post = await Post.create({ hubId: req.hub.hubId, content, author: req.user._id, likes: [] });
    await post.populate(author(req.hub));
    res.status(201).json(post);
  } catch (err) { respondError(res, err, 'Failed to create post'); }
});
router.get('/', async (req, res) => {
  try {
    const { limit, after } = pageInput(req.query, 'posts', req.hub.hubId);
    const rows = await Post.find(scopedFilter(req.hub, after)).populate(author(req.hub))
      .sort({ createdAt: -1, _id: 1 }).limit(limit + 1).exec();
    const items = rows.slice(0, limit);
    res.set('Cache-Control', 'no-store').json({ items, nextCursor: rows.length > limit ? cursorFor('posts', req.hub.hubId, items.at(-1)) : null });
  } catch (err) { respondError(res, err, 'Failed to fetch posts'); }
});
// Atomic, idempotent writes: retrying cannot undo the requested state.
async function like(req, res) {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).json({ error: 'Post not found' });
    const update = req.method === 'PUT' ? { $addToSet: { likes: req.user._id } } : { $pull: { likes: req.user._id } };
    const post = await Post.findOneAndUpdate(scopedFilter(req.hub, { _id: req.params.id }), update, { new: true }).populate(author(req.hub));
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) { respondError(res, err, 'Failed to update like'); }
}
router.put('/:id/like', like);
router.delete('/:id/like', like);
module.exports = router;
