import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { RepositoryRegistryManager } from '../lib/repositories/registry'
import { GitRepositoryManager } from '../lib/repositories/git'

export default class VersionCommand extends Command {
  static description = 'Manage repository versions'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-repo',
    '<%= config.bin %> <%= command.id %> my-repo --checkout v1.2.0',
    '<%= config.bin %> <%= command.id %> my-repo --list'
  ]

  static args = {
    repository: Args.string({
      description: 'Repository name',
      required: true
    })
  }

  static flags = {
    checkout: Flags.string({
      char: 'c',
      description: 'Checkout specific branch, tag, or commit',
      exclusive: ['list']
    }),
    list: Flags.boolean({
      char: 'l',
      description: 'List available branches and tags',
      exclusive: ['checkout']
    })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(VersionCommand)

    try {
      const registryManager = new RepositoryRegistryManager()
      const repository = await registryManager.getRepository(args.repository)
      
      if (!repository) {
        this.error(`Repository '${args.repository}' is not registered.\nUse "tprompts repos" to see available repositories.`)
      }

      if (repository.type !== 'git') {
        this.error(`Version management is only available for Git repositories. '${args.repository}' is a local repository.`)
      }

      const gitManager = new GitRepositoryManager()

      if (flags.list) {
        await this.listVersions(repository, gitManager)
      } else if (flags.checkout) {
        await this.checkoutVersion(repository, flags.checkout, gitManager, registryManager)
      } else {
        await this.showCurrentVersion(repository, gitManager)
      }

    } catch (error: any) {
      this.error(error.message)
    }
  }

  private async showCurrentVersion(repository: any, gitManager: GitRepositoryManager): Promise<void> {
    this.log(`${chalk.blue('Repository:')} ${chalk.bold(repository.name)}`)
    this.log(`${chalk.dim('URL:')} ${repository.url}`)

    try {
      const currentVersion = await gitManager.getCurrentVersion(repository)
      this.log(`${chalk.green('Current version:')} ${currentVersion}`)
      
      if (repository.requestedVersion && repository.requestedVersion !== currentVersion) {
        this.log(`${chalk.yellow('Requested version:')} ${repository.requestedVersion}`)
      }
    } catch (error: any) {
      this.log(`${chalk.red('✗')} Failed to get current version: ${error.message}`)
    }

    this.log(`\n${chalk.dim('Commands:')}`)
    this.log(`  ${chalk.dim('•')} List versions: ${chalk.cyan(`tprompts version ${repository.name} --list`)}`)
    this.log(`  ${chalk.dim('•')} Checkout version: ${chalk.cyan(`tprompts version ${repository.name} --checkout <version>`)}`)
  }

  private async listVersions(repository: any, gitManager: GitRepositoryManager): Promise<void> {
    this.log(`${chalk.blue('Available versions for')} ${chalk.bold(repository.name)}:`)

    try {
      const versions = await gitManager.listAvailableVersions(repository)
      
      if (versions.branches.length > 0) {
        this.log(`\n${chalk.bold('Branches:')}`)
        for (const branch of versions.branches) {
          this.log(`  ${chalk.green('◦')} ${branch}`)
        }
      }

      if (versions.tags.length > 0) {
        this.log(`\n${chalk.bold('Tags:')}`)
        for (const tag of versions.tags) {
          this.log(`  ${chalk.blue('◦')} ${tag}`)
        }
      }

      if (versions.branches.length === 0 && versions.tags.length === 0) {
        this.log(chalk.yellow('No remote branches or tags found'))
      }

      const currentVersion = await gitManager.getCurrentVersion(repository)
      this.log(`\n${chalk.green('Current:')} ${currentVersion}`)

    } catch (error: any) {
      this.error(`Failed to list versions: ${error.message}`)
    }
  }

  private async checkoutVersion(
    repository: any,
    version: string,
    gitManager: GitRepositoryManager,
    registryManager: RepositoryRegistryManager
  ): Promise<void> {
    this.log(`${chalk.blue('Checking out')} ${chalk.bold(version)} in repository ${chalk.bold(repository.name)}...`)

    try {
      await gitManager.checkoutVersion(repository, version)
      
      // Update the repository record with new version
      repository.currentVersion = version
      repository.requestedVersion = version
      repository.lastUpdated = new Date().toISOString()
      
      await registryManager.updateRepositoryMetadata(repository.name, repository.metadata || {})

      this.log(`${chalk.green('✓')} Successfully checked out ${version}`)
      
      // Show next steps
      this.log(`\n${chalk.dim('Next steps:')}`)
      this.log(`  ${chalk.dim('•')} List prompts: ${chalk.cyan(`tprompts list ${repository.name}`)}`)
      this.log(`  ${chalk.dim('•')} Install prompt: ${chalk.cyan(`tprompts install ${repository.name}/prompt-name editor`)}`)

    } catch (error: any) {
      this.error(`Failed to checkout ${version}: ${error.message}`)
    }
  }
}