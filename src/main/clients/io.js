import os from "os"
import fs from "fs"
import path from "path"
import { execFile } from "child_process"
import { promisify } from "util"
import sharp from "sharp"
import { desktopCapturer } from "electron"
import { mouse, keyboard } from "@nut-tree-fork/nut-js"
import {
  setChatWindowContentProtection,
  showChatWindow,
  hideChatWindow
} from "../windows/chat.js"

const execFileAsync = promisify(execFile)
let lastScreenshot = null

export default class IOClient {
  constructor() {
    mouse.config.autoDelayMs = 3
    keyboard.config.autoDelayMs = 3
  }

  async takeScreenshot() {
    // Temporarily enable content protection to hide chat window from screenshot
    setChatWindowContentProtection(true)

    try {
      if (process.platform === "darwin") {
        try {
          const tempPath = path.join(
            os.tmpdir(),
            `screenshot-${Date.now()}.jpg`
          )

          await execFileAsync("screencapture", ["-x", "-t", "jpg", tempPath])

          const imageBuffer = await fs.promises.readFile(tempPath)
          await fs.promises.unlink(tempPath)

          const resizedBuffer = await sharp(imageBuffer)
            .resize({ height: 720 })
            .jpeg({ quality: 80 })
            .toBuffer()

          const base64 = resizedBuffer.toString("base64")
          const metadata = await sharp(resizedBuffer).metadata()

          lastScreenshot = {
            base64,
            width: metadata.width,
            height: metadata.height,
            timestamp: Date.now()
          }

          return {
            success: true,
            base64,
            width: metadata.width,
            height: metadata.height
          }
        } catch (error) {
          console.error("Failed to capture and resize screenshot:", error)
          return { success: false, error: error.message }
        }
      }

      try {
        const sources = await desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: {
            width: 1920,
            height: 1080
          }
        })

        if (sources.length === 0) {
          throw new Error("No screen sources available")
        }
        const source = sources[0]
        const buffer = source.thumbnail.toJPEG(70)
        const base64 = buffer.toString("base64")
        const size = source.thumbnail.getSize()

        return {
          success: true,
          base64,
          width: size.width,
          height: size.height
        }
      } catch (error) {
        console.error(
          "Failed to capture screenshot using desktopCapturer:",
          error
        )
        return {
          success: false,
          error: error.message
        }
      }
    } finally {
      // Always restore content protection to false to allow normal screen sharing
      setChatWindowContentProtection(false)
    }
  }

  async takeScreenshotWithAnnotation(dots) {
    const screenshot = await this.takeScreenshot()
    if (!screenshot.success) {
      return screenshot
    }

    try {
      // Create transparent yellow circles for each dot - sized for 720px resolution
      const overlays = dots.map((dot, index) => ({
        input: Buffer.from(`
          <svg width="140" height="140">
            <circle cx="70" cy="70" r="60" fill="yellow" opacity="0.3" stroke="yellow" stroke-width="3" stroke-opacity="0.6"/>
            <circle cx="70" cy="70" r="5" fill="red" opacity="0.9"/>
            <text x="88" y="78" text-anchor="start" fill="red" font-size="30">${
              dot.label || ""
            }</text>
          </svg>
        `),
        top: Math.max(0, dot.y - 70),
        left: Math.max(0, dot.x - 70)
      }))

      const annotated = await sharp(Buffer.from(screenshot.base64, "base64"))
        .composite(overlays)
        .jpeg({ quality: 80 })
        .toBuffer()

      return {
        success: true,
        base64: annotated.toString("base64"),
        width: screenshot.width,
        height: screenshot.height
      }
    } catch (error) {
      console.error("Failed to annotate screenshot:", error)
      return { success: false, error: error.message }
    }
  }

  async rightClick(x, y) {
    hideChatWindow()
    await mouse.move({ x: x, y: y })
    await mouse.rightClick()
    showChatWindow()
  }

  async leftClick(x, y) {
    hideChatWindow()
    await mouse.move({ x: x, y: y })
    await mouse.leftClick()
    showChatWindow()
  }

  async doubleClick(x, y) {
    hideChatWindow()
    await mouse.move({ x: x, y: y })
    await mouse.doubleClick()
    showChatWindow()
  }

  async leftClickDrag(x1, y1, x2, y2) {
    hideChatWindow()
    await mouse.move({ x: x1, y: y1 })
    await mouse.pressButton(0) // Left button down
    await mouse.move({ x: x2, y: y2 })
    await mouse.releaseButton(0) // Left button up
    showChatWindow()
  }

  async typeText(x, y, text) {
    hideChatWindow()
    await mouse.move({ x: x, y: y })
    await mouse.leftClick()
    await keyboard.type(text)
    showChatWindow()
  }

  async annotateScreenshot(x, y) {
    // Take a screenshot and add a red dot at the specified coordinates
    const screenshot = await this.takeScreenshot()
    if (!screenshot.success) {
      return screenshot
    }

    try {
      // Create a simple annotation (red circle) at the coordinates
      const annotated = await sharp(Buffer.from(screenshot.base64, "base64"))
        .composite([
          {
            input: Buffer.from(
              `<svg width="20" height="20"><circle cx="10" cy="10" r="8" fill="red" opacity="0.7"/></svg>`
            ),
            top: Math.max(0, y - 10),
            left: Math.max(0, x - 10)
          }
        ])
        .jpeg({ quality: 80 })
        .toBuffer()

      return {
        success: true,
        image: annotated.toString("base64"),
        width: screenshot.width,
        height: screenshot.height
      }
    } catch (error) {
      console.error("Failed to annotate screenshot:", error)
      return { success: false, error: error.message }
    }
  }
}
