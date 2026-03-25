#!/usr/bin/env node

/**
 * GLB Model Optimizer Script
 * 
 * Optimizes GLB models by:
 * 1. Compressing geometry with Draco
 * 2. Compressing textures to WebP
 * 3. Removing unused data
 * 4. Reducing file size by 60-80%
 * 
 * Prerequisites:
 *   npm install -g @gltf-transform/cli
 * 
 * Usage:
 *   node scripts/optimize-glb-models.js <input.glb> <output.glb>
 *   node scripts/optimize-glb-models.js --batch ./models
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkDependencies() {
    return new Promise((resolve, reject) => {
        exec('gltf-transform --version', (error) => {
            if (error) {
                log('❌ Error: @gltf-transform/cli is not installed', 'red');
                log('Install it globally with: npm install -g @gltf-transform/cli', 'yellow');
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024).toFixed(2); // KB
}

function optimizeModel(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = `gltf-transform optimize "${inputPath}" "${outputPath}" ` +
            `--compress draco ` +
            `--texture-compress webp ` +
            `--simplify ` +
            `--weld ` +
            `--prune`;

        log(`\n📦 Optimizing: ${path.basename(inputPath)}`, 'blue');
        log(`   Input:  ${getFileSize(inputPath)} KB`, 'reset');

        exec(command, (error, stdout, stderr) => {
            if (error) {
                log(`❌ Failed: ${error.message}`, 'red');
                reject(error);
                return;
            }

            if (stderr) {
                log(`⚠️  Warning: ${stderr}`, 'yellow');
            }

            const inputSize = parseFloat(getFileSize(inputPath));
            const outputSize = parseFloat(getFileSize(outputPath));
            const reduction = ((inputSize - outputSize) / inputSize * 100).toFixed(1);

            log(`   Output: ${outputSize} KB`, 'green');
            log(`   Saved:  ${(inputSize - outputSize).toFixed(2)} KB (${reduction}% reduction)`, 'green');
            log(`✅ Done!`, 'green');

            resolve({
                input: inputPath,
                output: outputPath,
                inputSize,
                outputSize,
                reduction,
            });
        });
    });
}

async function batchOptimize(directoryPath) {
    const files = fs.readdirSync(directoryPath)
        .filter(file => file.endsWith('.glb'))
        .map(file => path.join(directoryPath, file));

    if (files.length === 0) {
        log('❌ No .glb files found in directory', 'red');
        return;
    }

    log(`\n🚀 Starting batch optimization...`, 'bright');
    log(`   Found ${files.length} GLB files\n`, 'blue');

    const results = [];
    
    for (const inputPath of files) {
        const fileName = path.basename(inputPath, '.glb');
        const outputPath = path.join(directoryPath, `${fileName}-optimized.glb`);
        
        try {
            const result = await optimizeModel(inputPath, outputPath);
            results.push(result);
        } catch (error) {
            log(`❌ Skipped: ${fileName}`, 'red');
        }
    }

    // Summary
    log('\n' + '='.repeat(50), 'bright');
    log('📊 OPTIMIZATION SUMMARY', 'bright');
    log('='.repeat(50), 'bright');

    const totalInput = results.reduce((sum, r) => sum + r.inputSize, 0);
    const totalOutput = results.reduce((sum, r) => sum + r.outputSize, 0);
    const totalReduction = ((totalInput - totalOutput) / totalInput * 100).toFixed(1);

    log(`\n   Files Optimized: ${results.length}`, 'blue');
    log(`   Total Input:     ${totalInput.toFixed(2)} KB`, 'reset');
    log(`   Total Output:    ${totalOutput.toFixed(2)} KB`, 'green');
    log(`   Total Saved:     ${(totalInput - totalOutput).toFixed(2)} KB (${totalReduction}%)`, 'green');
    log('\n✅ Batch optimization complete!\n', 'bright');
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        log('Usage:', 'bright');
        log('  Single file:  node optimize-glb-models.js <input.glb> <output.glb>', 'reset');
        log('  Batch mode:   node optimize-glb-models.js --batch <directory>', 'reset');
        log('\nExample:', 'bright');
        log('  node optimize-glb-models.js character-b.glb character-b-optimized.glb', 'reset');
        log('  node optimize-glb-models.js --batch ./backend/static/assets/models', 'reset');
        process.exit(1);
    }

    try {
        await checkDependencies();

        if (args[0] === '--batch') {
            const directory = args[1] || '.';
            await batchOptimize(directory);
        } else {
            const inputPath = args[0];
            const outputPath = args[1] || inputPath.replace('.glb', '-optimized.glb');
            await optimizeModel(inputPath, outputPath);
        }
    } catch (error) {
        process.exit(1);
    }
}

main();
