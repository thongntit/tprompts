import { EditorDefaults, SupportedEditor } from '../../types'

export const editorDefaults: Record<SupportedEditor, EditorDefaults> = {
  vscode: {
    baseDir: '.vscode/',
    format: 'frontmatter-md',
    fileExtension: '.md'
  },
  cursor: {
    baseDir: '.cursor/',
    format: 'mdx',
    fileExtension: '.mdx',
    singleFile: '.cursorrules'
  },
  windsurf: {
    baseDir: '.windsurf/',
    format: 'markdown',
    fileExtension: '.md'
  },
  'claude-code': {
    baseDir: './',
    format: 'markdown',
    fileExtension: '.md',
    singleFile: 'CLAUDE.md'
  }
}