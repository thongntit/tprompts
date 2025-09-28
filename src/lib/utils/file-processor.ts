import * as fs from 'fs-extra'
import * as path from 'path'
import { FileConfig, PromptFile, InstallationTarget } from '../../types'

export class FileProcessor {
  static async processFiles(
    sourceDir: string,
    fileConfigs: Record<string, FileConfig>,
    targetBaseDir: string = process.cwd()
  ): Promise<InstallationTarget[]> {
    const targets: InstallationTarget[] = []

    for (const [fileOrDir, config] of Object.entries(fileConfigs)) {
      const sourcePath = path.join(sourceDir, fileOrDir)

      if (!fs.existsSync(sourcePath)) {
        console.warn(`Warning: Source file/directory not found: ${sourcePath}`)
        continue
      }

      const stat = await fs.stat(sourcePath)

      if (stat.isDirectory()) {
        // Handle directory
        const dirTargets = await this.processDirectory(sourcePath, config, targetBaseDir)
        targets.push(...dirTargets)
      } else {
        // Handle single file
        const fileTarget = await this.processFile(sourcePath, config, targetBaseDir)
        targets.push(fileTarget)
      }
    }

    return targets
  }

  private static async processDirectory(
    sourceDir: string,
    config: FileConfig,
    targetBaseDir: string
  ): Promise<InstallationTarget[]> {
    const targets: InstallationTarget[] = []
    const targetDir = path.resolve(targetBaseDir, config.location)

    // Ensure target directory exists
    await fs.ensureDir(targetDir)

    // Read all files in source directory
    const files = await this.getAllFiles(sourceDir)

    for (const file of files) {
      const relativePath = path.relative(sourceDir, file.path)
      const targetPath = path.join(targetDir, relativePath)
      
      const processedContent = this.applyPrefixSuffix(
        file.content,
        config.prefix,
        config.suffix
      )

      targets.push({
        sourcePath: file.path,
        targetPath,
        content: processedContent,
        prefix: config.prefix || undefined,
        suffix: config.suffix || undefined
      })
    }

    return targets
  }

  private static async processFile(
    sourcePath: string,
    config: FileConfig,
    targetBaseDir: string
  ): Promise<InstallationTarget> {
    const content = await fs.readFile(sourcePath, 'utf8')
    const targetPath = path.resolve(targetBaseDir, config.location)
    
    const processedContent = this.applyPrefixSuffix(
      content,
      config.prefix,
      config.suffix
    )

    return {
      sourcePath,
      targetPath,
      content: processedContent,
      prefix: config.prefix || undefined,
      suffix: config.suffix || undefined
    }
  }

  private static async getAllFiles(dir: string): Promise<PromptFile[]> {
    const files: PromptFile[] = []
    const items = await fs.readdir(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(dir, item.name)

      if (item.isDirectory()) {
        // Recursively get files from subdirectories
        const subFiles = await this.getAllFiles(fullPath)
        files.push(...subFiles)
      } else {
        // Read file content
        const content = await fs.readFile(fullPath, 'utf8')
        files.push({
          name: item.name,
          path: fullPath,
          content,
          isDirectory: false
        })
      }
    }

    return files
  }

  private static applyPrefixSuffix(
    content: string,
    prefix?: string | null,
    suffix?: string | null
  ): string {
    let result = content

    if (prefix) {
      result = prefix + result
    }

    if (suffix) {
      result = result + suffix
    }

    return result
  }

  static async installTargets(targets: InstallationTarget[]): Promise<void> {
    for (const target of targets) {
      // Ensure target directory exists
      await fs.ensureDir(path.dirname(target.targetPath))

      // Write the processed content
      await fs.writeFile(target.targetPath, target.content, 'utf8')
    }
  }
}