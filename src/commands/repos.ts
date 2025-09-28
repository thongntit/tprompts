import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { RepositoryRegistryManager } from '../lib/repositories/registry'

export default class ReposCommand extends Command {
  static description = 'List registered repositories'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --verbose'
  ]

  static flags = {
    verbose: Flags.boolean({
      char: 'v',
      description: 'Show detailed information'
    })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ReposCommand)

    try {
      const registryManager = new RepositoryRegistryManager()
      const repositories = await registryManager.listRepositories()
      const defaultRepo = await registryManager.getDefaultRepository()

      if (repositories.length === 0) {
        this.log(chalk.yellow('No repositories registered'))
        this.log(`\n${chalk.dim('Register a repository:')}`)
        this.log(`  ${chalk.cyan('tprompts register https://github.com/user/my-prompts.git')}`)
        this.log(`  ${chalk.cyan('tprompts register /local/path/to/prompts')}`)
        return
      }

      this.log(chalk.bold(`\nRegistered Repositories (${repositories.length}):\n`))

      for (const repo of repositories) {
        const isDefault = defaultRepo?.name === repo.name
        const defaultMarker = isDefault ? chalk.green(' (default)') : ''
        
        this.log(`${chalk.blue('●')} ${chalk.bold(repo.name)}${defaultMarker}`)
        
        if (flags.verbose) {
          this.log(`  ${chalk.dim('Type:')} ${repo.type}`)
          this.log(`  ${chalk.dim('URL:')} ${repo.url}`)
          
          if (repo.path) {
            this.log(`  ${chalk.dim('Local Path:')} ${repo.path}`)
          }
          
          if (repo.lastUpdated) {
            const lastUpdated = new Date(repo.lastUpdated).toLocaleDateString()
            this.log(`  ${chalk.dim('Last Updated:')} ${lastUpdated}`)
          }

          if (repo.metadata) {
            if (repo.metadata.description) {
              this.log(`  ${chalk.dim('Description:')} ${repo.metadata.description}`)
            }
            if (repo.metadata.author) {
              this.log(`  ${chalk.dim('Author:')} ${repo.metadata.author}`)
            }
            if (repo.metadata.categories && repo.metadata.categories.length > 0) {
              this.log(`  ${chalk.dim('Categories:')} ${repo.metadata.categories.join(', ')}`)
            }
          }
        } else {
          this.log(`  ${chalk.dim(`${repo.type}: ${repo.url}`)}`)
        }

        this.log('')
      }

      // Show usage examples
      if (!flags.verbose) {
        this.log(chalk.dim('Use --verbose for detailed information'))
        this.log(chalk.dim(`List prompts: ${chalk.cyan('tprompts list [repo-name]')}`))
        this.log(chalk.dim(`Install prompt: ${chalk.cyan('tprompts install repo/prompt editor')}`))
      }

    } catch (error: any) {
      this.error(error.message)
    }
  }
}