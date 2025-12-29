#!/usr/bin/env bun
const sourcePath = process.argv[2]
if (!sourcePath) {
	process.exit(1)
}

// Derive test path: foo.ts -> foo.test.ts, foo.tsx -> foo.test.tsx
const ext = sourcePath.endsWith('.tsx') ? '.tsx' : '.ts'
const testPath = sourcePath.replace(/\.tsx?$/, `.test${ext}`)
const moduleName =
	sourcePath
		.split('/')
		.pop()
		?.replace(/\.tsx?$/, '') ?? 'module'

// Template matches project patterns (vitest globals available, no imports needed)
const template = `import {${moduleName}} from './${moduleName}'

describe('${moduleName}', () => {
  describe('basic functionality', () => {
    it('should be defined', () => {
      expect(${moduleName}).toBeDefined()
    })

    it.todo('implements core behavior')
  })

  describe('edge cases', () => {
    it.todo('handles null/undefined inputs')
    it.todo('handles invalid inputs')
  })

  describe('error handling', () => {
    it.todo('throws appropriate errors')
  })
})
`

await Bun.write(testPath, template)
