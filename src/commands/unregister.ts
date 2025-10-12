import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import inquirer from 'inquirer'
import * as fs from 'fs-extra'
import { RepositoryRegistryManager } from '../lib/repositories/registry'

export default class UnregisterCommand extends Command {
  static description = 'Remove a registered repository'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-prompts',
    '<%= config.bin %> <%= command.id %> my-prompts --keep-files',
    '<%= config.bin %> <%= command.id %> my-prompts --force'
  ]

  static args = {
    repository: Args.string({
      description: 'Name of repository to unregister',
      required: true
    })
  }

  static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'Remove without confirmation'
    }),
    'keep-files': Flags.boolean({
      description: 'Keep local repository files (for Git repositories only)'
    })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(UnregisterCommand)

    try {
      const registryManager = new RepositoryRegistryManager()
      
      // Check if repository exists
      const repository = await registryManager.getRepository(args.repository)
      if (!repository) {
        this.error(`Repository '${args.repository}' is not registered.\nUse "tprompts repos" to see available repositories.`)
      }

      // Show repository information
      this.log(`${chalk.red('Unregistering')} repository: ${chalk.bold(repository.name)}`)
      this.log(`${chalk.dim('Type:')} ${repository.type}`)
      this.log(`${chalk.dim('Source:')} ${repository.url}`)
      
      if (repository.type === 'git' && repository.path) {
        this.log(`${chalk.dim('Local path:')} ${repository.path}`)
      }

      // Check if this is the default repository
      const defaultRepo = await registryManager.getDefaultRepository()
      const isDefault = defaultRepo?.name === repository.name
      if (isDefault) {
        this.log(`${chalk.yellow('⚠')} This is the default repository`)
      }

      // Determine what will be removed
      let willRemoveFiles = false
      if (repository.type === 'git' && repository.path && fs.existsSync(repository.path) && !flags['keep-files']) {
        willRemoveFiles = true
      }

      this.log(`\n${chalk.bold('What will be removed:')}`)
      this.log(`  ${chalk.red('✗')} Repository registration`)
      if (isDefault) {
        this.log(`  ${chalk.red('✗')} Default repository setting`)
      }
      if (willRemoveFiles) {
        this.log(`  ${chalk.red('✗')} Local repository files: ${repository.path}`)
      } else if (repository.type === 'git' && flags['keep-files']) {
        this.log(`  ${chalk.green('✓')} Local repository files will be kept`)
      }

      // Confirm removal
      if (!flags.force) {
        this.log(`\n${chalk.yellow('Warning:')} This action cannot be undone`)
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Unregister repository '${repository.name}'?`,
          default: false
        }])

        if (!confirm) {
          this.log(chalk.yellow('Unregistration cancelled'))
          return
        }
      }

      // Remove local files if it's a Git repository and keep-files is not set
      if (willRemoveFiles) {
        try {
          this.log(`${chalk.dim('→')} Removing local repository files...`)
          await fs.remove(repository.path!)
          this.log(`  ${chalk.green('✓')} Removed ${repository.path}`)
        } catch (error: any) {
          this.log(`  ${chalk.yellow('⚠')} Failed to remove local files: ${error.message}`)
          this.log(`  ${chalk.dim('You may need to remove them manually')}: ${repository.path}`)
        }
      }

      // Remove from registry
      await registryManager.removeRepository(repository.name)

      this.log(`${chalk.green('✓')} Repository '${repository.name}' unregistered successfully`)

      // Show recommendations
      if (isDefault) {
        const remainingRepos = await registryManager.listRepositories()
        if (remainingRepos.length > 0) {
          this.log(`\n${chalk.dim('Tip:')} Set a new default repository:`)
          this.log(`  ${chalk.cyan(`tprompts register --default <repository-name>`)}`)
        }
      }

      // Show next steps
      this.log(`\n${chalk.dim('Next steps:')}`)
      this.log(`  ${chalk.dim('•')} View remaining repositories: ${chalk.cyan('tprompts repos')}`)
      this.log(`  ${chalk.dim('•')} Register a new repository: ${chalk.cyan('tprompts register <source>')}`)

    } catch (error: any) {
      this.error(error.message)
    }
  }
}