import { ParsedPromptIdentifier } from '../../types'

export class PathResolver {
  static parsePromptIdentifier(identifier: string): ParsedPromptIdentifier {
    // Handle URL format: https://github.com/user/repo/prompt-name
    if (identifier.startsWith('http')) {
      const parts = identifier.split('/')
      if (parts.length >= 5) {
        const repoName = parts[4] // github.com/user/repo
        const promptName = parts.slice(5).join('/') // everything after repo
        return {
          repository: repoName,
          prompt: promptName,
          isUrl: true
        }
      }
      throw new Error(`Invalid URL format: ${identifier}`)
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