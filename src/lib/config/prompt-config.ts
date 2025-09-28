import * as fs from 'fs-extra'
import * as path from 'path'
import { PromptConfig } from '../../types'

export class PromptConfigParser {
  static async parsePromptConfig(promptDir: string): Promise<PromptConfig | null> {
    const configPath = path.join(promptDir, 'tprompts.json')

    if (!fs.existsSync(configPath)) {
      return null
    }

    try {
      const config: PromptConfig = await fs.readJson(configPath)
      
      // Validate required fields
      if (!config.name || !config.editors) {
        throw new Error('Invalid prompt config: missing required fields (name, editors)')
      }

      return config
    } catch (error: any) {
      throw new Error(`Failed to parse prompt config at ${configPath}: ${error.message}`)
    }
  }

  static validatePromptConfig(config: PromptConfig): boolean {
    if (!config.name || typeof config.name !== 'string') {
      return false
    }

    if (!config.editors || typeof config.editors !== 'object') {
      return false
    }

    // Validate editor configurations
    for (const [editor, editorConfig] of Object.entries(config.editors)) {
      if (!editorConfig || typeof editorConfig !== 'object') {
        return false
      }

      for (const [fileOrDir, fileConfig] of Object.entries(editorConfig)) {
        if (!fileConfig.location || typeof fileConfig.location !== 'string') {
          return false
        }
      }
    }

    return true
  }

  static async discoverPrompts(repositoryPath: string): Promise<string[]> {
    if (!fs.existsSync(repositoryPath)) {
      return []
    }

    const items = await fs.readdir(repositoryPath, { withFileTypes: true })
    const promptDirs: string[] = []

    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        const promptPath = path.join(repositoryPath, item.name)
        const configPath = path.join(promptPath, 'tprompts.json')
        
        if (fs.existsSync(configPath)) {
          promptDirs.push(item.name)
        }
      }
    }

    return promptDirs
  }
}