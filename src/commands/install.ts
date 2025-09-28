import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as inquirer from 'inquirer'
import { RepositoryRegistryManager } from '../lib/repositories/registry'
import { PromptConfigParser } from '../lib/config/prompt-config'
import { FileProcessor } from '../lib/utils/file-processor'
import { PathResolver } from '../lib/utils/path-resolver'
import { SupportedEditor } from '../types'

export default class InstallCommand extends Command {
  static description = 'Install a prompt from a repository to an editor'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-repo/prompt-name vscode',
    '<%= config.bin %> <%= command.id %> my-repo/prompt-name --editor cursor',
    '<%= config.bin %> <%= command.id %> https://github.com/user/repo/prompt-name windsurf'
  ]

  static args = {
    prompt: Args.string({
      description: 'Prompt identifier (repo/prompt or URL)',
      required: true
    }),
    editor: Args.string({
      description: 'Target editor (vscode, cursor, windsurf, claude-code)',
      required: false
    })
  }

  static flags = {
    editor: Flags.string({
      char: 'e',
      description: 'Target editor',
      options: ['vscode', 'cursor', 'windsurf', 'claude-code']
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Overwrite existing files without confirmation'
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be installed without actually installing'
    })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(InstallCommand)

    try {
      const registryManager = new RepositoryRegistryManager()

      // Parse prompt identifier
      const promptId = PathResolver.parsePromptIdentifier(args.prompt)
      
      // Resolve repository
      let repository
      if (promptId.isUrl) {
        // TODO: Handle direct URL installation
        throw new Error('Direct URL installation not yet implemented')
      } else if (promptId.repository) {
        repository = await registryManager.getRepository(promptId.repository)
        if (!repository) {
          throw new Error(`Repository '${promptId.repository}' is not registered. Use 'tprompts register' first.`)
        }
      } else {
        // Use default repository
        repository = await registryManager.getDefaultRepository()
        if (!repository) {
          throw new Error('No default repository set and no repository specified. Use repo/prompt format or set a default repository.')
        }
      }

      // Resolve editor
      let editor = args.editor || flags.editor
      if (!editor) {
        const supportedEditors: SupportedEditor[] = ['vscode', 'cursor', 'windsurf', 'claude-code']
        const { selectedEditor } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedEditor',
          message: 'Select target editor:',
          choices: supportedEditors
        }])
        editor = selectedEditor
      }

      // Validate editor
      if (!editor || !['vscode', 'cursor', 'windsurf', 'claude-code'].includes(editor)) {
        throw new Error(`Unsupported editor: ${editor}`)
      }

      // Find prompt directory
      const repoPath = repository.type === 'git' ? 
        repository.path : 
        repository.url // For local repos, url is the path

      if (!repoPath || !fs.existsSync(repoPath)) {
        throw new Error(`Repository path not found: ${repoPath}`)
      }

      const promptPath = path.join(repoPath!, promptId.prompt)
      if (!fs.existsSync(promptPath)) {
        throw new Error(`Prompt not found: ${promptId.prompt} in repository ${repository.name}`)
      }

      // Load prompt configuration
      const promptConfig = await PromptConfigParser.parsePromptConfig(promptPath)
      if (!promptConfig) {
        throw new Error(`No tprompts.json configuration found in ${promptPath}`)
      }

      // Check if editor is supported by this prompt
      if (!promptConfig.editors[editor as SupportedEditor]) {
        const supportedEditors = Object.keys(promptConfig.editors)
        throw new Error(`Prompt '${promptId.prompt}' does not support editor '${editor}'. Supported editors: ${supportedEditors.join(', ')}`)
      }

      const editorConfig = promptConfig.editors[editor as SupportedEditor]

      this.log(`\n${chalk.blue('Installing')} ${chalk.bold(promptConfig.name)} to ${chalk.green(editor)}...`)
      this.log(`${chalk.dim('Repository:')} ${repository.name}`)
      this.log(`${chalk.dim('Prompt:')} ${promptId.prompt}`)

      // Process files according to configuration
      const targets = await FileProcessor.processFiles(
        promptPath,
        editorConfig,
        process.cwd()
      )

      if (targets.length === 0) {
        this.log(chalk.yellow('No files to install'))
        return
      }

      // Show what will be installed
      this.log(`\n${chalk.bold('Files to install:')}`)
      for (const target of targets) {
        const relativePath = path.relative(process.cwd(), target.targetPath)
        const sourceFile = path.relative(promptPath, target.sourcePath)
        
        let indicator = chalk.green('✓')
        if (fs.existsSync(target.targetPath)) {
          indicator = chalk.yellow('⚠')
        }
        
        this.log(`  ${indicator} ${sourceFile} → ${relativePath}`)
        
        if (target.prefix) {
          this.log(`    ${chalk.dim('+ prefix:')} ${chalk.dim(target.prefix.replace(/\n/g, '\\n'))}`)
        }
        if (target.suffix) {
          this.log(`    ${chalk.dim('+ suffix:')} ${chalk.dim(target.suffix.replace(/\n/g, '\\n'))}`)
        }
      }

      // Dry run mode
      if (flags['dry-run']) {
        this.log(`\n${chalk.blue('Dry run complete')} - no files were modified`)
        return
      }

      // Check for existing files and confirm overwrite
      const existingFiles = targets.filter(t => fs.existsSync(t.targetPath))
      if (existingFiles.length > 0 && !flags.force) {
        this.log(`\n${chalk.yellow('Warning:')} ${existingFiles.length} files already exist`)
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Overwrite existing files?',
          default: false
        }])

        if (!confirm) {
          this.log(chalk.yellow('Installation cancelled'))
          return
        }
      }

      // Install files
      await FileProcessor.installTargets(targets)

      this.log(`\n${chalk.green('✓ Installation complete!')} Installed ${targets.length} files to ${editor}`)

    } catch (error: any) {
      this.error(error.message)
    }
  }
}