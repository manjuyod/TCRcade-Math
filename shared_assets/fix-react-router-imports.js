
#!/usr/bin/env node
/**
 * Auto-fix script for React Router to Wouter migration
 * Automatically detects and fixes react-router-dom imports in the codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReactRouterFixer {
  constructor() {
    this.clientDir = path.join(__dirname, '../client/src');
    this.fixedFiles = [];
    this.errors = [];
  }

  async run() {
    console.log('🔧 Starting React Router to Wouter Auto-Fix...\n');
    
    try {
      await this.scanAndFixFiles(this.clientDir);
      this.generateReport();
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
    }
  }

  async scanAndFixFiles(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        await this.scanAndFixFiles(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        await this.fixFile(filePath);
      }
    }
  }

  async fixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!this.needsFix(content)) {
        return;
      }

      console.log(`🔍 Fixing: ${path.relative(this.clientDir, filePath)}`);
      
      let fixedContent = content;
      let changesMade = [];

      // Fix imports
      if (content.includes('react-router-dom')) {
        const oldImport = content.match(/import\s+{[^}]+}\s+from\s+['"]react-router-dom['"];?/);
        if (oldImport) {
          const importLine = oldImport[0];
          let newImportLine = importLine;

          if (importLine.includes('useNavigate')) {
            newImportLine = newImportLine.replace('useNavigate', 'useLocation');
            changesMade.push('useNavigate → useLocation');
          }
          
          if (importLine.includes('useSearchParams')) {
            newImportLine = newImportLine.replace(', useSearchParams', ', useSearch');
            newImportLine = newImportLine.replace('useSearchParams, ', 'useSearch, ');
            newImportLine = newImportLine.replace('useSearchParams', 'useSearch');
            changesMade.push('useSearchParams → useSearch');
          }

          newImportLine = newImportLine.replace('react-router-dom', 'wouter');
          fixedContent = fixedContent.replace(importLine, newImportLine);
        }
      }

      // Fix useNavigate declarations
      if (content.includes('useNavigate()')) {
        fixedContent = fixedContent.replace(
          /const\s+navigate\s*=\s*useNavigate\(\);?/g,
          'const [, setLocation] = useLocation();'
        );
        changesMade.push('useNavigate() → useLocation()');
      }

      // Fix useSearchParams declarations
      if (content.includes('useSearchParams()')) {
        fixedContent = fixedContent.replace(
          /const\s+\[searchParams\]\s*=\s*useSearchParams\(\);?/g,
          'const searchString = useSearch();\n  const searchParams = new URLSearchParams(searchString);'
        );
        changesMade.push('useSearchParams() → useSearch()');
      }

      // Fix navigate() calls
      fixedContent = fixedContent.replace(/navigate\(/g, 'setLocation(');
      if (content.includes('navigate(')) {
        changesMade.push('navigate() → setLocation()');
      }

      if (changesMade.length > 0) {
        fs.writeFileSync(filePath, fixedContent);
        this.fixedFiles.push({
          file: path.relative(this.clientDir, filePath),
          changes: changesMade
        });
        console.log(`  ✅ Fixed: ${changesMade.join(', ')}`);
      }

    } catch (error) {
      this.errors.push({
        file: path.relative(this.clientDir, filePath),
        error: error.message
      });
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  needsFix(content) {
    return content.includes('react-router-dom') || 
           content.includes('useNavigate') || 
           content.includes('navigate(');
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 REACT ROUTER TO WOUTER FIX REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📋 Summary:`);
    console.log(`  • Files fixed: ${this.fixedFiles.length}`);
    console.log(`  • Errors: ${this.errors.length}`);
    
    if (this.fixedFiles.length > 0) {
      console.log(`\n✅ Fixed Files:`);
      this.fixedFiles.forEach(({ file, changes }) => {
        console.log(`  • ${file}`);
        changes.forEach(change => console.log(`    - ${change}`));
      });
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      this.errors.forEach(({ file, error }) => {
        console.log(`  • ${file}: ${error}`);
      });
    }
    
    console.log('\n🎉 Auto-fix complete!');
    
    if (this.fixedFiles.length > 0) {
      console.log('\n⚠️  Next steps:');
      console.log('  1. Review the fixed files');
      console.log('  2. Test the application');
      console.log('  3. Restart the dev server if needed');
    }
  }
}

// Run the fixer
const fixer = new ReactRouterFixer();
fixer.run().catch(console.error);
