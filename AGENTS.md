<!-- BEGIN USER GLOBAL AI DEVELOPMENT STANDARDS -->
# Global AI Development Standards

These standards apply to all development work in this repository.

## 1. Project Inspection
- Inspect existing project structure, source code, configuration, and build system before changing anything.
- Preserve existing functionality and architecture.
- Avoid duplicate files, unnecessary dependencies, and redundant implementations.
- Never overwrite or discard existing user changes.

## 2. Window Management
- Target a 1920x1080 desktop workspace.
- Keep application windows, dialogs, menus, and popups within workspace bounds.
- Prevent clipping and ensure appropriate scaling and positioning.

## 3. Icons and Resources
- Embed application icons and resources correctly.
- Use appropriate project-relative asset paths.
- Configure manifests, executable icons, taskbar icons, installer icons, and shortcuts where applicable.
- Verify resources are included in release packages.

## 4. Dark Theme
- Implement the complete dark theme from the beginning.
- Apply consistent dark styling to all windows, controls, menus, dialogs, navigation, scrollbars, notifications, and popups.
- Ensure readable contrast and properly styled hover, focus, selected, disabled, and error states.
- Eliminate unintended white backgrounds and default light-theme controls.
- Verify the running application in dark mode.

## 5. Build Scripts
- Create `.build.ps1` and `.build-installer.ps1` when appropriate for the project.
- Release must be the default configuration. Never default to Debug.
- Scripts must work from the project root and resolve paths relative to `$PSScriptRoot`.
- Start standalone PowerShell scripts with `Clear-Host` as the first executable statement.
- Provide error handling, useful output, and failure exit codes.
- Verify expected build artifacts actually exist.
- Never claim a successful build without verifying it.

## 6. Installation and Deployment
- Ensure applications work outside the development environment.
- Include required assets and dependencies.
- Configure installation, shortcuts, icons, and uninstallation correctly.
- Exclude temporary files, debug artifacts, and development-only content from release packages.
- Test the packaged application.

## 7. Dependencies and Privacy
- Prefer existing and locally available tools.
- Avoid unnecessary paid services, Docker, external toolchains, telemetry, analytics, and phone-home functionality.
- Preserve offline functionality where applicable.
- Never expose credentials or API keys.

## 8. Code and Git Safety
- Follow existing project conventions.
- Write maintainable, modular code with explicit error handling.
- Keep changes focused.
- Never commit, push, reset, rebase, or rewrite Git history unless explicitly instructed.
- Never discard or overwrite user changes without permission.

## 9. Verification
Before declaring completion:
1. Verify requested functionality.
2. Check embedded icons and resources.
3. Review dark-theme consistency.
4. Verify window dimensions and positioning.
5. Execute the Release build.
6. Run relevant tests.
7. Verify executables and installer packages.
8. Report failures honestly.

Never claim something was built, tested, installed, or verified unless it actually was.

## 10. Instruction Priority
1. Explicit user instructions.
2. Existing project requirements and compatibility.
3. These global standards.
4. Framework and platform conventions.

Explain genuine technical limitations rather than silently ignoring requirements.
<!-- END USER GLOBAL AI DEVELOPMENT STANDARDS -->
