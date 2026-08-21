#!/usr/bin/env node
/**
 * Compile XR targets from flashcard images for 8th Wall / MindAR
 * Usage: node scripts/compile_xr_targets.js <image_path> <output_folder> <name>
 */

import path from 'path'
import {fileURLToPath} from 'url'
import sharp from 'sharp'
import {getDefaultCrop} from '../node_modules/@8thwall/image-target-cli/src/crop.js'
import {applyCrop} from '../node_modules/@8thwall/image-target-cli/src/apply.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function compileTarget(imagePath, outputFolder, name) {
  console.log(`Compiling: ${imagePath} -> ${outputFolder}/${name}`)

  const image = sharp(imagePath)
  const metadata = await image.metadata()

  const sourceIsLandscape = metadata.width >= metadata.height
  const geometry = getDefaultCrop(metadata, sourceIsLandscape)

  const crop = {
    type: 'PLANAR',
    geometry,
  }

  const {dataPath} = await applyCrop(
    image,
    crop,
    outputFolder,
    name,
    process.env.OVERWRITE_FILES === 'true'
  )

  console.log(`✓ Created: ${dataPath}`)
  return dataPath
}

// Parse arguments
const args = process.argv.slice(2)
if (args.length < 3) {
  console.error('Usage: node compile_xr_targets.js <image_path> <output_folder> <name>')
  console.error('Example: node compile_xr_targets.js image.png ./output cat001')
  process.exit(1)
}

const [imagePath, outputFolder, name] = args

compileTarget(imagePath, outputFolder, name)
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
