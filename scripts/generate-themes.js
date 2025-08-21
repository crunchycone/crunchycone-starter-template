#!/usr/bin/env node
/**
 * Generate theme CSS from TypeScript theme objects
 * Run with: node scripts/generate-themes.js
 */

const fs = require("fs");
const path = require("path");

// Import the theme generator (using require for Node.js)
const { generateAllThemesCSS } = require("../themes/index.ts");

const generateThemeCSS = () => {
  try {
    console.log("🎨 Generating theme CSS from TypeScript objects...");

    // Generate CSS from theme objects
    const css = generateAllThemesCSS({
      includeComments: true,
      minify: false,
    });

    // Write to a temporary CSS file
    const outputPath = path.join(__dirname, "../app/generated-themes.css");
    fs.writeFileSync(outputPath, css, "utf8");

    console.log("✅ Theme CSS generated successfully!");
    console.log(`📝 Output: ${outputPath}`);
    console.log(`📏 Size: ${css.length} characters`);

    return css;
  } catch (error) {
    console.error("❌ Error generating theme CSS:", error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  generateThemeCSS();
}

module.exports = { generateThemeCSS };
