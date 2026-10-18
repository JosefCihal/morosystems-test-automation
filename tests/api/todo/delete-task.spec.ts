import { deleteTasksById, getTasks, postTasksById } from '@api/todo/generated';
import { UNKNOWN_TASK_ID, uniqueTaskText } from '@api/todo/task.factory';
import { expect, test } from '@fixtures/api.fixture';

test.describe('Tasks API – delete task', () => {
  test(
    'DELETE /tasks/{id} removes the task and only that task',
    { annotation: { type: 'test case', description: 'API Testing – step 5 – Delete Task' } },
    async ({ apiClient, createTask }) => {
      const task = await createTask();
      const otherTask = await createTask();

      const { response } = await deleteTasksById({ client: apiClient, path: { id: task.id } });

      expect(response?.status).toBe(200);

      await test.step('The task is no longer returned, other tasks are kept', async () => {
        const { data: tasks, response: listResponse } = await getTasks({ client: apiClient });
        expect(listResponse?.status).toBe(200);
        expect(tasks?.map(({ id }) => id)).not.toContain(task.id);
        expect(tasks).toContainEqual(otherTask);
      });

      await test.step('The task can no longer be updated', async () => {
        const { response: updateResponse } = await postTasksById({
          client: apiClient,
          path: { id: task.id },
          body: { text: uniqueTaskText() },
        });
        expect(updateResponse?.status).toBe(404);
      });
    },
  );

  test(
    'DELETE /tasks/{id} returns 404 when the task does not exist',
    {
      annotation: {
        type: 'issue',
        description: 'F-02: Swagger documents 400 for an unknown task, but the API returns 404 (see README)',
      },
    },
    async ({ apiClient }) => {
      const { error, response } = await deleteTasksById({ client: apiClient, path: { id: UNKNOWN_TASK_ID } });

      expect(response?.status).toBe(404);
      expect(error).toBe('id not found, nothing to delete');
    },
  );
});
