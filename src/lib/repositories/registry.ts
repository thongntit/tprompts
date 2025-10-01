import { Repository, RepositoryRegistry } from '../../types'
import { UserConfigManager } from '../config/user-config'

export class RepositoryRegistryManager {
  private userConfig: UserConfigManager

  constructor() {
    this.userConfig = new UserConfigManager()
  }

  async addRepository(name: string, url: string, type: 'git' | 'local', version?: string): Promise<void> {
    const registry = await this.userConfig.getRepositoryRegistry()

    if (registry.repositories[name]) {
      throw new Error(`Repository '${name}' is already registered`)
    }

    const repository: Repository = {
      name,
      url,
      type,
      lastUpdated: new Date().toISOString(),
      currentVersion: version,
      requestedVersion: version
    }

    registry.repositories[name] = repository
    await this.userConfig.saveRepositoryRegistry(registry)
  }

  async removeRepository(name: string): Promise<void> {
    const registry = await this.userConfig.getRepositoryRegistry()

    if (!registry.repositories[name]) {
      throw new Error(`Repository '${name}' is not registered`)
    }

    delete registry.repositories[name]
    
    // If this was the default repository, clear it
    if (registry.defaultRepository === name) {
      delete registry.defaultRepository
    }

    await this.userConfig.saveRepositoryRegistry(registry)
  }

  async listRepositories(): Promise<Repository[]> {
    const registry = await this.userConfig.getRepositoryRegistry()
    return Object.values(registry.repositories)
  }

  async getRepository(name: string): Promise<Repository | null> {
    const registry = await this.userConfig.getRepositoryRegistry()
    return registry.repositories[name] || null
  }

  async setDefaultRepository(name: string): Promise<void> {
    const registry = await this.userConfig.getRepositoryRegistry()

    if (!registry.repositories[name]) {
      throw new Error(`Repository '${name}' is not registered`)
    }

    registry.defaultRepository = name
    await this.userConfig.saveRepositoryRegistry(registry)
  }

  async getDefaultRepository(): Promise<Repository | null> {
    const registry = await this.userConfig.getRepositoryRegistry()
    
    if (registry.defaultRepository && registry.repositories[registry.defaultRepository]) {
      return registry.repositories[registry.defaultRepository]
    }

    return null
  }

  async updateRepositoryMetadata(name: string, metadata: any): Promise<void> {
    const registry = await this.userConfig.getRepositoryRegistry()

    if (!registry.repositories[name]) {
      throw new Error(`Repository '${name}' is not registered`)
    }

    registry.repositories[name].metadata = metadata
    registry.repositories[name].lastUpdated = new Date().toISOString()
    
    await this.userConfig.saveRepositoryRegistry(registry)
  }
}