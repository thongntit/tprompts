# tprompts CLI Implementation Plan v2.0

## Overview
Create a universal Node.js CLI tool called `tprompts` using oclif framework that can work with **any prompts repository** following a standardized structure. The CLI is completely separate from prompt repositories and can register/manage multiple prompt sources from different repositories (GitHub, local, etc.). The tool will be published to npm for use with `npx`.

## Architecture: Separate CLI + Configurable Repositories

### CLI Repository (`tprompts`)
- Universal installer that works with any prompts repository
- Repository management (register, list, update)
- No bundled prompts - purely a tool

### Prompts Repository (any repo following the structure)
- Contains prompt directories with per-folder config files
- Follows standardized `tprompts.json` format
- Can be hosted anywhere (GitHub, GitLab, local filesystem)

## CLI Command Design

### Repository Management Commands
```bash
# Register a prompts repository
npx tprompts register https://github.com/user/my-prompts.git
npx tprompts register /local/path/to/prompts
npx tprompts register --name "my-prompts" https://github.com/user/repo.git

# List registered repositories
npx tprompts repos

# Update registered repositories
npx tprompts update [repo-name]
npx tprompts update --all

# Remove registered repository
npx tprompts unregister my-prompts
```

### Installation Commands
```bash
# Install from registered repository
npx tprompts install my-prompts/promptA --editor vscode
npx tprompts install my-prompts/promptA vscode  # shorthand

# Install from URL directly (no registration needed)
npx tprompts install https://github.com/user/prompts/promptA --editor cursor

# List available prompts from all registered repos
npx tprompts list
npx tprompts list my-prompts  # from specific repo

# Remove installed prompts
npx tprompts remove my-prompts/promptA --editor vscode
```

## Prompts Repository Structure

### Repository Layout
```
my-prompts-repo/
├── README.md                # Repository documentation
├── promptA/                 # Individual prompt project
│   ├── tprompts.json        # Configuration for this prompt
│   ├── commands/            # Directory of command files
│   │   ├── weekly-review.md
│   │   └── monthly-review.md  
│   └── general.md           # Individual file
├── promptB/
│   ├── tprompts.json
│   ├── system-prompt.md
│   └── examples/
│       └── usage.md
└── .tprompts-repo.json      # Optional repo-level metadata
```

### Per-Prompt Configuration (`promptA/tprompts.json`)
```json
{
  "name": "Obsidian Second Brain",
  "description": "Productivity system for Obsidian with periodic reviews",
  "version": "1.0.0",
  "editors": {
    "vscode": {
      "commands/": {
        "location": ".copilot/commands/",
        "prefix": null,
        "suffix": null
      },
      "general.md": {
        "location": ".copilot/general.md",
        "prefix": "---\napplyTo: '**'\n---\n",
        "suffix": null
      }
    },
    "cursor": {
      "commands/": {
        "location": ".cursor/commands/",
        "prefix": "// Commands Directory\n"
      },
      "general.md": {
        "location": ".cursorrules",
        "prefix": "// General Rules\n",
        "suffix": "\n// End of rules"
      }
    },
    "windsurf": {
      "commands/": {
        "location": ".windsurf/workflows/",
        "prefix": null
      },
      "general.md": {
        "location": ".windsurf/rules.md",
        "prefix": "# Global Rules\n\n"
      }
    }
  }
}
```

### Repository Metadata (`.tprompts-repo.json`) - Optional
```json
{
  "name": "My Custom Prompts",
  "description": "Collection of AI prompts for development",
  "author": "Your Name",
  "version": "1.0.0",
  "homepage": "https://github.com/user/my-prompts",
  "defaultEditor": "vscode",
  "categories": ["development", "productivity", "ai"]
}
```

## CLI Project Structure
```
tprompts-cli/
├── package.json          # CLI package (no prompts bundled)
├── src/
│   ├── commands/
│   │   ├── register.ts   # npx tprompts register <repo>
│   │   ├── repos.ts      # npx tprompts repos
│   │   ├── install.ts    # npx tprompts install <repo/prompt> <editor>
│   │   ├── list.ts       # npx tprompts list [repo]
│   │   ├── remove.ts     # npx tprompts remove <repo/prompt> <editor>
│   │   └── update.ts     # npx tprompts update [repo]
│   ├── lib/
│   │   ├── repositories/ # Repository management
│   │   │   ├── git.ts    # Git repository handling
│   │   │   ├── local.ts  # Local filesystem handling
│   │   │   └── registry.ts # Repository registry management
│   │   ├── config/       # Configuration management
│   │   │   ├── prompt-config.ts # Parse tprompts.json
│   │   │   └── user-config.ts   # User settings (~/.tprompts/)
│   │   ├── installers/   # Editor-specific installation
│   │   │   ├── vscode.ts
│   │   │   ├── cursor.ts
│   │   │   ├── windsurf.ts
│   │   │   └── claude-code.ts
│   │   └── utils/
│   │       ├── file-processor.ts # Handle prefix/suffix
│   │       └── path-resolver.ts  # Resolve installation paths
│   └── types.ts          # TypeScript interfaces
└── README.md
```

## Key Features

### 1. Repository Management
- **Git integration**: Clone, fetch, pull repositories
- **Local support**: Work with local filesystem paths
- **Registry system**: Store registered repositories in `~/.tprompts/repos.json`
- **Version control**: Update repositories to latest versions

### 2. Flexible Prompt Sources
- **GitHub/GitLab**: `https://github.com/user/prompts`
- **Local paths**: `/path/to/my/prompts`
- **Direct URLs**: Individual prompt installation without registration

### 3. Advanced File Processing
- **Prefix/Suffix support**: Add text before/after file content
- **Directory handling**: Copy entire directories with structure preservation
- **Smart path resolution**: Custom locations per editor per file/directory

### 4. Configuration Hierarchy
```
Prompt config (tprompts.json) > User config (~/.tprompts/) > Built-in defaults
```

### 5. Multi-Editor Support
- **Per-editor configuration**: Each editor can have different paths and processing
- **Format conversion**: Automatic format conversion (markdown → mdx, etc.)
- **Editor detection**: Auto-detect available editors in project

## Implementation Phases

### Phase 1: Repository Management
1. Implement repository registry system
2. Add Git repository cloning/updating
3. Add local filesystem support
4. Create `register`, `repos`, `update` commands

### Phase 2: Prompt Configuration
1. Parse `tprompts.json` format
2. Implement prompt discovery in repositories
3. Add prompt validation and metadata extraction

### Phase 3: Installation System
1. Implement file/directory processing with prefix/suffix
2. Add editor-specific installers
3. Create `install`, `list`, `remove` commands

### Phase 4: Advanced Features
1. Add interactive mode with repository browsing
2. Implement backup/restore functionality
3. Add prompt templates and scaffolding

## Usage Examples

### Setup
```bash
# Register your prompts repository
npx tprompts register https://github.com/hiraism/custom-prompts
npx tprompts register --name "work-prompts" /path/to/work/prompts

# List registered repositories
npx tprompts repos
# → custom-prompts: https://github.com/hiraism/custom-prompts
# → work-prompts: /path/to/work/prompts
```

### Installation
```bash
# Install specific prompt to editor
npx tprompts install custom-prompts/obsidian-agent vscode
# → Reads custom-prompts/obsidian-agent/tprompts.json
# → Installs files according to vscode config with prefixes

# List available prompts
npx tprompts list custom-prompts
# → obsidian-agent (Productivity system for Obsidian)
# → coding-agent (AI coding assistant with memory)

# Install from URL without registration
npx tprompts install https://github.com/user/prompts/ai-helper cursor
```

### Configuration Example Result
When installing `obsidian-agent` to `vscode`, based on the config above:
```
commands/weekly-review.md → .copilot/commands/weekly-review.md
commands/monthly-review.md → .copilot/commands/monthly-review.md
general.md → .copilot/general.md (with "---\napplyTo: '**'\n---\n" prefix)
```

This architecture makes `tprompts` a truly universal tool that can work with any prompts repository, making it much more valuable to the community than a tool tied to a single prompt collection.