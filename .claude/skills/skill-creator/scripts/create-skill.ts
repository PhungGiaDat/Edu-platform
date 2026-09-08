#!/usr/bin/env npx tsx

import { parseArgs } from 'node:util'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, basename, resolve } from 'node:path'

interface SkillConfig {
  name: string
  description: string
  type: 'knowledge' | 'tool' | 'agent' | 'domain'
  agent?: string
  withScripts?: boolean
  withData?: boolean
  withExamples?: boolean
  output?: string
}

const SKILL_TEMPLATES_DIR = join(__dirname, '..', 'templates')
const SKILLS_DIR = join(__dirname, '..', '..', '..')

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(color: keyof typeof COLORS, message: string) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function showHelp() {
  console.log(`
${COLORS.cyan}Skill Creator CLI${COLORS.reset}

Usage:
  npx tsx create-skill.ts [options]

Commands:
  --create, -c              Create a new skill (default action)
  --validate, -v <path>     Validate an existing skill
  --list-templates, -l      List available templates
  --info, -i <name>         Show skill information
  --help, -h                Show this help message

Create Options:
  --name, -n <name>         Skill name (kebab-case) [required]
  --type, -t <type>         Skill type: knowledge, tool, agent, domain [required]
  --description, -d <desc>  Skill description
  --agent, -a <agent>       Target agent (for agent type)
  --with-scripts, -s        Include scripts folder
  --with-data               Include data folder
  --with-examples, -e       Include examples folder
  --output, -o <dir>        Output directory (default: skills/)

Examples:
  # Create a knowledge skill
  npx tsx create-skill.ts -n api-security -t knowledge -d "API security patterns"

  # Create a tool skill with all options
  npx tsx create-skill.ts -n data-processor -t tool --with-scripts --with-data --with-examples

  # Create an agent skill
  npx tsx create-skill.ts -n debug-analysis -t agent --agent debug

  # Validate a skill
  npx tsx create-skill.ts --validate skills/api-security

  # List templates
  npx tsx create-skill.ts --list-templates
`)
}

function kebabToTitle(kebab: string): string {
  return kebab
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function validateSkillName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name)
}

function listTemplates() {
  log('cyan', '\nAvailable Templates:\n')
  
  const templates = readdirSync(SKILL_TEMPLATES_DIR).filter(f => f.endsWith('.md'))
  
  console.log('  Template                  Description')
  console.log('  ─────────────────────────────────────────────────────')
  
  const descriptions: Record<string, string> = {
    'knowledge-skill.md': 'Pure documentation, patterns, guidelines',
    'tool-skill.md':      'Automation scripts with data processing',
    'agent-skill.md':     'Agent-specific output formats and workflows',
    'domain-skill.md':    'Specialized domain expertise',
  }
  
  templates.forEach(template => {
    const name = template.replace('.md', '')
    const desc = descriptions[template] || 'Custom template'
    console.log(`  ${name.padEnd(25)} ${desc}`)
  })
  
  console.log('')
}

function processTemplate(template: string, config: SkillConfig): string {
  let content = template
  
  const title = kebabToTitle(config.name)
  const agentName = config.agent || 'agent'
  const domainName = config.type === 'domain' ? title : 'Domain'
  
  content = content.replace(/\{\{SKILL_NAME\}\}/g, config.name)
  content = content.replace(/\{\{SKILL_TITLE\}\}/g, title)
  content = content.replace(/\{\{SKILL_DESCRIPTION\}\}/g, config.description || `${title} skill`)
  content = content.replace(/\{\{AGENT_NAME\}\}/g, agentName)
  content = content.replace(/\{\{DOMAIN_NAME\}\}/g, domainName)
  
  return content
}

function createSkill(config: SkillConfig): void {
  const skillDir = join(config.output || SKILLS_DIR, config.name)
  
  if (existsSync(skillDir)) {
    log('red', `Error: Skill "${config.name}" already exists at ${skillDir}`)
    process.exit(1)
  }
  
  log('blue', `\nCreating skill: ${config.name}`)
  log('cyan', `Type: ${config.type}`)
  log('cyan', `Output: ${skillDir}\n`)
  
  mkdirSync(skillDir, { recursive: true })
  
  const templateFile = join(SKILL_TEMPLATES_DIR, `${config.type}-skill.md`)
  
  if (!existsSync(templateFile)) {
    log('red', `Error: Template not found: ${templateFile}`)
    process.exit(1)
  }
  
  const template = readFileSync(templateFile, 'utf-8')
  const processed = processTemplate(template, config)
  
  const skillFile = join(skillDir, 'SKILL.md')
  writeFileSync(skillFile, processed)
  log('green', `  ✓ Created SKILL.md`)
  
  if (config.type === 'tool' || config.withScripts) {
    const scriptsDir = join(skillDir, 'scripts')
    mkdirSync(scriptsDir, { recursive: true })
    
    const packageJson = {
      name: `${config.name}-scripts`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        build: 'tsc',
        dev: 'tsx main.ts',
      },
      dependencies: {
        typescript: '^5.3.0',
        tsx: '^4.7.0',
      },
    }
    
    writeFileSync(join(scriptsDir, 'package.json'), JSON.stringify(packageJson, null, 2))
    log('green', `  ✓ Created scripts/package.json`)
    
    const mainTs = `#!/usr/bin/env npx tsx
// Main script for ${config.name} skill

import { parseArgs } from 'node:util'

function main() {
  console.log('${config.name} tool running...')
  // Add your implementation here
}

main()
`
    writeFileSync(join(scriptsDir, 'main.ts'), mainTs)
    log('green', `  ✓ Created scripts/main.ts`)
  }
  
  if (config.withData) {
    const dataDir = join(skillDir, 'data')
    mkdirSync(dataDir, { recursive: true })
    
    const sampleCsv = 'name,description,category\nitem1,Description 1,category1\nitem2,Description 2,category2\n'
    writeFileSync(join(dataDir, 'data.csv'), sampleCsv)
    log('green', `  ✓ Created data/data.csv`)
  }
  
  if (config.withExamples) {
    const examplesDir = join(skillDir, 'examples')
    mkdirSync(examplesDir, { recursive: true })
    
    const exampleMd = `# ${kebabToTitle(config.name)} Example

This is an example demonstrating the ${config.name} skill.

## Example 1: Basic Usage

\`\`\`typescript
// Example code here
\`\`\`

## Example 2: Advanced Usage

\`\`\`typescript
// More complex example
\`\`\`
`
    writeFileSync(join(examplesDir, 'example.md'), exampleMd)
    log('green', `  ✓ Created examples/example.md`)
  }
  
  console.log('')
  log('green', `✅ Skill "${config.name}" created successfully!`)
  log('yellow', `\nNext steps:`)
  console.log(`  1. Edit ${skillDir}/SKILL.md to add your content`)
  if (config.withScripts) {
    console.log(`  2. cd ${skillDir}/scripts && npm install`)
    console.log(`  3. Implement your tool in scripts/main.ts`)
  }
  console.log(`  4. Update TEAM-SKILLS.md to register your skill`)
  console.log(`  5. Run: npx tsx create-skill.ts --validate ${skillDir}`)
}

function validateSkill(skillPath: string): void {
  log('blue', `\nValidating skill: ${skillPath}\n`)
  
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!existsSync(skillPath)) {
    log('red', `❌ Error: Path does not exist: ${skillPath}`)
    process.exit(1)
  }
  
  const skillFile = join(skillPath, 'SKILL.md')
  
  if (!existsSync(skillFile)) {
    errors.push('SKILL.md not found')
  } else {
    log('green', '  ✓ SKILL.md exists')
    
    const content = readFileSync(skillFile, 'utf-8')
    
    if (!content.startsWith('---')) {
      errors.push('SKILL.md missing frontmatter')
    } else {
      log('green', '  ✓ Frontmatter present')
      
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1]
        
        if (!frontmatter.includes('name:')) {
          errors.push('Frontmatter missing "name" field')
        } else {
          log('green', '  ✓ "name" field present')
        }
        
        if (!frontmatter.includes('description:')) {
          errors.push('Frontmatter missing "description" field')
        } else {
          log('green', '  ✓ "description" field present')
        }
      }
    }
    
    if (content.includes('## Overview') || content.includes('## How to Use')) {
      log('green', '  ✓ Usage section present')
    } else {
      warnings.push('Consider adding "Overview" or "How to Use" section')
    }
    
    if (content.includes('## Best Practices')) {
      log('green', '  ✓ Best Practices section present')
    } else {
      warnings.push('Consider adding "Best Practices" section')
    }
    
    if (content.includes('```')) {
      log('green', '  ✓ Code examples present')
    } else {
      warnings.push('Consider adding code examples')
    }
  }
  
  const skillName = basename(skillPath)
  
  if (!validateSkillName(skillName)) {
    errors.push(`Invalid skill name "${skillName}". Use kebab-case (e.g., my-skill-name)`)
  } else {
    log('green', `  ✓ Valid skill name: ${skillName}`)
  }
  
  console.log('')
  
  if (errors.length > 0) {
    log('red', '❌ Validation failed with errors:\n')
    errors.forEach(err => console.log(`  • ${err}`))
    process.exit(1)
  }
  
  if (warnings.length > 0) {
    log('yellow', '⚠️  Warnings:\n')
    warnings.forEach(warn => console.log(`  • ${warn}`))
  }
  
  log('green', '\n✅ Skill validation passed!')
}

function showSkillInfo(skillName: string): void {
  const skillDir = join(SKILLS_DIR, skillName)
  const skillFile = join(skillDir, 'SKILL.md')
  
  if (!existsSync(skillFile)) {
    log('red', `Skill "${skillName}" not found`)
    process.exit(1)
  }
  
  const content = readFileSync(skillFile, 'utf-8')
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  
  console.log('')
  log('cyan', `Skill: ${skillName}`)
  console.log('─'.repeat(50))
  
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]
    const nameMatch = frontmatter.match(/name:\s*(.+)/)
    const descMatch = frontmatter.match(/description:\s*(.+)/)
    
    if (nameMatch) console.log(`Name: ${nameMatch[1]}`)
    if (descMatch) console.log(`Description: ${descMatch[1]}`)
  }
  
  const stats = statSync(skillDir)
  console.log(`Path: ${skillDir}`)
  
  const subdirs = ['scripts', 'templates', 'data', 'examples']
  const existingDirs = subdirs.filter(dir => existsSync(join(skillDir, dir)))
  if (existingDirs.length > 0) {
    console.log(`Includes: ${existingDirs.join(', ')}`)
  }
  
  console.log('')
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      create: { type: 'boolean', short: 'c', default: true },
      validate: { type: 'string', short: 'v' },
      'list-templates': { type: 'boolean', short: 'l' },
      info: { type: 'string', short: 'i' },
      help: { type: 'boolean', short: 'h' },
      name: { type: 'string', short: 'n' },
      type: { type: 'string', short: 't' },
      description: { type: 'string', short: 'd' },
      agent: { type: 'string', short: 'a' },
      'with-scripts': { type: 'boolean', short: 's' },
      'with-data': { type: 'boolean' },
      'with-examples': { type: 'boolean', short: 'e' },
      output: { type: 'string', short: 'o' },
    },
    strict: false,
  })
  
  if (values.help) {
    showHelp()
    process.exit(0)
  }
  
  if (values['list-templates']) {
    listTemplates()
    process.exit(0)
  }
  
  if (values.validate) {
    validateSkill(values.validate)
    process.exit(0)
  }
  
  if (values.info) {
    showSkillInfo(values.info)
    process.exit(0)
  }
  
  if (!values.name || !values.type) {
    log('red', 'Error: --name and --type are required for creating a skill')
    log('yellow', 'Use --help for usage information')
    process.exit(1)
  }
  
  const validTypes = ['knowledge', 'tool', 'agent', 'domain']
  if (!validTypes.includes(values.type)) {
    log('red', `Error: Invalid type "${values.type}". Must be one of: ${validTypes.join(', ')}`)
    process.exit(1)
  }
  
  if (!validateSkillName(values.name)) {
    log('red', `Error: Invalid skill name "${values.name}". Use kebab-case (e.g., my-skill-name)`)
    process.exit(1)
  }
  
  const config: SkillConfig = {
    name: values.name,
    description: values.description || '',
    type: values.type as SkillConfig['type'],
    agent: values.agent,
    withScripts: values['with-scripts'] || values.type === 'tool',
    withData: values['with-data'],
    withExamples: values['with-examples'],
    output: values.output,
  }
  
  createSkill(config)
}

main().catch(err => {
  log('red', `Error: ${err.message}`)
  process.exit(1)
})
