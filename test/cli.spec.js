const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const assert = require('assert');

const CLI = path.join(__dirname, '..', 'dist', 'bin', 'md2poui.js');

function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8', cwd, timeout: 10000
  });
  assert.ifError(result.error);
  assert.strictEqual(result.signal, null, 'CLI must exit normally');
  return result;
}

function assertFailure(result, message) {
  assert.notStrictEqual(result.status, 0, 'Expected a nonzero exit');
  assert.match(result.stderr, message);
  assert.doesNotMatch(result.stderr, /TypeError|\n\s+at\s/);
}

describe('md2poui CLI', () => {
  let root;
  let src;
  let dest;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'md2poui cli-'));
    src = path.join(root, 'markdown');
    dest = path.join(root, 'output');
    fs.mkdirSync(src);
    fs.writeFileSync(path.join(src, 'README.md'), '# Example\n\nCLI content.');
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  for (const [label, flags, home] of [
    ['home omitted', [], true],
    ['--home', ['--home'], true],
    ['--no-home', ['--no-home'], false]
  ]) {
    it(`converts positional paths and generates consistent helpers with ${label}`, () => {
      const result = runCli([src, dest, '--moduleName', 'docs', '--createHelpers', ...flags], root);
      assert.strictEqual(result.status, 0, result.stderr);
      assert.ok(fs.existsSync(path.join(dest, 'markdown.component.ts')));
      assert.match(fs.readFileSync(path.join(dest, 'markdown.component.html'), 'utf-8'), /CLI content\./);
      for (const extension of ['ts', 'html']) {
        assert.strictEqual(fs.existsSync(path.join(dest, `docs-home.component.${extension}`)), home);
      }
      for (const file of ['docs.module.ts', 'docs-routing.module.ts']) {
        const content = fs.readFileSync(path.join(dest, file), 'utf-8');
        assert.strictEqual(content.includes('DocsHomeComponent'), home, file);
        assert.strictEqual(content.includes("from './docs-home.component'"), home, file);
        assert.ok(content.includes('MarkdownComponent'), file);
      }
    });
  }

  for (const count of [0, 1]) {
    it(`rejects ${count} positional arguments before generating output`, () => {
      const before = fs.readdirSync(root);
      const result = runCli(count === 0 ? [] : [src], root);
      assertFailure(result, /srcPath|destDir|argument/i);
      assert.deepStrictEqual(fs.readdirSync(root), before);
    });
  }

  it('rejects a missing source without creating the destination', () => {
    const missing = path.join(root, 'missing');
    assertFailure(runCli([missing, dest], root), /Source path does not exist:/);
    assert.ok(!fs.existsSync(dest));
    assert.deepStrictEqual(fs.readdirSync(root), ['markdown']);
  });

  it('preserves existing output when the source is missing', () => {
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, 'keep.txt'), 'existing output');
    assertFailure(runCli([path.join(root, 'missing'), dest], root), /Source path does not exist:/);
    assert.deepStrictEqual(fs.readdirSync(dest), ['keep.txt']);
    assert.strictEqual(fs.readFileSync(path.join(dest, 'keep.txt'), 'utf-8'), 'existing output');
  });

  it('rejects a destination file without changing its contents or generating files', () => {
    fs.writeFileSync(dest, 'keep destination');
    const before = fs.readdirSync(root);
    assertFailure(runCli([src, dest], root), /Destination must be a directory:/);
    assert.strictEqual(fs.readFileSync(dest, 'utf-8'), 'keep destination');
    assert.deepStrictEqual(fs.readdirSync(root), before);
    assert.deepStrictEqual(fs.readdirSync(src), ['README.md']);
  });
});
