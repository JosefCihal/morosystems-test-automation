import { getTasks } from '@api/todo/generated';
import { expect, test } from '@fixtures/api.fixture';

test.describe('Tasks API – list tasks', () => {
  test(
    'GET /tasks lists newly created tasks with all their attributes',
    { annotation: { type: 'test case', description: 'API Testing – step 2 – Retrieve Task List' } },
    async ({ apiClient, createTask }) => {
      // Tests run in parallel and create tasks of their own, so the list is checked to contain these two,
      // not to have an exact size.
      const createdTasks = [await createTask(), await createTask()];

      const { data: tasks, response } = await getTasks({ client: apiClient });

      expect(response?.status).toBe(200);
      expect(response?.headers.get('content-type')).toContain('application/json');
      expect(tasks).toEqual(expect.arrayContaining(createdTasks));
    },
  );
});
