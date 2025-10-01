import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import { RepositoryRegistryManager } from '../lib/repositories/registry'
import { GitRepositoryManager } from '../lib/repositories/git'

export default class UpdateCommand extends Command {
  static description = 'Update registered repositories'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> my-prompts',
    '<%= config.bin %> <%= command.id %> --all'
  ]

  static args = {
    repository: Args.string({
      description: 'Name of repository to update',
      required: false
    })
  }

  static flags = {
    all: Flags.boolean({
      char: 'a',
      description: 'Update all registered repositories'
    }),
    version: Flags.string({
      char: 'v',
      description: 'Checkout specific version after update (Git repositories only)'
    })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(UpdateCommand)

    try {
      const registryManager = new RepositoryRegistryManager()
      const gitManager = new GitRepositoryManager()

      if (flags.all) {
        await this.updateAllRepositories(registryManager, gitManager, flags.version)
      } else if (args.repository) {
        await this.updateSingleRepository(args.repository, registryManager, gitManager, flags.version)
      } else {
        // Update default repository if no args provided
        const defaultRepo = await registryManager.getDefaultRepository()
        if (!defaultRepo) {
          this.error('No repository specified and no default repository set.\nUse --all to update all repositories or specify a repository name.')
        }
        await this.updateSingleRepository(defaultRepo.name, registryManager, gitManager, flags.version)
      }

    } catch (error: any) {
      this.error(error.message)
    }
  }

  private async updateAllRepositories(
    registryManager: RepositoryRegistryManager, 
    gitManager: GitRepositoryManager,
    version?: string
  ): Promise<void> {
    const repositories = await registryManager.listRepositories()
    
    if (repositories.length === 0) {
      this.log(chalk.yellow('No repositories registered. Use "tprompts register" to add repositories.'))
      return
    }

    this.log(`${chalk.blue('Updating')} ${repositories.length} repositories...`)

    let successCount = 0
    let failureCount = 0

    for (const repo of repositories) {
      try {
        if (repo.type === 'git') {
          this.log(`\n${chalk.dim('→')} Updating ${chalk.bold(repo.name)}...`)
          await gitManager.updateRepository(repo)
          
          // Checkout specific version if requested
          const targetVersion = version || repo.requestedVersion
          if (targetVersion) {
            this.log(`  ${chalk.dim('→')} Checking out version: ${targetVersion}`)
            await gitManager.checkoutVersion(repo, targetVersion)
            repo.currentVersion = targetVersion
          }
          
          // Update the last updated timestamp
          await registryManager.updateRepositoryMetadata(repo.name, {
            ...repo.metadata,
            lastUpdated: new Date().toISOString()
          })
          
          this.log(`  ${chalk.green('✓')} Updated ${repo.name}`)
          successCount++
        } else {
          this.log(`  ${chalk.dim('↷')} Skipping local repository: ${repo.name}`)
        }
      } catch (error: any) {
        this.log(`  ${chalk.red('✗')} Failed to update ${repo.name}: ${error.message}`)
        failureCount++
      }
    }

    this.log(`\n${chalk.green('Summary:')}`)
    this.log(`  ${chalk.green('✓')} ${successCount} repositories updated`)
    if (failureCount > 0) {
      this.log(`  ${chalk.red('✗')} ${failureCount} repositories failed`)
    }
  }

  private async updateSingleRepository(
    repoName: string,
    registryManager: RepositoryRegistryManager,
    gitManager: GitRepositoryManager,
    version?: string
  ): Promise<void> {
    const repository = await registryManager.getRepository(repoName)
    
    if (!repository) {
      this.error(`Repository '${repoName}' is not registered.\nUse "tprompts repos" to see available repositories.`)
    }

    if (repository.type === 'local') {
      this.log(chalk.yellow(`Repository '${repoName}' is a local repository and cannot be updated.`))
      if (version) {
        this.log(chalk.yellow('⚠ Version flag ignored for local repositories'))
      }
      return
    }

    this.log(`${chalk.blue('Updating')} repository: ${chalk.bold(repoName)}`)
    this.log(`${chalk.dim('Source:')} ${repository.url}`)

    try {
      await gitManager.updateRepository(repository)
      
      // Checkout specific version if requested
      const targetVersion = version || repository.requestedVersion
      if (targetVersion) {
        this.log(`${chalk.blue('Checking out')} version: ${targetVersion}`)
        await gitManager.checkoutVersion(repository, targetVersion)
        repository.currentVersion = targetVersion
        if (version) {
          repository.requestedVersion = version
        }
      }
      
      // Update the last updated timestamp
      await registryManager.updateRepositoryMetadata(repoName, {
        ...repository.metadata,
        lastUpdated: new Date().toISOString()
      })
      
      this.log(`${chalk.green('✓')} Repository '${repoName}' updated successfully`)
      
      // Show next steps
      this.log(`\n${chalk.dim('Next steps:')}`)
      this.log(`  ${chalk.dim('•')} List prompts: ${chalk.cyan(`tprompts list ${repoName}`)}`)
      this.log(`  ${chalk.dim('•')} Install prompt: ${chalk.cyan(`tprompts install ${repoName}/prompt-name editor`)}`)

    } catch (error: any) {
      this.error(`Failed to update repository '${repoName}': ${error.message}`)
    }
  }
}