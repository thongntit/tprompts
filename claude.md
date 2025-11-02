# tprompts

Universal CLI for installing and managing prompt packs across popular coding editors.

## Overview

`tprompts` is a command-line tool that helps you manage AI prompts for various code editors. It allows you to:
- Register prompt repositories (from Git URLs or local paths)
- Install prompts into editors (VS Code, Cursor, Windsurf, Claude Code)
- Update repositories to get the latest prompts
- Manage multiple versions of prompt repositories
- Remove installed prompts when no longer needed

## Installation

```bash
npm install -g @thongntit/tprompts
```

Or use with npx:
```bash
npx @thongntit/tprompts <command>
```

## Available Commands

### Repository Management

#### `register` - Register a prompts repository
Register a Git repository or local folder containing prompts.

```bash
tprompts register https://github.com/user/my-prompts.git
tprompts register /local/path/to/prompts
tprompts register --name "my-prompts" --default https://github.com/user/repo.git
tprompts register --name "my-prompts" --version v1.0.0 https://github.com/user/repo.git
```

**Options:**
- `-n, --name <name>` - Custom name for the repository
- `-d, --default` - Set as default repository
- `-v, --version <version>` - Specific branch, tag, or commit to checkout (Git only)

#### `repos` - List registered repositories
Show all registered repositories and their details.

```bash
tprompts repos
tprompts repos --verbose
```

**Options:**
- `--verbose` - Show detailed information including paths and metadata

#### `update` - Update registered repositories
Pull the latest changes from Git repositories.

```bash
tprompts update                    # Update default repository
tprompts update my-prompts         # Update specific repository
tprompts update --all              # Update all repositories
tprompts update my-prompts --version v2.0.0  # Update and checkout specific version
```

**Options:**
- `-a, --all` - Update all registered repositories
- `-v, --version <version>` - Checkout specific version after update

#### `unregister` - Remove a registered repository
Unregister a repository from the local registry.

```bash
tprompts unregister my-prompts
tprompts unregister my-prompts --force
tprompts unregister my-prompts --keep-files
```

**Options:**
- `-f, --force` - Remove without confirmation
- `--keep-files` - Keep local repository files (Git repositories only)

#### `version` - Manage repository versions
View and switch between different versions (branches, tags, commits) of Git repositories.

```bash
tprompts version my-repo                    # Show current version
tprompts version my-repo --list             # List available versions
tprompts version my-repo --checkout v1.2.0  # Checkout specific version
```

**Options:**
- `-l, --list` - List available branches and tags
- `-c, --checkout <version>` - Checkout specific branch, tag, or commit

### Prompt Management

#### `list` - List available prompts
Discover prompt packs available in registered repositories.

```bash
tprompts list                      # List prompts from default repository
tprompts list my-prompts           # List prompts from specific repository
tprompts list my-prompts --verbose # Show detailed prompt information
```

**Options:**
- `--verbose` - Show detailed information including descriptions and supported editors

#### `install` - Install prompts to an editor
Install a prompt pack into your current project for a specific editor.

```bash
# From registered repository
tprompts install my-repo/prompt-name vscode
tprompts install my-repo/prompt-name --editor cursor

# From direct URL (no registration needed)
tprompts install https://github.com/user/repo/prompt-name vscode
tprompts install https://github.com/user/repo/tree/main/prompt-name cursor

# Preview changes without installing
tprompts install my-repo/prompt-name vscode --dry-run
```

**Options:**
- `-e, --editor <editor>` - Target editor (vscode, cursor, windsurf, claude-code)
- `-f, --force` - Overwrite existing files without confirmation
- `--dry-run` - Preview what would be installed without making changes

#### `remove` - Remove installed prompts
Remove previously installed prompt files from an editor.

```bash
tprompts remove my-repo/prompt-name vscode
tprompts remove my-repo/prompt-name --editor cursor
tprompts remove my-repo/prompt-name windsurf --dry-run
```

**Options:**
- `-e, --editor <editor>` - Target editor
- `-f, --force` - Remove files without confirmation
- `--dry-run` - Preview what would be removed without making changes

## Prompt Repository Format

Each prompt pack must include a `tprompts.json` configuration file:

```json
{
  "name": "Coding Assistant",
  "description": "AI coding assistant with best practices",
  "version": "1.0.0",
  "editors": {
    "vscode": {
      "system-prompt.md": {
        "location": ".vscode/ai-assistant.md",
        "prefix": "---\nrole: system\napplyTo: '**'\n---\n\n"
      },
      "commands/": {
        "location": ".vscode/commands/",
        "suffix": "\n\n<!-- Generated by tprompts -->"
      }
    },
    "cursor": {
      "system-prompt.md": {
        "location": ".cursorrules"
      }
    },
    "windsurf": {
      "system-prompt.md": {
        "location": ".windsurfrules"
      }
    },
    "claude-code": {
      "system-prompt.md": {
        "location": ".claude/custom-instructions.md"
      },
      "commands/": {
        "location": ".claude/commands/"
      }
    }
  }
}
```

**Configuration options:**
- `location` - Destination path relative to project root
- `prefix` - Text to add before file content (optional)
- `suffix` - Text to add after file content (optional)
- Directory support - Use trailing `/` to copy entire directories recursively

## Local State

- **Registry:** `~/.tprompts/repos.json` - Registered repositories
- **Config:** `~/.tprompts/config.json` - User settings
- **Git repos:** `~/.tprompts/repositories/<name>` - Cloned Git repositories
- **Installations:** Current working directory - Installed prompt files

## Workflow Examples

### Basic Usage
```bash
# 1. Register a repository
tprompts register https://github.com/example/prompts

# 2. List available prompts
tprompts list prompts

# 3. Install a prompt
tprompts install prompts/coding-assistant vscode

# 4. Update repository and reinstall
tprompts update prompts
tprompts install prompts/coding-assistant vscode --force
```

### Direct URL Installation (No Registration)
```bash
# Install directly from a GitHub URL
tprompts install https://github.com/user/prompts/my-prompt cursor
```

### Version Management
```bash
# Register with specific version
tprompts register --name stable --version v1.0.0 https://github.com/user/prompts

# List available versions
tprompts version stable --list

# Switch to a different version
tprompts version stable --checkout v2.0.0

# Update to latest of current branch
tprompts update stable
```

### Multiple Repositories
```bash
# Register multiple sources
tprompts register --name work-prompts /path/to/work/prompts
tprompts register --name personal-prompts https://github.com/me/prompts
tprompts register --name team-prompts --default https://github.com/team/prompts

# List all repositories
tprompts repos --verbose

# Use prompts from different repositories
tprompts install work-prompts/code-review vscode
tprompts install personal-prompts/docs-writer cursor
```

## Supported Editors

- **VS Code** - `.vscode/` directory
- **Cursor** - `.cursorrules` file and `.cursor/` directory
- **Windsurf** - `.windsurfrules` file and `.windsurf/` directory
- **Claude Code** - `.claude/` directory

## Tips

- Use `--dry-run` to preview changes before applying them
- Set a default repository to avoid typing the repo name every time
- Use version management to lock repositories to specific stable releases
- Keep local repositories for fast iteration during prompt development
- Use `--verbose` flags to see detailed information about repositories and prompts

## Development

See the main repository for development instructions: https://github.com/thongntit/tprompts
