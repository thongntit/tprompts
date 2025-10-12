import { execSync } from 'child_process'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { Repository } from '../../types'

export class UrlRepositoryManager {
  /**
   * Download and setup a repository from a URL for one-time use
   * Returns a temporary repository object that can be used for installation
   */
  async downloadFromUrl(url: string, promptPath: string, version?: string): Promise<{ repository: Repository, cleanup: () => Promise<void> }> {
    // Parse the URL to extract repository information
    const parsedUrl = this.parseGitUrl(url)
    if (!parsedUrl) {
      throw new Error(`Invalid Git URL format: ${url}`)
    }

    // Create a temporary directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tprompts-url-'))
    const repoPath = path.join(tempDir, parsedUrl.repoName)

    try {
      // Clone the repository
      this.log(`Downloading repository from ${parsedUrl.repoUrl}...`)
      execSync(`git clone ${parsedUrl.repoUrl} ${repoPath}`, {
        stdio: 'pipe',
        timeout: 120000 // 2 minute timeout
      })

      // Checkout specific version if requested
      if (version) {
        this.log(`Checking out version: ${version}`)
        execSync(`git checkout ${version}`, {
          cwd: repoPath,
          stdio: 'pipe',
          timeout: 30000 // 30 second timeout
        })
      }

      // Validate the specific prompt exists
      const fullPromptPath = path.join(repoPath, promptPath)
      if (!fs.existsSync(fullPromptPath)) {
        throw new Error(`Prompt not found: ${promptPath} in repository ${parsedUrl.repoUrl}`)
      }

      // Validate it contains tprompts.json
      const configPath = path.join(fullPromptPath, 'tprompts.json')
      if (!fs.existsSync(configPath)) {
        throw new Error(`No tprompts.json configuration found in ${promptPath}`)
      }

      // Create a temporary repository object
      const repository: Repository = {
        name: `url-${parsedUrl.repoName}`,
        url: parsedUrl.repoUrl,
        type: 'git',
        path: repoPath,
        lastUpdated: new Date().toISOString(),
        currentVersion: version,
        metadata: {
          temporary: true,
          originalUrl: url
        }
      }

      const cleanup = async () => {
        try {
          await fs.remove(tempDir)
        } catch (error) {
          console.warn(`Warning: Failed to cleanup temporary directory: ${tempDir}`)
        }
      }

      return { repository, cleanup }

    } catch (error: any) {
      // Clean up on failure
      try {
        await fs.remove(tempDir)
      } catch {
        // Ignore cleanup errors
      }

      if (error.message.includes('timeout')) {
        throw new Error(`Git operation timed out. Please check your internet connection and repository URL.`)
      } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
        throw new Error(`Repository not found: ${parsedUrl.repoUrl}`)
      } else {
        throw new Error(`Failed to download repository: ${error.message}`)
      }
    }
  }

  /**
   * Parse a Git URL with prompt path
   * Examples:
   * - https://github.com/user/repo/tree/main/prompt-name
   * - https://github.com/user/repo/prompt-name
   * - https://github.com/user/repo.git/prompt-name
   */
  private parseGitUrl(url: string): { repoUrl: string, repoName: string, promptPath?: string } | null {
    try {
      const urlObj = new URL(url)
      
      // Handle GitHub URLs
      if (urlObj.hostname === 'github.com') {
        const pathParts = urlObj.pathname.split('/').filter(p => p)
        
        if (pathParts.length < 2) {
          return null
        }

        const user = pathParts[0]
        const repo = pathParts[1].replace(/\.git$/, '')
        const repoUrl = `https://github.com/${user}/${repo}.git`
        const repoName = repo

        return {
          repoUrl,
          repoName
        }
      }

      // Handle other Git hosting services (GitLab, etc.)
      if (urlObj.pathname.includes('.git') || url.includes('git@')) {
        // Try to extract repo name from the URL
        const match = url.match(/\/([^\/]+?)(?:\.git)?(?:\/|$)/)
        if (match) {
          return {
            repoUrl: url.split('/').slice(0, -1).join('/') + '.git', // Reconstruct base repo URL
            repoName: match[1]
          }
        }
      }

      return null
    } catch {
      return null
    }
  }

  private log(message: string): void {
    console.log(message)
  }
}