const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const assert = require('assert');

const CLI = path.join(__dirname, '..', 'dist', 'bin', 'md2poui.js');
const md2poui = require('../dist');

function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8', cwd, timeout: 10000
  });
  assert.ifError(result.error);
  assert.strictEqual(result.signal, null, 'CLI must exit normally');
  return result;
}

function read(...segments) {
  return fs.readFileSync(path.join(...segments), 'utf-8');
}

describe('md2poui page title', () => {
  let root;
  let src;
  let dest;

  function writeGuide(markdown) {
    fs.mkdirSync(path.join(src, 'guides'), { recursive: true });
    fs.writeFileSync(path.join(src, 'guides', 'README.md'), markdown);
  }

  function convert(...flags) {
    const result = runCli([src, dest, '--moduleName', 'docs', '--createHelpers', ...flags], root);
    assert.strictEqual(result.status, 0, result.stderr);
    return read(dest, 'guides', 'guides.component.html');
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'md2poui title-'));
    src = path.join(root, 'markdown');
    dest = path.join(root, 'output');
    fs.mkdirSync(src);
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('uses the component class name as page title and menu label when there is no H1', () => {
    writeGuide('A simple guide.');
    const html = convert();
    assert.strictEqual(
      html,
      '<po-page-default p-title="Guides"><p class="po-font-text">A simple guide.</p></po-page-default>'
    );
    const service = read(dest, 'docs.service.ts');
    assert.match(service, /label: 'Guides',\s*link: 'docs\/guides'/);
  });

  it('keeps the first H1 as page title and menu label without duplicating it in the body', () => {
    writeGuide('# Custom title\n\nGuide body.');
    const html = convert();
    assert.strictEqual(
      html,
      '<po-page-default p-title="Custom title"><p class="po-font-text">Guide body.</p></po-page-default>'
    );
    const service = read(dest, 'docs.service.ts');
    assert.match(service, /label: 'Custom title',\s*link: 'docs\/guides'/);
    assert.doesNotMatch(service, /label: 'Guides'/);
  });

  it('applies the class name fallback with --no-home and keeps generated references consistent', () => {
    writeGuide('A simple guide.');
    const html = convert('--no-home');
    assert.match(html, /^<po-page-default p-title="Guides">/);
    assert.match(html, /A simple guide\./);

    for (const extension of ['ts', 'html']) {
      assert.ok(!fs.existsSync(path.join(dest, `docs-home.component.${extension}`)), extension);
    }
    assert.match(read(dest, 'guides', 'guides.component.ts'), /templateUrl: 'guides\.component\.html'[\s\S]*class GuidesComponent/);
    for (const file of ['docs.module.ts', 'docs-routing.module.ts']) {
      const content = read(dest, file);
      assert.ok(!content.includes('DocsHomeComponent'), file);
      assert.ok(!content.includes('docs-home.component'), file);
      assert.ok(content.includes("import { GuidesComponent } from './guides/guides.component';"), file);
    }
    assert.match(read(dest, 'docs-routing.module.ts'), /path: 'guides',\s*component: GuidesComponent/);
    assert.match(read(dest, 'docs.service.ts'), /label: 'Guides',\s*link: 'docs\/guides'/);
  });

  it('keeps the Markdown text overload unchanged when there is no H1', () => {
    assert.strictEqual(
      md2poui('A simple guide.'),
      '<po-page-default p-title=""><p class="po-font-text">A simple guide.</p></po-page-default>'
    );
  });
});
