import { randomUUID } from 'node:crypto';
import type { CreateTask, UpdateTask } from './generated';

/** Prefix that makes data created by the test suite easy to recognise in the shared backend database. */
const TEST_DATA_PREFIX = '[autotest]';

/** ID that never belongs to an existing task. */
export const UNKNOWN_TASK_ID = 'non-existent-task-id';

/** Unique task text, so that parallel tests never interfere with each other. */
export const uniqueTaskText = (label = 'task'): string => `${TEST_DATA_PREFIX} ${label} ${randomUUID()}`;

/** Valid payload of a new task with a unique text. */
export const buildCreateTask = (): CreateTask => ({ text: uniqueTaskText() });

/** Types a payload that violates the API contract as a request body (negative tests), so the tests need no casts. */
export const invalidPayload = (payload: object): CreateTask & UpdateTask =>
  payload as CreateTask & UpdateTask;
