import { getTasks, postTasks } from '@api/todo/generated';
import { buildCreateTask, invalidPayload, uniqueTaskText } from '@api/todo/task.factory';
import { expect, test } from '@fixtures/api.fixture';

/** Tolerance for comparing server timestamps with the local clock. */
const CLOCK_TOLERANCE_MS = 5_000;
/** A source code location such as "json.js:77" – the frames of a stack trace contain one. */
const SOURCE_CODE_LOCATION = /\.[cm]?[jt]s:\d+/;

const PAYLOADS_WITHOUT_TEXT = [
  { condition: 'is missing', payload: {} },
  { condition: 'is an empty string', payload: { text: '' } },
  { condition: 'is null', payload: { text: null } },
];

test.describe('Tasks API – create task', () => {
  test(
    'POST /tasks creates a task with server-generated attributes',
    { annotation: { type: 'test case', description: 'API Testing – step 3 – Create New Task' } },
    async ({ apiClient, taskCleanup }) => {
      const payload = buildCreateTask();
      const requestedAt = Date.now();

      const { data: task, response } = await postTasks({ client: apiClient, body: payload });
      taskCleanup.register(task);

      expect(response?.status).toBe(200);
      expect(task).toEqual({
        id: expect.stringMatching(/\S+/),
        text: payload.text,
        completed: false,
        createdDate: expect.any(Number),
      });
      expect(task?.createdDate).toBeGreaterThanOrEqual(requestedAt - CLOCK_TOLERANCE_MS);
      expect(task?.createdDate).toBeLessThanOrEqual(Date.now() + CLOCK_TOLERANCE_MS);

      await test.step('The task is stored', async () => {
        const { data: tasks, response: listResponse } = await getTasks({ client: apiClient });
        expect(listResponse?.status).toBe(200);
        expect(tasks?.filter(({ id }) => id === task?.id)).toEqual([task]);
      });
    },
  );

  test('POST /tasks ignores attributes that only the server may set', async ({ apiClient, taskCleanup }) => {
    const payload = { text: uniqueTaskText(), id: 'client-defined-id', completed: true, createdDate: 0 };
    const requestedAt = Date.now();

    // The contract does not forbid extra properties; that the server ignores these is an assumed rule (see README).
    const { data: task, response } = await postTasks({ client: apiClient, body: payload });
    taskCleanup.register(task);

    expect(response?.status).toBe(200);
    expect(task).toEqual({
      id: expect.stringMatching(/\S+/),
      text: payload.text,
      completed: false,
      createdDate: expect.any(Number),
    });
    expect(task?.id).not.toBe(payload.id);
    expect(task?.createdDate).toBeGreaterThanOrEqual(requestedAt - CLOCK_TOLERANCE_MS);

    await test.step('The task is stored with the server-generated attributes', async () => {
      const { data: tasks, response: listResponse } = await getTasks({ client: apiClient });
      expect(listResponse?.status).toBe(200);
      expect(tasks?.filter(({ id }) => id === task?.id)).toEqual([task]);
    });
  });

  for (const { condition, payload } of PAYLOADS_WITHOUT_TEXT) {
    test(`POST /tasks returns 422 when text ${condition}`, async ({ apiClient, taskCleanup }) => {
      const { data, error, response } = await postTasks({ client: apiClient, body: invalidPayload(payload) });
      taskCleanup.register(data);

      expect(response?.status).toBe(422);
      expect(error).toBe("'text' field must be present in json");
    });
  }

  test(
    'POST /tasks returns 422 when text is not a string',
    {
      annotation: {
        type: 'issue',
        description:
          'F-03: the API stores a task with a non-string value in the text attribute (e.g. 123) instead of rejecting it with 422 (see README)',
      },
    },
    async ({ apiClient, taskCleanup }) => {
      const { data, response } = await postTasks({ client: apiClient, body: invalidPayload({ text: 123 }) });
      taskCleanup.register(data);

      expect(response?.status).toBe(422);
    },
  );

  test(
    'POST /tasks rejects malformed JSON without revealing a stack trace',
    {
      annotation: {
        type: 'issue',
        description:
          'F-04: the API answers malformed JSON with an error page that reveals a stack trace and server paths (see README)',
      },
    },
    async ({ request }) => {
      // Sent through the raw request context, as the generated connector always serialises valid JSON. A Buffer
      // keeps the bytes as they are – Playwright would turn a string that is not valid JSON into a JSON string literal.
      const response = await request.post('/tasks', {
        headers: { 'Content-Type': 'application/json' },
        data: Buffer.from('{"text": '),
      });

      // The contract does not specify the status; any client error is correct, a server error or success is not.
      expect(response.status(), 'Client error status').toBeGreaterThanOrEqual(400);
      expect(response.status(), 'Client error status').toBeLessThan(500);
      expect(await response.text()).not.toMatch(SOURCE_CODE_LOCATION);
    },
  );
});
