import { pgTable, text, timestamp, json, integer, doublePrecision, boolean, pgEnum, customType, index } from 'drizzle-orm/pg-core';

// P3.1 bootstrap installs ONLY these session tables. All legacy declarations below
// are gated/uninstalled; do not run drizzle push or legacy migrations on this DB.
export const moduleHandoff = pgTable('module_handoff', {
  stateHash: text('state_hash').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const moduleSession = pgTable('module_session', {
  sessionHash: text('session_hash').primaryKey(),
  userId: text('user_id').notNull(), hubId: text('hub_id').notNull(),
  principal: json('principal').notNull(), theme: json('theme').notNull(),
  csrfHash: text('csrf_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('module_session_owner').on(table.hubId, table.userId), index('module_session_expiry').on(table.expiresAt)]);

export const auraTierEnum = pgEnum('aura_tier', ['Spark', 'Ember', 'Flame', 'Blaze', 'Aurora']);
export const sourceEnum = pgEnum('source', ['roadmap_sh', 'manual', 'wikipedia', 'youtube']);
export const nodeStatusEnum = pgEnum('node_status', ['locked', 'unlocked', 'in_progress', 'completed']);
export const quizModeEnum = pgEnum('quiz_mode', ['checkpoint', 'test_out']);
export const answerTypeEnum = pgEnum('answer_type', ['mcq', 'short_answer']);
export const auraEventTypeEnum = pgEnum('aura_event_type', ['checkpoint_pass', 'milestone_complete', 'path_complete', 'test_out_pass', 'streak_bonus']);

const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    return 'vector(3072)';
  },
  toDriver(value) {
    return `[${value.join(',')}]`;
  },
});

export const learner = pgTable('learner', {
  id: text('id').primaryKey(), // Clerk user id
  createdAt: timestamp('created_at').defaultNow().notNull(),
  skillVector: json('skill_vector').$type<Record<string, number>>(),
  careerGoal: text('career_goal'),
  interests: text('interests').array(),
  preferredFormat: text('preferred_format'),
  auraPoints: integer('aura_points').default(0).notNull(),
  auraTier: auraTierEnum('aura_tier').default('Spark').notNull(),
  streakDays: integer('streak_days').default(0).notNull(),
  lastActive: timestamp('last_active'),
});

export const roadmapSourceCache = pgTable('roadmap_source_cache', {
  trajectorySlug: text('trajectory_slug').primaryKey(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  rawTopicTree: json('raw_topic_tree').notNull(),
  matchedRoadmapIds: text('matched_roadmap_ids').array().notNull(),
});

export const contentItem = pgTable('content_item', {
  id: text('id').primaryKey(),
  source: sourceEnum('source').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  resourceSummary: text('resource_summary'),
  domain: text('domain').notNull(),
  topicTags: text('topic_tags').array(),
  estimatedDifficulty: doublePrecision('estimated_difficulty'),
  embedding: vector('embedding'),
});

export const skillNode = pgTable('skill_node', {
  id: text('id').primaryKey(),
  domain: text('domain').notNull(),
  category: text('category'), // New category field
  label: text('label').notNull(),
  difficulty: doublePrecision('difficulty').notNull(),
  prerequisiteIds: text('prerequisite_ids').array(),
  linkedContentIds: text('linked_content_ids').array(),
  checkpointItemBank: text('checkpoint_item_bank').array(),
});

export const learnerNodeState = pgTable('learner_node_state', {
  learnerId: text('learner_id').references(() => learner.id).notNull(),
  nodeId: text('node_id').references(() => skillNode.id).notNull(),
  status: nodeStatusEnum('status').default('locked').notNull(),
  testOutEligible: boolean('test_out_eligible').default(false).notNull(),
  testOutAttempted: boolean('test_out_attempted').default(false).notNull(),
  thetaEstimate: doublePrecision('theta_estimate'),
  lastCheckpointScore: doublePrecision('last_checkpoint_score'),
  attempts: integer('attempts').default(0).notNull(),
  seenQuizItemIds: text('seen_quiz_item_ids').array(),
  personalizedPrerequisiteIds: text('personalized_prerequisite_ids').array(),
}, (table) => {
  return {
    learnerStatusIdx: index('learner_status_idx').on(table.learnerId, table.status),
    learnerNodeIdx: index('learner_node_idx').on(table.learnerId, table.nodeId),
  };
});

export const llmCache = pgTable('llm_cache', {
  id: text('id').primaryKey(),
  promptHash: text('prompt_hash').notNull().unique(),
  response: text('response').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quizItem = pgTable('quiz_item', {
  id: text('id').primaryKey(),
  nodeId: text('node_id').references(() => skillNode.id).notNull(),
  mode: quizModeEnum('mode').notNull(),
  prompt: text('prompt').notNull(),
  answerType: answerTypeEnum('answer_type').notNull(),
  correctAnswerOrRubric: json('correct_answer_or_rubric').notNull(),
  irtDifficultyB: doublePrecision('irt_difficulty_b').notNull(),
  pointValue: doublePrecision('point_value').notNull(),
});

export const auraEvent = pgTable('aura_event', {
  id: text('id').primaryKey(),
  learnerId: text('learner_id').references(() => learner.id).notNull(),
  nodeId: text('node_id').references(() => skillNode.id),
  type: auraEventTypeEnum('type').notNull(),
  pointsAwarded: doublePrecision('points_awarded').notNull(),
  breakdown: json('breakdown').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
