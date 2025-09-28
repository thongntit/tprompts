import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { UserConfig, RepositoryRegistry } from '../../types'

export class UserConfigManager {
  private configDir: string
  private configPath: string
  private registryPath: string

  constructor() {
    this.configDir = path.join(os.homedir(), '.tprompts')
    this.configPath = path.join(this.configDir, 'config.json')
    this.registryPath = path.join(this.configDir, 'repos.json')
  }

  async ensureConfigDir(): Promise<void> {
    await fs.ensureDir(this.configDir)
  }

  async getUserConfig(): Promise<UserConfig> {
    await this.ensureConfigDir()

    if (!fs.existsSync(this.configPath)) {
      const defaultConfig: UserConfig = {
        repositoriesPath: path.join(this.configDir, 'repositories'),
        backupEnabled: true,
        autoUpdate: false
      }
      await this.saveUserConfig(defaultConfig)
      return defaultConfig
    }

    try {
      return await fs.readJson(this.configPath)
    } catch (error) {
      console.warn('Warning: Invalid user config, using defaults')
      return {
        repositoriesPath: path.join(this.configDir, 'repositories'),
        backupEnabled: true,
        autoUpdate: false
      }
    }
  }

  async saveUserConfig(config: UserConfig): Promise<void> {
    await this.ensureConfigDir()
    await fs.writeJson(this.configPath, config, { spaces: 2 })
  }

  async getRepositoryRegistry(): Promise<RepositoryRegistry> {
    await this.ensureConfigDir()

    if (!fs.existsSync(this.registryPath)) {
      const defaultRegistry: RepositoryRegistry = {
        repositories: {}
      }
      await this.saveRepositoryRegistry(defaultRegistry)
      return defaultRegistry
    }

    try {
      return await fs.readJson(this.registryPath)
    } catch (error) {
      console.warn('Warning: Invalid repository registry, using empty registry')
      return { repositories: {} }
    }
  }

  async saveRepositoryRegistry(registry: RepositoryRegistry): Promise<void> {
    await this.ensureConfigDir()
    await fs.writeJson(this.registryPath, registry, { spaces: 2 })
  }

  getConfigDir(): string {
    return this.configDir
  }

  getRepositoriesDir(): string {
    return path.join(this.configDir, 'repositories')
  }
}