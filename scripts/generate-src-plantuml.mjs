#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'src');
const diagramsRoot = path.join(repoRoot, 'docs/diagrams/src');

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

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const readAllFiles = async (dir) => {
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

const sanitizeId = (relativePath) => {
  const cleaned = relativePath.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
};

const buildDiagramName = (relativePath) => {
  const sanitizeSegment = (segment) => {
    let result = '';
    for (const char of segment) {
      if (/^[A-Za-z0-9]$/.test(char)) {
        result += char;
      } else if (char === '[') {
        continue;
      } else if (char === ']') {
        result += '_';
      } else if (char === '+') {
        continue;
      } else {
        result += '_';
      }
    }
    return result || '_';
  };

  return relativePath.split('/').map(sanitizeSegment).join('__');
};

const hasModifier = (node, kind) =>
  Array.isArray(node.modifiers) &&
  node.modifiers.some((mod) => mod.kind === kind);

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

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const moduleName = node.moduleSpecifier.getText(sourceFile).slice(1, -1);
      imports.add(moduleName);
    } else if (ts.isImportEqualsDeclaration(node) && node.moduleReference) {
      if (
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression
      ) {
        const moduleName = node.moduleReference.expression
          .getText(sourceFile)
          .slice(1, -1);
        imports.add(moduleName);
      }
    } else if (ts.isExportAssignment(node)) {
      const details = node.expression
        ? node.expression.getText(sourceFile)
        : '';
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
    } else if (
      ts.isTypeAliasDeclaration(node) &&
      hasModifier(node, ts.SyntaxKind.ExportKeyword)
    ) {
      const type = hasModifier(node, ts.SyntaxKind.DefaultKeyword)
        ? 'default type'
        : 'type';
      exports.push({ type, name: node.name.getText(sourceFile) });
    } else if (
      ts.isVariableStatement(node) &&
      hasModifier(node, ts.SyntaxKind.ExportKeyword)
    ) {
      const isConst =
        (node.declarationList.flags & ts.NodeFlags.Const) ===
        ts.NodeFlags.Const;
      const declType = isConst ? 'const' : 'let';
      const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
      for (const declaration of node.declarationList.declarations) {
        const name = declaration.name.getText(sourceFile);
        const initializer = declaration.initializer
          ? declaration.initializer.kind
          : undefined;
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
  const markupOnly = scriptMatch
    ? content.replace(scriptMatch[0], '')
    : content;

  const tsInfo = analyzeTsLike(scriptContent, relativePath, ts.ScriptKind.TS);

  const props = [];
  for (const exp of tsInfo.exports) {
    if (exp.type === 'let') {
      props.push(exp.name);
    }
  }

  const componentSet = new Set();
  const componentRegex = /<([A-Z][A-Za-z0-9_]*)\b/g;
  let match;
  while ((match = componentRegex.exec(markupOnly))) {
    const tag = match[1].toUpperCase();
    if (!SVELTE_SPECIAL_TAGS.has(tag)) {
      componentSet.add(match[1]);
    }
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

const formatExportLine = (exp) => {
  const label = exp.type ? `${exp.type} ${exp.name}` : exp.name;
  return `+ ${label}`.trim();
};

const buildNoteSections = (info) => {
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

const createDiagram = (relativePath, analysis, stereotype) => {
  const id = sanitizeId(relativePath);
  const startumlName = buildDiagramName(relativePath);
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

const writeDiagram = async (relativePath, content) => {
  const targetPath = path.join(diagramsRoot, `${relativePath}.puml`);
  const dirName = path.dirname(targetPath);
  await ensureDir(dirName);
  await fs.writeFile(targetPath, content, 'utf8');
};

const clearDiagrams = async () => {
  try {
    await fs.rm(diagramsRoot, { recursive: true, force: true });
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  await ensureDir(diagramsRoot);
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

const handleFile = async (filePath) => {
  const relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
  const ext = path.extname(filePath).toLowerCase();
  const content = await fs.readFile(filePath, 'utf8');
  let analysis;
  if (ext === '.svelte') {
    analysis = analyzeSvelte(content, relativePath);
  } else if (
    ext === '.ts' ||
    ext === '.js' ||
    ext === '.mjs' ||
    ext === '.cjs'
  ) {
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
  const diagram = createDiagram(relativePath, analysis, stereotype);
  await writeDiagram(relativePath, diagram);
};

const main = async () => {
  await clearDiagrams();
  const allFiles = await readAllFiles(srcDir);
  await Promise.all(allFiles.map(handleFile));
  console.log(`Generated PlantUML diagrams for ${allFiles.length} files.`);
};

main().catch((err) => {
  console.error('Failed to generate PlantUML diagrams:', err);
  process.exit(1);
});
