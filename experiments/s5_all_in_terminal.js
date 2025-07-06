import { execSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import sharp from "sharp"

/**
 * Takes a screenshot using platform-specific command-line tools
 * Returns base64 encoded image data (JPEG format) resized to 1280x720
 */
async function takeScreenshot() {
  const currentDir = process.cwd()
  const timestamp = Date.now()
  const originalPath = path.join(
    currentDir,
    `screenshot_original_${timestamp}.jpg`
  )
  const resizedPath = path.join(currentDir, `screenshot_resized_${timestamp}.jpg`)

  try {
    // Take screenshot at original resolution
    await captureScreenshot(originalPath)

    // Get original dimensions and resize with Sharp
    const image = sharp(originalPath)
    const metadata = await image.metadata()
    
    // Resize to 1280x720 with high quality
    await image
      .resize(1280, 720, {
        fit: 'fill', // Stretch to exact dimensions
        kernel: sharp.kernel.lanczos3 // High quality interpolation
      })
      .jpeg({ quality: 95 }) // High quality JPEG
      .toFile(resizedPath)

    // Read the resized file and convert to base64
    const imageBuffer = fs.readFileSync(resizedPath)
    const base64Image = imageBuffer.toString("base64")

    // Keep both files for inspection

    return {
      success: true,
      image: base64Image,
      format: "jpeg",
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      resizedWidth: 1280,
      resizedHeight: 720,
      scaleX: metadata.width / 1280,
      scaleY: metadata.height / 720,
      originalPath: originalPath,
      resizedPath: resizedPath
    }
  } catch (error) {
    console.error("Screenshot error:", error)

    return {
      success: false,
      error: error.message
    }
  }
}



/**
 * Scale coordinates from 1280x720 back to original screen size
 */
function scaleCoordinates(x, y, scaleX, scaleY) {
  const actualX = Math.round(x * scaleX)
  const actualY = Math.round(y * scaleY)
  return { x: actualX, y: actualY }
}

/**
 * Platform-specific screenshot capture
 */
async function captureScreenshot(outputPath) {
  const platform = process.platform

  switch (platform) {
    case "darwin": // macOS
      return captureMacOS(outputPath)

    case "win32": // Windows
      return captureWindows(outputPath)

    case "linux": // Linux
      return captureLinux(outputPath)

    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * macOS screenshot using screencapture
 */
function captureMacOS(outputPath) {
  const command = `screencapture -x -t jpg "${outputPath}"`
  execSync(command, { stdio: "pipe" })
}

/**
 * Windows screenshot using PowerShell
 */
function captureWindows(outputPath) {
  const powershellScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      
      $screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Left, $screen.Top, 0, 0, $bitmap.Size)
      
      $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
      $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95)
      
      $bitmap.Save("${outputPath}", $jpegCodec, $encoderParams)
      $bitmap.Dispose()
      $graphics.Dispose()
    `

  const command = `powershell -ExecutionPolicy Bypass -Command "${powershellScript.replace(
    /\n/g,
    "; "
  )}"`
  execSync(command, { stdio: "pipe" })
}

/**
 * Linux screenshot using scrot or ImageMagick
 */
function captureLinux(outputPath) {
  try {
    // Try scrot first (fastest)
    const command = `scrot -q 95 "${outputPath}"`
    execSync(command, { stdio: "pipe" })
  } catch (error) {
    try {
      // Fallback to ImageMagick
      const command = `import -window root -quality 95 "${outputPath}"`
      execSync(command, { stdio: "pipe" })
    } catch (fallbackError) {
      throw new Error(
        `Failed to take screenshot on Linux. Please install scrot or ImageMagick. Original error: ${error.message}`
      )
    }
  }
}

/**
 * Check if required tools are available
 */
function checkScreenshotDependencies() {
  const platform = process.platform

  try {
    switch (platform) {
      case "darwin":
        // screencapture is built into macOS
        execSync("which screencapture", { stdio: "pipe" })
        return { available: true, tool: "screencapture (built-in)" }

      case "win32":
        // PowerShell is built into Windows
        execSync('powershell -Command "Get-Command Add-Type"', {
          stdio: "pipe"
        })
        return { available: true, tool: "PowerShell (built-in)" }

      case "linux":
        try {
          execSync("which scrot", { stdio: "pipe" })
          return { available: true, tool: "scrot" }
        } catch {
          execSync("which import", { stdio: "pipe" })
          return { available: true, tool: "ImageMagick" }
        }

      default:
        return { available: false, error: `Unsupported platform: ${platform}` }
    }
  } catch (error) {
    return {
      available: false,
      error: `Screenshot tools not available on ${platform}. ${error.message}`
    }
  }
}

// Check dependencies first
console.log("Checking dependencies...")
const deps = checkScreenshotDependencies()
console.log("Dependencies:", deps)

// Take a screenshot
console.log("Taking screenshot...")
const result = await takeScreenshot()

if (result.success) {
  console.log("✅ Screenshot successful!")
  console.log("Format:", result.format)
  console.log(
    "Original dimensions:",
    `${result.originalWidth}x${result.originalHeight}`
  )
  console.log(
    "Resized dimensions:",
    `${result.resizedWidth}x${result.resizedHeight}`
  )
  console.log(
    "Scale factors:",
    `X: ${result.scaleX.toFixed(3)}, Y: ${result.scaleY.toFixed(3)}`
  )
  console.log("Base64 length:", result.image.length)
  console.log("First 100 chars:", result.image.substring(0, 100))

  // Test coordinate scaling
  console.log("\n📐 Testing coordinate scaling:")
  console.log("Click at (640, 360) on 1280x720 image would be:")
  const scaled = scaleCoordinates(640, 360, result.scaleX, result.scaleY)
  console.log(`Actual screen coordinates: (${scaled.x}, ${scaled.y})`)
} else {
  console.error("❌ Screenshot failed:", result.error)
}
