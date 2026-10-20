const titles = Object.freeze([{ name: 'Seed', minimum: 0 }, { name: 'Contributor', minimum: 100 }, { name: 'Collaborator', minimum: 300 }, { name: 'Mentor', minimum: 1000 }]);
const badges = Object.freeze([
  { id: 'first-contribution', name: 'First Contribution', description: 'Share code or a resource, receive an accepted answer, or complete a Study session.' },
  { id: 'study-partner', name: 'Study Partner', description: 'Complete one Study session with a nonempty saved solution.' },
  { id: 'consistent-learner', name: 'Consistent Learner', description: 'Contribute on seven distinct qualifying activity days. They need not be consecutive.' },
  { id: 'academic-explorer', name: 'Academic Explorer', description: 'Master three distinct Learn nodes. Repeating a node does not count again.' },
]);
function titleFor(total) { return [...titles].reverse().find(item => total >= item.minimum)?.name || 'Seed'; }
module.exports = { version: 'achievements-v1', titles, badges, titleFor };
