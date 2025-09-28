import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import { RepositoryRegistryManager } from '../lib/repositories/registry'
import { PromptConfigParser } from '../lib/config/prompt-config'

export default class ListCommand extends Command {
  static description = 'List available prompts from registered repositories'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> examples',
    '<%= config.bin %> <%= command.id %> --verbose'
  ]

  static args = {
    repository: Args.string({
      description: 'Repository name to list prompts from',
      required: false
    })
  }

  static flags = {
    verbose: Flags.boolean({
      char: 'v',
      description: 'Show detailed information'
    })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ListCommand)

    try {
      const registryManager = new RepositoryRegistryManager()
      const repositories = await registryManager.listRepositories()

      if (repositories.length === 0) {
        this.log(chalk.yellow('No repositories registered'))
        this.log(`\n${chalk.dim('Register a repository first:')}`)
        this.log(`  ${chalk.cyan('tprompts register https://github.com/user/prompts.git')}`)
        return
      }

      // Filter repositories if specific repo requested
      const targetRepos = args.repository 
        ? repositories.filter(r => r.name === args.repository)
        : repositories

      if (args.repository && targetRepos.length === 0) {
        this.error(`Repository '${args.repository}' not found`)
      }

      let totalPrompts = 0

      for (const repo of targetRepos) {
        const repoPath = repo.type === 'git' ? repo.path : repo.url
        
        if (!repoPath) {
          this.log(chalk.red(`✗ ${repo.name}: Repository path not found`))
          continue
        }

        try {
          const promptNames = await PromptConfigParser.discoverPrompts(repoPath)
          
          if (promptNames.length === 0) {
            this.log(chalk.yellow(`⚠ ${repo.name}: No prompts found`))
            continue
          }

          this.log(`\n${chalk.bold.blue(repo.name)} (${promptNames.length} prompts)`)
          if (flags.verbose) {
            this.log(`  ${chalk.dim('Type:')} ${repo.type}`)
            this.log(`  ${chalk.dim('Source:')} ${repo.url}`)
          }

          for (const promptName of promptNames) {
            const promptPath = require('path').join(repoPath, promptName)
            
            try {
              const config = await PromptConfigParser.parsePromptConfig(promptPath)
              
              if (config) {
                const supportedEditors = Object.keys(config.editors)
                
                this.log(`  ${chalk.green('●')} ${chalk.bold(promptName)}`)
                
                if (flags.verbose) {
                  this.log(`    ${chalk.dim('Description:')} ${config.description || 'No description'}`)
                  this.log(`    ${chalk.dim('Version:')} ${config.version || 'N/A'}`)
                  this.log(`    ${chalk.dim('Editors:')} ${supportedEditors.join(', ')}`)
                  
                  // Show file structure
                  const fs = require('fs-extra')
                  const items = fs.readdirSync(promptPath, { withFileTypes: true })
                  const files = items.filter((item: any) => !item.name.startsWith('.') && item.name !== 'tprompts.json')
                  
                  if (files.length > 0) {
                    this.log(`    ${chalk.dim('Files:')} ${files.map((f: any) => f.name + (f.isDirectory() ? '/' : '')).join(', ')}`)
                  }
                } else {
                  this.log(`    ${chalk.dim(config.description || 'No description')}`)
                  this.log(`    ${chalk.dim('Supports:')} ${supportedEditors.join(', ')}`)
                }
                
                totalPrompts++
              }
            } catch (error: any) {
              this.log(`  ${chalk.red('✗')} ${promptName}: ${error.message}`)
            }
          }
        } catch (error: any) {
          this.log(chalk.red(`✗ ${repo.name}: ${error.message}`))
        }
      }

      if (totalPrompts === 0) {
        this.log(chalk.yellow('\nNo valid prompts found'))
      } else {
        this.log(`\n${chalk.dim('Found')} ${chalk.bold(totalPrompts)} ${chalk.dim('prompts total')}`)
        this.log(`\n${chalk.dim('Install with:')} ${chalk.cyan('tprompts install <repo>/<prompt> <editor>')}`)
      }

    } catch (error: any) {
      this.error(error.message)
    }
  }
}