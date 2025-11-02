import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import inquirer from 'inquirer'
import * as fs from 'fs-extra'
import * as path from 'path'
import { RepositoryRegistryManager } from '../lib/repositories/registry'
import { PromptConfigParser } from '../lib/config/prompt-config'
import { FileProcessor } from '../lib/utils/file-processor'
import { PathResolver } from '../lib/utils/path-resolver'

export default class RemoveCommand extends Command {
  static description = 'Remove installed prompts from an editor'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-repo/prompt-name vscode',
    '<%= config.bin %> <%= command.id %> my-repo/prompt-name --editor cursor',
    '<%= config.bin %> <%= command.id %> my-repo/prompt-name windsurf --dry-run'
  ]

  static args = {
    prompt: Args.string({
      description: 'Prompt identifier (repo/prompt)',
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
      description: 'Target editor'
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Remove files without confirmation'
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be removed without actually removing'
    })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(RemoveCommand)

    try {
      const registryManager = new RepositoryRegistryManager()

      // Parse prompt identifier
      const promptId = PathResolver.parsePromptIdentifier(args.prompt)
      
      if (promptId.isUrl) {
        throw new Error('Cannot remove prompts installed from direct URLs. Only registered repository prompts can be removed.')
      }

      // Resolve repository
      let repository
      if (promptId.repository) {
        repository = await registryManager.getRepository(promptId.repository)
        if (!repository) {
          throw new Error(`Repository '${promptId.repository}' is not registered.`)
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
        // Get available editors from the prompt config
        const repoPath = repository.type === 'git' ?
          repository.path :
          repository.url

        if (!repoPath || !fs.existsSync(repoPath)) {
          throw new Error(`Repository path not found: ${repoPath}`)
        }

        const promptPath = path.join(repoPath!, promptId.prompt)
        if (!fs.existsSync(promptPath)) {
          throw new Error(`Prompt not found: ${promptId.prompt} in repository ${repository.name}`)
        }

        const promptConfig = await PromptConfigParser.parsePromptConfig(promptPath)
        if (!promptConfig) {
          throw new Error(`No tprompts.json configuration found in ${promptPath}`)
        }

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
      if (!promptConfig.editors[editor]) {
        const supportedEditors = Object.keys(promptConfig.editors)
        throw new Error(`Prompt '${promptId.prompt}' does not support editor '${editor}'. Supported editors: ${supportedEditors.join(', ')}`)
      }

      const editorConfig = promptConfig.editors[editor]

      this.log(`\n${chalk.red('Removing')} ${chalk.bold(promptConfig.name)} from ${chalk.green(editor)}...`)
      this.log(`${chalk.dim('Repository:')} ${repository.name}`)
      this.log(`${chalk.dim('Prompt:')} ${promptId.prompt}`)

      // Calculate what files would be installed (to know what to remove)
      const targets = await FileProcessor.processFiles(
        promptPath,
        editorConfig,
        process.cwd()
      )

      if (targets.length === 0) {
        this.log(chalk.yellow('No files configured for removal'))
        return
      }

      // Filter to only existing files
      const existingTargets = targets.filter(target => fs.existsSync(target.targetPath))

      if (existingTargets.length === 0) {
        this.log(chalk.yellow('No installed files found to remove'))
        return
      }

      // Show what will be removed
      this.log(`\n${chalk.bold('Files to remove:')}`)
      for (const target of existingTargets) {
        const relativePath = path.relative(process.cwd(), target.targetPath)
        this.log(`  ${chalk.red('✗')} ${relativePath}`)
      }

      // Show files that would be configured but don't exist
      const missingTargets = targets.filter(target => !fs.existsSync(target.targetPath))
      if (missingTargets.length > 0) {
        this.log(`\n${chalk.dim('Files not found (already removed or never installed):')}`)
        for (const target of missingTargets) {
          const relativePath = path.relative(process.cwd(), target.targetPath)
          this.log(`  ${chalk.dim('↷')} ${relativePath}`)
        }
      }

      // Dry run mode
      if (flags['dry-run']) {
        this.log(`\n${chalk.blue('Dry run complete')} - no files were removed`)
        return
      }

      // Confirm removal
      if (!flags.force) {
        this.log(`\n${chalk.yellow('Warning:')} This will permanently delete ${existingTargets.length} files`)
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Remove these files?',
          default: false
        }])

        if (!confirm) {
          this.log(chalk.yellow('Removal cancelled'))
          return
        }
      }

      // Remove files
      let removedCount = 0
      let failedCount = 0

      for (const target of existingTargets) {
        try {
          await fs.remove(target.targetPath)
          removedCount++
          
          // Try to remove empty parent directories
          await this.removeEmptyDirectories(path.dirname(target.targetPath))
        } catch (error: any) {
          this.log(`${chalk.red('✗')} Failed to remove ${target.targetPath}: ${error.message}`)
          failedCount++
        }
      }

      if (failedCount === 0) {
        this.log(`\n${chalk.green('✓ Removal complete!')} Removed ${removedCount} files from ${editor}`)
      } else {
        this.log(`\n${chalk.yellow('⚠ Removal completed with errors:')} ${removedCount} removed, ${failedCount} failed`)
      }

    } catch (error: any) {
      this.error(error.message)
    }
  }

  private async removeEmptyDirectories(dirPath: string): Promise<void> {
    try {
      // Don't remove the project root or important directories
      const projectRoot = process.cwd()
      const relativePath = path.relative(projectRoot, dirPath)
      
      // Skip if it's the project root or a parent directory
      if (!relativePath || relativePath.startsWith('..') || relativePath === '.') {
        return
      }

      // Skip certain important directories
      const importantDirs = ['.git', 'node_modules', 'src', 'lib', 'dist', 'build']
      if (importantDirs.some(dir => relativePath === dir || relativePath.startsWith(dir + '/'))) {
        return
      }

      // Check if directory exists and is empty
      if (fs.existsSync(dirPath)) {
        const items = await fs.readdir(dirPath)
        if (items.length === 0) {
          await fs.rmdir(dirPath)
          
          // Recursively check parent directory
          await this.removeEmptyDirectories(path.dirname(dirPath))
        }
      }
    } catch (error) {
      // Ignore errors when removing empty directories - this is a nice-to-have cleanup
    }
  }
}