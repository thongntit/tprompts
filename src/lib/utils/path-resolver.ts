import { ParsedPromptIdentifier } from '../../types'

export class PathResolver {
  static parsePromptIdentifier(identifier: string): ParsedPromptIdentifier {
    // Handle URL format: https://github.com/user/repo/prompt-name
    if (identifier.startsWith('http')) {
      try {
        const url = new URL(identifier)
        const pathParts = url.pathname.split('/').filter(p => p)
        
        if (pathParts.length < 3) {
          throw new Error(`URL must include repository and prompt path`)
        }

        // For GitHub URLs: /user/repo/tree/branch/prompt-name or /user/repo/prompt-name
        let promptStartIndex = 2 // After user/repo
        
        // Skip 'tree/branch' if present in GitHub URLs
        if (pathParts[2] === 'tree' && pathParts.length > 4) {
          promptStartIndex = 4 // Skip tree/branch
        }

        const user = pathParts[0]
        const repo = pathParts[1].replace(/\.git$/, '')
        const promptName = pathParts.slice(promptStartIndex).join('/')
        
        if (!promptName) {
          throw new Error(`No prompt path specified in URL`)
        }

        return {
          repository: `${user}/${repo}`,
          prompt: promptName,
          isUrl: true,
          originalUrl: identifier
        }
      } catch (error: any) {
        throw new Error(`Invalid URL format: ${identifier} - ${error.message}`)
      }
    }

    // Handle repo/prompt format: my-repo/prompt-name
    if (identifier.includes('/')) {
      const parts = identifier.split('/')
      const repository = parts[0]
      const prompt = parts.slice(1).join('/')
      
      return {
        repository,
        prompt,
        isUrl: false
      }
    }

    // Handle standalone prompt (use default repository)
    return {
      repository: '',
      prompt: identifier,
      isUrl: false
    }
  }

  static validatePromptIdentifier(identifier: string): boolean {
    try {
      this.parsePromptIdentifier(identifier)
      return true
    } catch {
      return false
    }
  }

  static buildPromptPath(repository: string, prompt: string): string {
    return `${repository}/${prompt}`
  }
}