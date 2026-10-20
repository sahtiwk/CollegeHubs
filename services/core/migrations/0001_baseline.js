// Adopt current retained Core data; do not rewrite IDs, facts, receipts or scores.
module.exports = async function baseline() { return { done: true, cursor: null }; };
