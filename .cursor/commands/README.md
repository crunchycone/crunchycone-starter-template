# Cursor Custom Slash Commands

This directory contains custom slash commands for the Cursor IDE that provide specialized code review and analysis capabilities based on the elite code-reviewer agent patterns.

## Available Commands

### 🔍 `/code-review`
**Comprehensive Code Review**
- Complete code quality analysis with security, performance, and maintainability assessment
- Based on elite code-reviewer agent capabilities
- Provides structured feedback organized by priority (Critical, High Priority, Suggestions, Positive Feedback)
- Covers Clean Code principles, SOLID patterns, security vulnerabilities, and production readiness

### 🛡️ `/security-review`
**Security-Focused Code Review**
- Specialized security assessment focusing on vulnerabilities and attack vectors
- OWASP Top 10 compliance validation
- Authentication, authorization, and input validation analysis
- PII handling, encryption, and secrets management review
- Security testing requirements and compliance standards

### 🧪 `/test-review`
**Test Quality & Coverage Review**
- Comprehensive test strategy and quality assessment
- Coverage analysis (line, branch, function coverage)
- Test structure, organization, and maintainability evaluation
- Security testing, performance testing, and integration testing review
- Mocking strategies and CI/CD integration analysis

### ⚡ `/performance-review`
**Performance & Scalability Review**
- Application performance optimization analysis
- Database query optimization and N+1 problem detection
- Memory usage, CPU utilization, and resource management
- Network I/O performance and caching strategy review
- Scalability architecture and infrastructure performance

### 🏗️ `/architecture-review`
**Architecture & Design Review**
- System architecture and design pattern evaluation
- SOLID principles and separation of concerns analysis
- API design, data architecture, and integration patterns
- Technology choices and architectural decision validation
- Scalability assessment and future-proofing considerations

### 🔧 `/refactor-suggest`
**Refactoring Suggestions & Code Improvement**
- Specific refactoring recommendations with implementation steps
- Code smell detection and quality improvement opportunities
- Structural refactoring and performance optimization suggestions
- Safety guidelines and risk assessment for refactoring
- Before/after examples with clear implementation guidance

### 🚀 `/crunchycone-build-log`
**CrunchyCone Build Log Analysis & Troubleshooting**
- Automatically fetches recent CrunchyCone build status
- Retrieves detailed logs for failed builds
- Diagnoses build failures and deployment issues
- Provides specific solutions for common build problems
- DevOps troubleshooting for CrunchyCone platform deployments

## Usage Instructions

### Basic Usage
1. Open a file or select code in Cursor IDE
2. Type `/` in the chat to see available commands
3. Select one of the custom commands (e.g., `/code-review`)
4. Provide additional context if needed
5. Receive detailed, structured feedback

### Command Syntax
```
/code-review [optional: specific focus area]
/security-review [optional: specific security concern]
/test-review [optional: test file or strategy focus]
/performance-review [optional: specific performance area]
/architecture-review [optional: architectural component]
/refactor-suggest [optional: specific refactoring goal]
/crunchycone-build-log [automatically fetches build status and logs]
```

### Examples
```
/code-review
/code-review focus on authentication logic
/security-review check for SQL injection vulnerabilities
/test-review analyze test coverage for user management
/performance-review database query optimization
/architecture-review API design patterns
/refactor-suggest reduce code complexity
/crunchycone-build-log
```

## Command Features

### 🎯 **Structured Output**
All commands provide organized feedback with:
- **Priority levels**: Critical, High Priority, Suggestions
- **Specific examples**: Code snippets and implementation details
- **Actionable recommendations**: Clear next steps and improvements
- **Risk assessment**: Understanding impact and complexity

### 🔧 **Context-Aware Analysis**
Commands understand:
- **Project structure**: Next.js, TypeScript, Prisma patterns
- **Framework conventions**: Auth.js, shadcn/ui, Tailwind CSS
- **Security standards**: OWASP, SANS, industry best practices
- **Performance benchmarks**: Response times, throughput targets
- **Testing frameworks**: Jest, Testing Library, integration patterns

### 📊 **Comprehensive Coverage**
Analysis includes:
- **Code quality**: Readability, maintainability, complexity
- **Security**: Vulnerabilities, compliance, threat modeling
- **Performance**: Optimization, scalability, resource usage
- **Architecture**: Design patterns, separation of concerns
- **Testing**: Coverage, quality, automation, reliability

## Integration with Project Standards

### 🔒 **Security Alignment**
- Aligns with project security standards in `docs/security.md`
- References rate limiting configuration in `lib/rate-limit.ts`
- Validates authentication patterns in `lib/auth/`
- Checks compliance with OWASP guidelines

### 🧪 **Testing Standards**
- Validates 70% coverage threshold requirement
- Checks Jest configuration and test structure
- Reviews mocking strategies and CI/CD integration
- Ensures security testing and integration testing coverage

### ⚡ **Performance Standards**
- Validates response time targets (< 200ms for APIs)
- Checks database query optimization patterns
- Reviews caching strategies and implementation
- Analyzes scalability and resource utilization

### 🏗️ **Architecture Standards**
- Validates Next.js App Router patterns
- Checks TypeScript usage and type safety
- Reviews Prisma ORM usage and patterns
- Ensures separation of concerns and modularity

## Command Customization

### Adding New Commands
1. Create a new `.md` file in `.cursor/commands/`
2. Use the existing command structure as a template
3. Define specific analysis scope and criteria
4. Include examples and usage instructions
5. Test the command in Cursor IDE

### Modifying Existing Commands
1. Edit the relevant `.md` file
2. Maintain the structured format
3. Update examples and criteria as needed
4. Test changes to ensure functionality

### Team-Specific Customization
- Modify commands to reflect team coding standards
- Add project-specific patterns and conventions
- Include company security and compliance requirements
- Adjust priority levels based on team preferences

## Best Practices

### 🎯 **Effective Usage**
- **Be specific**: Provide context about what you want reviewed
- **Focus areas**: Use commands for specific types of analysis
- **Iterative improvement**: Use feedback to improve code incrementally
- **Team alignment**: Share command outputs for team discussions

### 🔄 **Workflow Integration**
- **Pre-commit reviews**: Use commands before committing code
- **Pull request preparation**: Review code before creating PRs
- **Refactoring planning**: Use suggestions to plan refactoring efforts
- **Learning tool**: Use commands to learn best practices

### 📚 **Continuous Learning**
- **Pattern recognition**: Learn from command feedback patterns
- **Standards alignment**: Understand project quality standards
- **Best practices**: Absorb industry best practices through usage
- **Team knowledge**: Share insights gained from command usage

## Support and Feedback

### 📖 **Documentation References**
- **Project docs**: Check `docs/` folder for detailed guides
- **CLAUDE.md**: Technical reference and development guidelines
- **README.md**: Project overview and setup instructions
- **Security guide**: `docs/security.md` for security standards

### 🔧 **Troubleshooting**
- Ensure Cursor IDE is updated to latest version
- Check that commands are properly formatted (`.md` files)
- Verify file permissions for `.cursor/commands/` directory
- Test commands with simple code examples first

### 💡 **Enhancement Suggestions**
Commands are continuously improved based on:
- Team feedback and usage patterns
- Industry best practices evolution
- Project-specific requirements changes
- New security threats and performance patterns

## Special Commands

### 🚀 CrunchyCone Build Troubleshooting

The `/crunchycone-build-log` command is unique as it actively interacts with the CrunchyCone platform:

1. **Automatic Build Fetching**: Executes `npx --yes crunchycone-cli project builds` to get recent builds
2. **Failed Build Detection**: Identifies builds with failed status
3. **Log Retrieval**: Uses `npx --yes crunchycone-cli project builds log <build-id>` for detailed error analysis
4. **Solution Guidance**: Provides specific fixes for common deployment issues

**Common Issues Diagnosed**:
- TypeScript compilation errors
- Dependency resolution problems
- Environment variable configuration
- Memory/timeout issues
- Next.js build optimization problems
- Prisma schema or migration issues

**Usage**: Simply type `/crunchycone-build-log` and the command will automatically fetch and analyze your latest builds.

## Version History

- **v1.0**: Initial command set with comprehensive review capabilities
- **v1.1**: Added CrunchyCone build troubleshooting command
- **Current**: Seven specialized commands covering all aspects of code quality and deployment

These commands provide a powerful toolkit for maintaining high code quality, security, and performance standards throughout the development process.