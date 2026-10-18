import { expect, test as base } from '@playwright/test';
import { deleteTasksById, postTasks, type Task } from '@api/todo/generated';
import { createClient, createConfig, type Client } from '@api/todo/generated/client';
import { playwrightFetch } from '@api/playwright-fetch';
import { buildCreateTask } from '@api/todo/task.factory';
import { env } from '@config/env';

/** Deletes the tasks a test creates, also when the test fails. */
interface TaskCleanup {
  /** Registers the response data of a create request – a task that was created by mistake is deleted, too. */
  register: (task: Task | undefined) => void;
}

interface ApiFixtures {
  /** Client of the generated API connector (`@api/todo/generated`); its requests go through Playwright. */
  apiClient: Client;
  taskCleanup: TaskCleanup;
  /** Arrange helper: creates a task through the API and schedules its deletion after the test. */
  createTask: () => Promise<Task>;
}

export const test = base.extend<ApiFixtures>({
  apiClient: async ({ request }, use) => {
    await use(createClient(createConfig({ baseUrl: env.apiBaseUrl, fetch: playwrightFetch(request) })));
  },

  taskCleanup: async ({ apiClient }, use) => {
    const taskIds: string[] = [];

    await use({
      register: (task) => {
        if (typeof task?.id === 'string') {
          taskIds.push(task.id);
        }
      },
    });

    // Teardown: 404 means the test has already deleted the task itself. Soft assertions let every deletion run.
    for (const id of taskIds) {
      const { response } = await deleteTasksById({ client: apiClient, path: { id } });
      expect.soft([200, 404], `Cleanup of task ${id}`).toContain(response?.status);
    }
  },

  createTask: async ({ apiClient, taskCleanup }, use) => {
    await use(async () => {
      const { data: task, error, response } = await postTasks({ client: apiClient, body: buildCreateTask() });
      taskCleanup.register(task);
      if (response?.status !== 200 || typeof task?.id !== 'string') {
        throw new Error(
          `Precondition failed, no task created: HTTP ${String(response?.status)} ${String(error)}`,
        );
      }
      return task;
    });
  },
});

export { expect };
