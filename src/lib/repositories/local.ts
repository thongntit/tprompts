import * as fs from 'fs-extra'
import * as path from 'path'
import { RepositoryMetadata } from '../../types'

export class LocalRepositoryManager {
  async validateLocalPath(localPath: string): Promise<void> {
    const resolvedPath = path.resolve(localPath)

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Local path does not exist: ${resolvedPath}`)
    }

    const stat = await fs.stat(resolvedPath)
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedPath}`)
    }

    // Validate repository structure
    await this.validateRepositoryStructure(resolvedPath)
  }

  async getRepositoryMetadata(repoPath: string): Promise<RepositoryMetadata | undefined> {
    const metadataPath = path.join(repoPath, '.tprompts-repo.json')
    
    if (fs.existsSync(metadataPath)) {
      try {
        return await fs.readJson(metadataPath)
      } catch (error) {
        console.warn(`Warning: Invalid repository metadata at ${metadataPath}`)
      }
    }

    return undefined
  }

  private async validateRepositoryStructure(repoPath: string): Promise<void> {
    // Check if any directory contains tprompts.json
    const items = await fs.readdir(repoPath, { withFileTypes: true })
    let hasValidPrompts = false

    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        const configPath = path.join(repoPath, item.name, 'tprompts.json')
        if (fs.existsSync(configPath)) {
          hasValidPrompts = true
          break
        }
      }
    }

    if (!hasValidPrompts) {
      throw new Error('Directory does not contain any valid prompt configurations (tprompts.json files)')
    }
  }
}