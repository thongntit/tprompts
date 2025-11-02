// Core types for the universal tprompts CLI

export interface Repository {
  name: string
  url: string
  type: 'git' | 'local'
  path?: string // Local path where repo is stored
  lastUpdated?: string
  metadata?: RepositoryMetadata
  currentVersion?: string // Current checked out branch/tag/commit
  requestedVersion?: string // User-requested version for updates
}

export interface RepositoryMetadata {
  name?: string
  description?: string
  author?: string
  version?: string
  homepage?: string
  defaultEditor?: string
  categories?: string[]
  temporary?: boolean
  originalUrl?: string
}

export interface RepositoryRegistry {
  repositories: Record<string, Repository>
  defaultRepository?: string
  lastCleanup?: string
}

export interface PromptConfig {
  name: string
  description?: string
  version?: string
  editors: Record<string, EditorPromptConfig>
}

export interface EditorPromptConfig {
  [fileOrDir: string]: FileConfig
}

export interface FileConfig {
  location: string
  prefix?: string | null
  suffix?: string | null
  format?: SupportedFormat
}

export interface PromptProject {
  name: string
  path: string
  config: PromptConfig
  repository: Repository
}

export interface PromptFile {
  name: string
  path: string
  content: string
  isDirectory: boolean
}

export interface InstallationTarget {
  sourcePath: string
  targetPath: string
  content: string
  prefix?: string
  suffix?: string
}

export interface UserConfig {
  defaultEditor?: string
  repositoriesPath?: string
  backupEnabled?: boolean
  autoUpdate?: boolean
}

export type SupportedEditor = 'vscode' | 'cursor' | 'windsurf' | 'claude-code'
export type SupportedFormat = 'markdown' | 'mdx' | 'frontmatter-md'

export interface EditorDefaults {
  baseDir: string
  format: SupportedFormat
  fileExtension: string
  singleFile?: string
}

export interface ParsedPromptIdentifier {
  repository: string
  prompt: string
  isUrl: boolean
  originalUrl?: string
}