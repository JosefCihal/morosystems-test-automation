import { test, type APIRequestContext } from '@playwright/test';

/**
 * `fetch` implementation for the generated API client that sends requests through Playwright's request context,
 * so every call appears as a step in the report and is recorded in the trace.
 */
export const playwrightFetch =
  (request: APIRequestContext): typeof fetch =>
  async (input, init) => {
    const outgoing = new Request(input, init);
    // Raw bytes, sent as they are: Playwright would turn a JSON body that is not valid JSON into a JSON string literal.
    const body = Buffer.from(await outgoing.arrayBuffer());

    const response = await test.step(
      `${outgoing.method} ${new URL(outgoing.url).pathname}`,
      () =>
        request.fetch(outgoing.url, {
          method: outgoing.method,
          headers: Object.fromEntries(outgoing.headers),
          ...(body.length > 0 ? { data: body } : {}),
        }),
      { box: true },
    );

    const headers = new Headers();
    for (const { name, value } of response.headersArray()) {
      headers.append(name, value);
    }
    const responseBody = await response.body();
    // A response without content (e.g. 204) must get no body at all, not an empty one.
    return new Response(responseBody.length > 0 ? new Uint8Array(responseBody) : null, {
      status: response.status(),
      statusText: response.statusText(),
      headers,
    });
  };
