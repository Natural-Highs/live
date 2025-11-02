#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'src');
const diagramsRoot = path.join(repoRoot, 'docs/diagrams/src');
const readmePath = path.join(repoRoot, 'docs/diagrams/README.md');
const README_START_MARKER = '<!-- DIAGRAM-LIST:START -->';
const README_END_MARKER = '<!-- DIAGRAM-LIST:END -->';

const diagramEntries = [];
const posixPath = path.posix;

const SVELTE_SPECIAL_TAGS = new Set([
  'SLOT',
  'SLOTNAME',
  'SVELTE:BODY',
  'SVELTE:COMPONENT',
  'SVELTE:WINDOW',
  'SVELTE:HEAD',
  'SVELTE:SELF',
  'SVELTE:FRAGMENT',
  'SVELTE:OPTIONS',
]);

const ensureDir = async dir => {
  await fs.mkdir(dir, { recursive: true });
};

const readAllFiles = async dir => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readAllFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const sanitizeId = relativePath => {
  const cleaned = relativePath.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
};

const buildDiagramName = relativePath => {
  const sanitizeSegment = segment => {
    let result = '';
    for (const char of segment) {
      if (/^[A-Za-z0-9]$/.test(char)) {
        result += char;
      } else if (char === '[') {
      } else if (char === ']') {
        result += '_';
      } else if (char === '+') {
      } else {
        result += '_';
      }
    }
    return result || '_';
  };

  return relativePath.split('/').map(sanitizeSegment).join('__');
};

const hasModifier = (node, kind) =>
  Array.isArray(node.modifiers) && node.modifiers.some(mod => mod.kind === kind);

const analyzeTsLike = (content, fileName, scriptKind = ts.ScriptKind.TS) => {
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );
  const imports = new Set();
  const exports = [];
  const reExports = [];

  const visit = node => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const moduleName = node.moduleSpecifier.getText(sourceFile).slice(1, -1);
      imports.add(moduleName);
    } else if (ts.isImportEqualsDeclaration(node) && node.moduleReference) {
      if (ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression) {
        const moduleName = node.moduleReference.expression.getText(sourceFile).slice(1, -1);
        imports.add(moduleName);
      }
    } else if (ts.isExportAssignment(node)) {
      const details = node.expression ? node.expression.getText(sourceFile) : '';
      exports.push({
        type: node.isExportEquals ? 'export=' : 'default',
        name: 'default',
        details,
      });
    } else if (ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier
        ? node.moduleSpecifier.getText(sourceFile).slice(1, -1)
        : undefined;
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const name = element.name.getText(sourceFile);
          const propertyName = element.propertyName?.getText(sourceFile);
          const exportName = propertyName ? `${propertyName} as ${name}` : name;
          const entry = {
            type: 're-export',
            name: exportName,
            details: moduleSpecifier,
          };
          reExports.push(entry);
        }
      } else if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
        reExports.push({
          type: 're-export',
          name: `* as ${node.exportClause.name.getText(sourceFile)}`,
          details: moduleSpecifier,
        });
      } else if (!node.exportClause) {
        reExports.push({
          type: 're-export',
          name: '*',
          details: moduleSpecifier,
        });
      }
    } else if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      hasModifier(node, ts.SyntaxKind.ExportKeyword)
    ) {
      const type = ts.isFunctionDeclaration(node)
        ? hasModifier(node, ts.SyntaxKind.DefaultKeyword)
          ? 'default function'
          : hasModifier(node, ts.SyntaxKind.AsyncKeyword)
            ? 'async function'
            : 'function'
        : ts.isClassDeclaration(node)
          ? hasModifier(node, ts.SyntaxKind.DefaultKeyword)
            ? 'default class'
            : 'class'
          : ts.isInterfaceDeclaration(node)
            ? 'interface'
            : 'enum';
      const name = node.name ? node.name.getText(sourceFile) : 'default';
      exports.push({ type, name });
    } else if (ts.isTypeAliasDeclaration(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      const type = hasModifier(node, ts.SyntaxKind.DefaultKeyword) ? 'default type' : 'type';
      exports.push({ type, name: node.name.getText(sourceFile) });
    } else if (ts.isVariableStatement(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      const isConst = (node.declarationList.flags & ts.NodeFlags.Const) === ts.NodeFlags.Const;
      const declType = isConst ? 'const' : 'let';
      const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
      for (const declaration of node.declarationList.declarations) {
        const name = declaration.name.getText(sourceFile);
        const initializer = declaration.initializer ? declaration.initializer.kind : undefined;
        const asyncValue =
          initializer &&
          ts.isArrowFunction(declaration.initializer) &&
          hasModifier(declaration.initializer, ts.SyntaxKind.AsyncKeyword);
        const type = asyncValue ? 'async const' : declType;
        exports.push({ type: isDefault ? `default ${type}` : type, name });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return { imports: Array.from(imports).sort(), exports, reExports };
};

const analyzeSvelte = (content, relativePath) => {
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  const scriptContent = scriptMatch ? scriptMatch[1] : '';
  const markupOnly = scriptMatch ? content.replace(scriptMatch[0], '') : content;

  const tsInfo = analyzeTsLike(scriptContent, relativePath, ts.ScriptKind.TS);

  const props = [];
  for (const exp of tsInfo.exports) {
    if (exp.type === 'let') {
      props.push(exp.name);
    }
  }

  const componentSet = new Set();
  const componentRegex = /<([A-Z][A-Za-z0-9_]*)\b/g;
  let match = componentRegex.exec(markupOnly);
  while (match !== null) {
    const componentName = match[1];
    const tag = componentName.toUpperCase();
    if (!SVELTE_SPECIAL_TAGS.has(tag)) {
      componentSet.add(componentName);
    }
    match = componentRegex.exec(markupOnly);
  }

  return { ...tsInfo, props, components: Array.from(componentSet).sort() };
};

const splitImports = (relativePath, imports) => {
  const local = [];
  const external = [];
  const currentDir = path.dirname(relativePath);
  for (const specifier of imports) {
    if (specifier.startsWith('.')) {
      const normalized = path.normalize(path.join(currentDir, specifier));
      local.push(normalized.replace(/\\/g, '/'));
    } else {
      external.push(specifier);
    }
  }
  return {
    local: Array.from(new Set(local)).sort(),
    external: Array.from(new Set(external)).sort(),
  };
};

const formatExportLine = exp => {
  const label = exp.type ? `${exp.type} ${exp.name}` : exp.name;
  return `+ ${label}`.trim();
};

const buildNoteSections = info => {
  const sections = [];
  if (info.localImports.length || info.externalImports.length) {
    const lines = ['Imports:'];
    if (info.localImports.length) {
      lines.push('  Local:');
      for (const imp of info.localImports) {
        lines.push(`  - ${imp}`);
      }
    }
    if (info.externalImports.length) {
      lines.push('  External:');
      for (const imp of info.externalImports) {
        lines.push(`  - ${imp}`);
      }
    }
    sections.push(lines);
  }
  if (info.reExports.length) {
    const lines = ['Re-exports:'];
    for (const exp of info.reExports) {
      const detail = exp.details ? ` from ${exp.details}` : '';
      lines.push(`  - ${exp.name}${detail}`);
    }
    sections.push(lines);
  }
  if (info.props?.length) {
    const lines = ['Svelte props:'];
    for (const prop of info.props) {
      lines.push(`  - ${prop}`);
    }
    sections.push(lines);
  }
  if (info.components?.length) {
    const lines = ['Child components:'];
    for (const comp of info.components) {
      lines.push(`  - ${comp}`);
    }
    sections.push(lines);
  }
  return sections;
};

const createDiagram = (relativePath, analysis, stereotype, diagramName) => {
  const id = sanitizeId(relativePath);
  const startumlName = diagramName ?? buildDiagramName(relativePath);
  const lines = [
    `@startuml ${startumlName}`,
    `title ${relativePath}`,
    `class "${relativePath}" as ${id} <<${stereotype}>> {`,
  ];
  if (analysis.exports.length) {
    for (const exp of analysis.exports) {
      lines.push(`  ${formatExportLine(exp)}`);
    }
  } else {
    lines.push('  -- no exports --');
  }
  lines.push('}');

  const noteSections = buildNoteSections(analysis);
  if (noteSections.length) {
    lines.push(`note bottom of ${id}`);
    noteSections.forEach((section, idx) => {
      if (idx > 0) {
        lines.push('  ');
      }
      for (const line of section) {
        lines.push(`  ${line}`);
      }
    });
    lines.push('end note');
  }

  lines.push('@enduml', '');
  return lines.join('\n');
};

const generateDiagramIndexMarkdown = entries => {
  if (!entries.length) {
    return '_No diagrams generated yet._';
  }

  const sortedEntries = [...entries].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const createNode = (name, fullPath) => ({
    name,
    fullPath,
    files: [],
    children: new Map(),
  });

  const root = createNode('src', 'src');

  for (const entry of sortedEntries) {
    const segments = entry.directory ? entry.directory.split('/') : [];
    let node = root;
    const pathSegments = [];

    for (const segment of segments) {
      pathSegments.push(segment);
      if (!node.children.has(segment)) {
        const fullPath = `src/${pathSegments.join('/')}`;
        node.children.set(segment, createNode(segment, fullPath));
      }
      node = node.children.get(segment);
    }

    node.files.push(entry);
  }

  const countDiagrams = node =>
    node.files.length +
    [...node.children.values()].reduce((total, child) => total + countDiagrams(child), 0);

  const renderNode = (node, summaryLabel, defaultOpen = false) => {
    const count = countDiagrams(node);
    const label = summaryLabel ?? node.fullPath ?? node.name ?? 'src';
    const openAttr = defaultOpen ? ' open' : '';

    const lines = [];
    lines.push(`<details${openAttr}>`);
    lines.push(`<summary>${label} [${count}]</summary>`);
    lines.push('');

    if (node.files.length) {
      const sortedFiles = [...node.files].sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath)
      );
      lines.push('| Source | Diagram | Details |');
      lines.push('| --- | --- | --- |');
      for (const entry of sortedFiles) {
        const preview = `![${entry.diagramName}](${entry.pngPath})`;
        const details = [
          `Path: [\`${entry.pumlPath}\`](${entry.pumlPath})`,
          `Diagram ID: \`${entry.diagramName}\``,
          `Stereotype: \`${entry.stereotype}\``,
        ].join('<br/>');
        lines.push(`| ${entry.relativePath} | ${preview} | ${details} |`);
      }
      lines.push('');
    }

    const childKeys = [...node.children.keys()].sort((a, b) => a.localeCompare(b));
    for (const key of childKeys) {
      const childNode = node.children.get(key);
      lines.push(renderNode(childNode, undefined).trimEnd());
    }

    lines.push('</details>');
    lines.push('');

    return lines.join('\n');
  };

  const sections = [];

  if (root.files.length) {
    const rootFilesNode = createNode('src', 'src');
    rootFilesNode.files.push(...root.files);
    sections.push(renderNode(rootFilesNode, 'src'));
  }

  const topLevelKeys = [...root.children.keys()].sort((a, b) => a.localeCompare(b));
  for (const key of topLevelKeys) {
    const childNode = root.children.get(key);
    sections.push(renderNode(childNode, undefined).trimEnd());
  }

  return sections.join('\n').trim();
};

const updateReadmeIndex = async entries => {
  const indexMarkdown = generateDiagramIndexMarkdown(entries);
  let currentReadme = '# Natural Highs Repo Overview\n';
  try {
    currentReadme = await fs.readFile(readmePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  if (!currentReadme.includes(README_START_MARKER)) {
    const appendix = `\n\n## Directory\n\n${README_START_MARKER}\n${indexMarkdown}\n${README_END_MARKER}\n`;
    const updated = `${currentReadme.trimEnd()}${appendix}`;
    const formatted = await formatMarkdown(updated);
    await fs.writeFile(readmePath, formatted, 'utf8');
    return;
  }

  const markerRegex = new RegExp(`${README_START_MARKER}[\\s\\S]*?${README_END_MARKER}`);
  const replacement = `${README_START_MARKER}\n${indexMarkdown}\n${README_END_MARKER}`;
  const updatedContent = currentReadme.replace(markerRegex, replacement);
  const formatted = await formatMarkdown(updatedContent);
  await fs.writeFile(readmePath, formatted, 'utf8');
};

const writeDiagram = async (relativePath, content) => {
  const targetPath = path.join(diagramsRoot, `${relativePath}.puml`);
  const dirName = path.dirname(targetPath);
  await ensureDir(dirName);
  await fs.writeFile(targetPath, content, 'utf8');
};

const clearDiagrams = async () => {
  const removePumlFiles = async (dir, isRoot = false) => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return;
      }
      throw err;
    }

    await Promise.all(
      entries.map(async entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await removePumlFiles(fullPath, false);
          try {
            const remaining = await fs.readdir(fullPath);
            if (!remaining.length) {
              await fs.rmdir(fullPath);
            }
          } catch (err) {
            if (err.code !== 'ENOENT') {
              throw err;
            }
          }
        } else if (entry.isFile() && entry.name.endsWith('.puml')) {
          await fs.unlink(fullPath);
        }
      })
    );

    if (!isRoot) {
      try {
        const remaining = await fs.readdir(dir);
        if (!remaining.length) {
          await fs.rmdir(dir);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }
  };

  await ensureDir(diagramsRoot);
  await removePumlFiles(diagramsRoot, true);
};

const determineStereotype = (relativePath, extension) => {
  if (extension === '.svelte') {
    return 'SvelteComponent';
  }
  if (relativePath.includes('+server')) {
    return 'SvelteKitEndpoint';
  }
  if (relativePath.includes('+page') || relativePath.includes('+layout')) {
    return 'SvelteKitModule';
  }
  if (extension === '.ts' || extension === '.js') {
    return 'Module';
  }
  if (extension === '.html') {
    return 'Markup';
  }
  if (extension === '.css' || extension === '.pcss') {
    return 'Styles';
  }
  return 'Artifact';
};

const handleFile = async filePath => {
  const relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
  const ext = path.extname(filePath).toLowerCase();
  const content = await fs.readFile(filePath, 'utf8');
  let analysis;
  if (ext === '.svelte') {
    analysis = analyzeSvelte(content, relativePath);
  } else if (ext === '.ts' || ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    const kind = ext === '.ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    analysis = analyzeTsLike(content, relativePath, kind);
  } else {
    analysis = { imports: [], exports: [], reExports: [] };
  }

  const { local: localImports, external: externalImports } = splitImports(
    relativePath,
    analysis.imports || []
  );
  analysis.localImports = localImports;
  analysis.externalImports = externalImports;

  const stereotype = determineStereotype(relativePath, ext);
  const diagramName = buildDiagramName(relativePath);
  const diagram = createDiagram(relativePath, analysis, stereotype, diagramName);
  await writeDiagram(relativePath, diagram);

  const dir = posixPath.dirname(relativePath);
  const diagramDir = dir === '.' ? '' : dir;
  const pngRelativePath = posixPath.join('src', diagramDir, `${diagramName}.png`);
  const pumlRelativePath = posixPath.join('src', `${relativePath}.puml`);

  diagramEntries.push({
    relativePath,
    diagramName,
    pumlPath: pumlRelativePath,
    pngPath: pngRelativePath,
    directory: diagramDir,
    stereotype,
  });
};

const formatMarkdown = async content => {
  try {
    const formatted = execFileSync(
      'bunx',
      ['@biomejs/biome', 'format', '--stdin-file-path', readmePath],
      {
        input: content,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    return formatted;
  } catch (err) {

    console.warn('Warning: Biome formatting skipped for markdown:', err.message);
    return `${content.trimEnd()}\n`;
  }
};

const main = async () => {
  diagramEntries.length = 0;
  await clearDiagrams();
  const allFiles = await readAllFiles(srcDir);
  await Promise.all(allFiles.map(handleFile));
  await updateReadmeIndex(diagramEntries);
  console.log(`Generated PlantUML diagrams for ${allFiles.length} files.`);
};

main().catch(err => {
  console.error('Failed to generate PlantUML diagrams:', err);
  process.exit(1);
});
