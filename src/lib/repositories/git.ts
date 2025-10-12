import { execSync } from 'child_process'
import * as fs from 'fs-extra'
import * as path from 'path'
import { UserConfigManager } from '../config/user-config'
import { Repository, RepositoryMetadata } from '../../types'

export class GitRepositoryManager {
  private userConfig: UserConfigManager

  constructor() {
    this.userConfig = new UserConfigManager()
  }

  async validateAndClone(name: string, gitUrl: string): Promise<string> {
    const repositoriesDir = this.userConfig.getRepositoriesDir()
    await fs.ensureDir(repositoriesDir)

    const repoPath = path.join(repositoriesDir, name)

    // Remove existing directory if it exists
    if (fs.existsSync(repoPath)) {
      await fs.remove(repoPath)
    }

    try {
      // Test if git URL is accessible
      this.log(`Validating Git repository: ${gitUrl}`)
      execSync(`git ls-remote ${gitUrl}`, { 
        stdio: 'pipe',
        timeout: 30000 // 30 second timeout
      })

      // Clone the repository
      this.log(`Cloning repository to ${repoPath}`)
      execSync(`git clone ${gitUrl} ${repoPath}`, {
        stdio: 'pipe',
        timeout: 120000 // 2 minute timeout
      })

      // Validate it contains prompts
      await this.validateRepositoryStructure(repoPath)

      return repoPath
    } catch (error: any) {
      // Clean up on failure
      if (fs.existsSync(repoPath)) {
        await fs.remove(repoPath)
      }
      
      if (error.message.includes('timeout')) {
        throw new Error(`Git operation timed out. Please check your internet connection and repository URL.`)
      } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
        throw new Error(`Repository not found: ${gitUrl}`)
      } else {
        throw new Error(`Failed to clone repository: ${error.message}`)
      }
    }
  }

  async updateRepository(repository: Repository): Promise<void> {
    if (!repository.path || !fs.existsSync(repository.path)) {
      throw new Error(`Repository path not found: ${repository.path}`)
    }

    try {
      this.log(`Updating repository: ${repository.name}`)
      
      // Git pull in the repository directory
      execSync('git pull origin', {
        cwd: repository.path,
        stdio: 'pipe',
        timeout: 60000 // 1 minute timeout
      })

      this.log(`Successfully updated ${repository.name}`)
    } catch (error: any) {
      throw new Error(`Failed to update repository ${repository.name}: ${error.message}`)
    }
  }

  async checkoutVersion(repository: Repository, version: string): Promise<void> {
    if (!repository.path || !fs.existsSync(repository.path)) {
      throw new Error(`Repository path not found: ${repository.path}`)
    }

    try {
      this.log(`Checking out version: ${version}`)
      
      // First, fetch all remote references to ensure we have the latest
      execSync('git fetch --all --tags', {
        cwd: repository.path,
        stdio: 'pipe',
        timeout: 60000 // 1 minute timeout
      })

      // Try to checkout the specified version (branch, tag, or commit)
      execSync(`git checkout ${version}`, {
        cwd: repository.path,
        stdio: 'pipe',
        timeout: 30000 // 30 second timeout
      })

      this.log(`Successfully checked out ${version}`)
    } catch (error: any) {
      throw new Error(`Failed to checkout version ${version}: ${error.message}`)
    }
  }

  async getCurrentVersion(repository: Repository): Promise<string> {
    if (!repository.path || !fs.existsSync(repository.path)) {
      throw new Error(`Repository path not found: ${repository.path}`)
    }

    try {
      // Get current branch or commit
      const result = execSync('git branch --show-current', {
        cwd: repository.path,
        stdio: 'pipe',
        encoding: 'utf8'
      }).trim()

      if (result) {
        return result // We're on a branch
      }

      // If not on a branch, get the commit hash
      const commit = execSync('git rev-parse HEAD', {
        cwd: repository.path,
        stdio: 'pipe',
        encoding: 'utf8'
      }).trim()

      return commit.substring(0, 7) // Short commit hash
    } catch (error: any) {
      throw new Error(`Failed to get current version: ${error.message}`)
    }
  }

  async listAvailableVersions(repository: Repository): Promise<{ branches: string[], tags: string[] }> {
    if (!repository.path || !fs.existsSync(repository.path)) {
      throw new Error(`Repository path not found: ${repository.path}`)
    }

    try {
      // Fetch latest references
      execSync('git fetch --all --tags', {
        cwd: repository.path,
        stdio: 'pipe',
        timeout: 60000
      })

      // Get remote branches
      const branchesOutput = execSync('git branch -r', {
        cwd: repository.path,
        stdio: 'pipe',
        encoding: 'utf8'
      })

      const branches = branchesOutput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.includes('->'))
        .map(line => line.replace('origin/', ''))

      // Get tags
      const tagsOutput = execSync('git tag --sort=-version:refname', {
        cwd: repository.path,
        stdio: 'pipe',
        encoding: 'utf8'
      })

      const tags = tagsOutput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)

      return { branches, tags }
    } catch (error: any) {
      throw new Error(`Failed to list versions: ${error.message}`)
    }
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
      throw new Error('Repository does not contain any valid prompt configurations (tprompts.json files)')
    }
  }

  private log(message: string): void {
    // Simple logging - could be enhanced with proper logger
    console.log(message)
  }
}