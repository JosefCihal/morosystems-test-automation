import { getTasks, postTasksById } from '@api/todo/generated';
import { UNKNOWN_TASK_ID, invalidPayload, uniqueTaskText } from '@api/todo/task.factory';
import { expect, test } from '@fixtures/api.fixture';

test.describe('Tasks API – update task', () => {
  test(
    'POST /tasks/{id} updates the task text and keeps other attributes and tasks',
    { annotation: { type: 'test case', description: 'API Testing – step 4 – Update Task Information' } },
    async ({ apiClient, createTask }) => {
      const task = await createTask();
      const otherTask = await createTask();
      const newText = uniqueTaskText('updated');

      const { data: updatedTask, response } = await postTasksById({
        client: apiClient,
        path: { id: task.id },
        body: { text: newText },
      });

      expect(response?.status).toBe(200);
      expect(updatedTask).toEqual({ ...task, text: newText });

      await test.step('The change is persisted, other tasks are unchanged', async () => {
        const { data: tasks, response: listResponse } = await getTasks({ client: apiClient });
        expect(listResponse?.status).toBe(200);
        expect(tasks?.filter(({ id }) => id === task.id)).toEqual([{ ...task, text: newText }]);
        expect(tasks).toContainEqual(otherTask);
      });
    },
  );

  test('POST /tasks/{id} returns 422 when text is missing and keeps the task unchanged', async ({
    apiClient,
    createTask,
  }) => {
    const task = await createTask();

    const { error, response } = await postTasksById({
      client: apiClient,
      path: { id: task.id },
      body: invalidPayload({}),
    });

    expect(response?.status).toBe(422);
    expect(error).toBe("'text' field must be present in json");

    await test.step('The task is unchanged', async () => {
      const { data: tasks, response: listResponse } = await getTasks({ client: apiClient });
      expect(listResponse?.status).toBe(200);
      expect(tasks?.filter(({ id }) => id === task.id)).toEqual([task]);
    });
  });

  test(
    'POST /tasks/{id} returns 404 when the task does not exist',
    {
      annotation: {
        type: 'issue',
        description:
          'F-02: Swagger does not document this 404 of POST /tasks/{id} for an unknown task (see README)',
      },
    },
    async ({ apiClient }) => {
      const { error, response } = await postTasksById({
        client: apiClient,
        path: { id: UNKNOWN_TASK_ID },
        body: { text: uniqueTaskText() },
      });

      expect(response?.status).toBe(404);
      expect(error).toBe('id not found, nothing to update');
    },
  );

  test(
    'PUT /tasks/{id} is not supported – the API updates tasks via POST /tasks/{id}',
    {
      annotation: {
        type: 'issue',
        description:
          'F-01: the test case updates tasks with PUT, but the API offers only POST /tasks/{id} (see README)',
      },
    },
    async ({ request, apiClient, createTask }) => {
      const task = await createTask();

      // Sent through the raw request context on purpose: the generated connector only offers endpoints of the contract.
      const response = await request.put(`/tasks/${task.id}`, { data: { text: uniqueTaskText() } });

      // The task exists, so a supported PUT would succeed: 405 is the precise answer, 404 is how Express answers.
      expect([404, 405], 'Status of an unsupported method').toContain(response.status());

      await test.step('The task is unchanged', async () => {
        const { data: tasks, response: listResponse } = await getTasks({ client: apiClient });
        expect(listResponse?.status).toBe(200);
        expect(tasks?.filter(({ id }) => id === task.id)).toEqual([task]);
      });
    },
  );
});
