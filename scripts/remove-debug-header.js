#!/usr/bin/env node

/**
 * Remove Debug Header Script
 * 
 * This script ensures that the debug header is completely removed from
 * production builds by checking and removing any references to it in the
 * HTML files after the build process completes.
 */

const fs = require('fs');
const path = require('path');

// Path to the production dist directory
const distDir = path.join(__dirname, '..', 'dist');

// Find all HTML files in the dist directory
function findHtmlFiles(dir) {
  const htmlFiles = [];
  
  function scan(directory) {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scan(filePath); // Recursively scan subdirectories
      } else if (file.endsWith('.html')) {
        htmlFiles.push(filePath);
      }
    }
  }
  
  scan(dir);
  return htmlFiles;
}

// Remove debug header from HTML files
function removeDebugHeader(htmlFile) {
  let content = fs.readFileSync(htmlFile, 'utf8');
  let modified = false;
  
  // Remove the pre-render-debug div and related code
  if (content.includes('pre-render-debug')) {
    console.log(`Removing debug header from ${path.relative(distDir, htmlFile)}`);
    
    // Remove debug-related CSS
    content = content.replace(/#pre-render-debug\s*\{[^}]*\}/g, '');
    
    // Remove debug element creation code
    content = content.replace(/var\s+debugEl\s*=\s*document\.createElement[^;]*;[\s\S]*?document\.body\.appendChild\(debugEl\);/g, '');
    
    // Remove other debug-related code
    content = content.replace(/\/\/\s*Only show debug header[\s\S]*?showDebug\s*=\s*false;\s*\}/g, '');
    content = content.replace(/if\s*\(\s*showDebug\s*\)\s*\{[\s\S]*?\}/g, '');
    
    // Remove render status code that's only used by the debug header
    content = content.replace(/var\s+status\s*=\s*document\.getElementById\('render-status'\);[\s\S]*?status\.style\.color\s*=\s*'lime';/g, '');
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(htmlFile, content);
  }
}

// Main function
function main() {
  console.log('Removing debug header from production build...');
  
  if (!fs.existsSync(distDir)) {
    console.error(`Error: Build directory "${distDir}" not found.`);
    return;
  }
  
  const htmlFiles = findHtmlFiles(distDir);
  console.log(`Found ${htmlFiles.length} HTML files to process.`);
  
  for (const htmlFile of htmlFiles) {
    removeDebugHeader(htmlFile);
  }
  
  console.log('Debug header removal complete.');
}

main(); 