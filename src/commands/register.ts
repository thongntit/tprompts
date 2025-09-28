import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import { RepositoryRegistryManager } from '../lib/repositories/registry'
import { GitRepositoryManager } from '../lib/repositories/git'
import { LocalRepositoryManager } from '../lib/repositories/local'

export default class RegisterCommand extends Command {
  static description = 'Register a prompts repository'

  static examples = [
    '<%= config.bin %> <%= command.id %> https://github.com/user/my-prompts.git',
    '<%= config.bin %> <%= command.id %> /local/path/to/prompts',
    '<%= config.bin %> <%= command.id %> --name "my-prompts" https://github.com/user/repo.git'
  ]

  static args = {
    source: Args.string({
      description: 'Repository URL (git) or local path',
      required: true
    })
  }

  static flags = {
    name: Flags.string({
      char: 'n',
      description: 'Custom name for the repository'
    }),
    default: Flags.boolean({
      char: 'd',
      description: 'Set as default repository'
    })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(RegisterCommand)

    try {
      const registryManager = new RepositoryRegistryManager()
      
      // Determine repository type and name
      const isGitUrl = this.isGitUrl(args.source)
      const repoType = isGitUrl ? 'git' : 'local'
      const repoName = flags.name || this.extractRepoName(args.source)

      this.log(`${chalk.blue('Registering')} ${repoType} repository: ${chalk.bold(repoName)}`)
      this.log(`${chalk.dim('Source:')} ${args.source}`)

      // Validate the repository
      if (repoType === 'git') {
        const gitManager = new GitRepositoryManager()
        await gitManager.validateAndClone(repoName, args.source)
      } else {
        const localManager = new LocalRepositoryManager()
        await localManager.validateLocalPath(args.source)
      }

      // Register the repository
      await registryManager.addRepository(repoName, args.source, repoType)

      // Set as default if requested
      if (flags.default) {
        await registryManager.setDefaultRepository(repoName)
        this.log(`${chalk.green('✓')} Set as default repository`)
      }

      this.log(`${chalk.green('✓')} Repository '${repoName}' registered successfully`)
      
      // Show next steps
      this.log(`\n${chalk.dim('Next steps:')}`)
      this.log(`  ${chalk.dim('•')} List prompts: ${chalk.cyan(`tprompts list ${repoName}`)}`)
      this.log(`  ${chalk.dim('•')} Install prompt: ${chalk.cyan(`tprompts install ${repoName}/prompt-name editor`)}`)

    } catch (error: any) {
      this.error(error.message)
    }
  }

  private isGitUrl(source: string): boolean {
    return source.startsWith('http') || 
           source.startsWith('git@') || 
           source.includes('github.com') ||
           source.includes('gitlab.com') ||
           source.endsWith('.git')
  }

  private extractRepoName(source: string): string {
    if (this.isGitUrl(source)) {
      // Extract from Git URL: https://github.com/user/repo.git -> repo
      const match = source.match(/\/([^\/]+?)(?:\.git)?$/)
      return match ? match[1] : 'repository'
    } else {
      // Extract from local path: /path/to/my-prompts -> my-prompts  
      return source.split('/').pop() || 'local-repository'
    }
  }
}