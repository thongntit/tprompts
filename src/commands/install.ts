import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as inquirer from 'inquirer'
import { UrlRepositoryManager } from '../lib/repositories/url'
import { PromptConfigParser } from '../lib/config/prompt-config'
import { FileProcessor } from '../lib/utils/file-processor'
import { PathResolver } from '../lib/utils/path-resolver'

export default class InstallCommand extends Command {
  static description = 'Install a prompt directly from a GitHub URL'

  static examples = [
    '<%= config.bin %> <%= command.id %> https://github.com/user/repo/prompt-name vscode',
    '<%= config.bin %> <%= command.id %> https://github.com/user/repo/tree/main/prompt-name cursor',
    '<%= config.bin %> <%= command.id %> https://github.com/user/repo/prompt-name claude --dry-run',
    '<%= config.bin %> <%= command.id %> https://github.com/user/repo/prompt-name windsurf --force'
  ]

  static args = {
    url: Args.string({
      description: 'GitHub URL to the prompt',
      required: true
    }),
    editor: Args.string({
      description: 'Target editor (any name supported by the prompt)',
      required: false
    })
  }

  static flags = {
    editor: Flags.string({
      char: 'e',
      description: 'Target editor'
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
    let cleanup: (() => Promise<void>) | undefined

    try {
      // Parse GitHub URL
      const promptId = PathResolver.parsePromptIdentifier(args.url)

      if (!promptId.isUrl) {
        throw new Error('Please provide a GitHub URL. Example: https://github.com/user/repo/prompt-name')
      }

      // Download from URL
      const urlManager = new UrlRepositoryManager()
      const result = await urlManager.downloadFromUrl(promptId.originalUrl!, promptId.prompt)
      const repository = result.repository
      cleanup = result.cleanup

      // Find prompt directory
      const repoPath = repository.path
      if (!repoPath || !fs.existsSync(repoPath)) {
        throw new Error(`Repository path not found: ${repoPath}`)
      }

      const promptPath = path.join(repoPath, promptId.prompt)
      if (!fs.existsSync(promptPath)) {
        throw new Error(`Prompt not found: ${promptId.prompt}`)
      }

      // Load prompt configuration
      const promptConfig = await PromptConfigParser.parsePromptConfig(promptPath)
      if (!promptConfig) {
        throw new Error(`No tprompts.json configuration found in ${promptPath}`)
      }

      // Resolve editor
      let editor = args.editor || flags.editor
      if (!editor) {
        const availableEditors = Object.keys(promptConfig.editors)
        if (availableEditors.length === 0) {
          throw new Error('No editors configured in prompt')
        }

        const { selectedEditor } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedEditor',
          message: 'Select target editor:',
          choices: availableEditors
        }])
        editor = selectedEditor
      }

      if (!editor) {
        throw new Error('No editor specified')
      }

      // Check if editor is supported by this prompt
      if (!promptConfig.editors[editor]) {
        const supportedEditors = Object.keys(promptConfig.editors)
        throw new Error(`Prompt '${promptId.prompt}' does not support editor '${editor}'. Supported editors: ${supportedEditors.join(', ')}`)
      }

      const editorConfig = promptConfig.editors[editor]

      this.log(`\n${chalk.blue('Installing')} ${chalk.bold(promptConfig.name)} to ${chalk.green(editor)}...`)
      this.log(`${chalk.dim('Source:')} ${promptId.originalUrl}`)

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
    } finally {
      // Clean up temporary files
      if (cleanup) {
        await cleanup()
      }
    }
  }
}
