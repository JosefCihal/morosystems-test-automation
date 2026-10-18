import { appendFileSync } from 'node:fs';
import { relative } from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

const COLUMNS = [
  { outcome: 'expected', title: 'Passed' },
  { outcome: 'unexpected', title: 'Failed' },
  { outcome: 'flaky', title: 'Flaky' },
  { outcome: 'skipped', title: 'Skipped' },
] as const;

/**
 * Writes the results to the job summary of a GitHub Actions run: test counts per project, the duration, and the
 * failed, flaky and skipped tests with their error or reason. Does nothing outside GitHub Actions.
 */
export default class JobSummaryReporter implements Reporter {
  private rootSuite: Suite | undefined;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.rootSuite = suite;
  }

  onEnd(result: FullResult): void {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile && this.rootSuite) {
      appendFileSync(summaryFile, summarise(this.rootSuite, result));
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}

function summarise(rootSuite: Suite, result: FullResult): string {
  const tests = rootSuite.allTests();
  const failed = tests.filter((test) => test.outcome() === 'unexpected');
  const flaky = tests.filter((test) => test.outcome() === 'flaky');
  const skipped = tests.filter((test) => test.outcome() === 'skipped');

  return [
    `## Playwright results: ${result.status}`,
    table(
      ['Project', ...COLUMNS.map(({ title }) => title), 'Total'],
      [
        ...rootSuite.suites.map((project) => countRow(project.title, project.allTests())),
        countRow('**All**', tests),
      ],
      { alignNumbers: true },
    ),
    `Duration: ${formatDuration(result.duration)}. The HTML report with traces is attached as the \`playwright-report\` artifact.`,
    failed.length > 0 &&
      section('Failed tests', ['Test', 'Error', 'Known issue'], failed, (test) => [
        name(test),
        errorSummary(lastResult(test)?.error?.message),
        annotation(test, 'issue'),
      ]),
    flaky.length > 0 &&
      section('Flaky tests (passed on retry)', ['Test', 'Error of the failed attempt'], flaky, (test) => [
        name(test),
        errorSummary(test.results.find(({ status }) => status !== 'passed')?.error?.message),
      ]),
    skipped.length > 0 &&
      section('Skipped tests', ['Test', 'Reason'], skipped, (test) => [name(test), annotation(test, 'skip')]),
  ]
    .filter(Boolean)
    .join('\n\n')
    .concat('\n');
}

function countRow(project: string, tests: TestCase[]): string[] {
  const count = (outcome: string) => String(tests.filter((test) => test.outcome() === outcome).length);
  return [project, ...COLUMNS.map(({ outcome }) => count(outcome)), String(tests.length)];
}

function section(
  title: string,
  header: string[],
  tests: TestCase[],
  row: (test: TestCase) => string[],
): string {
  return `### ${title}\n\n${table(header, tests.map(row))}`;
}

/** Error messages may contain HTML (e.g. an error page) and pipes, which must not break the Markdown table. */
function table(header: string[], rows: string[][], { alignNumbers = false } = {}): string {
  const escapeCell = (cell: string) =>
    cell.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '\\|');
  const line = (cells: string[]) => `| ${cells.map(escapeCell).join(' | ')} |`;
  const separator = header.map((_, index) => (alignNumbers && index > 0 ? '---:' : '---'));
  return [line(header), `| ${separator.join(' | ')} |`, ...rows.map(line)].join('\n');
}

/** `[project] file:line › describe › title` – the way Playwright names a test in its output. */
function name(test: TestCase): string {
  const [, project = '', , ...titles] = test.titlePath();
  const location = `${relative(process.cwd(), test.location.file)}:${test.location.line}`;
  return `[${project}] ${location} › ${titles.join(' › ')}`;
}

function lastResult(test: TestCase): TestResult | undefined {
  return test.results.at(-1);
}

function annotation(test: TestCase, type: string): string {
  return lastResult(test)?.annotations.find((item) => item.type === type)?.description ?? '';
}

/** The start of an error message without terminal colours – enough to see what was expected and received. */
function errorSummary(message = ''): string {
  return (
    message
      // eslint-disable-next-line no-control-regex -- ANSI colour codes start with the ESC control character.
      .replace(/\u001b\[[\d;]*m/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((line) => line.replace(/^Error: /, ''))
      .map((line) => (line.length > 160 ? `${line.slice(0, 160)}…` : line))
      .join(' · ')
  );
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1000);
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
