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

export default class IOClient {
  constructor() {
    // mouse.config.autoDelayMs = 200
    this.mouseDelay = 200
    keyboard.config.autoDelayMs = 3
    this.scaleX = 1
    this.scaleY = 1
  }

  // Utility to scale coordinates from resized screenshot space to real screen space
  _scale(x, y) {
    let scaleX = this.scaleX
    let scaleY = this.scaleY

    // On macOS Retina displays, mouse coordinates operate in logical pixels
    // which are typically half the actual pixel resolution
    if (process.platform === "darwin") {
      // Detect Retina display by checking if scale factor suggests 2x density
      const isRetina = this.scaleX > 2.5 || this.scaleY > 2.5
      if (isRetina) {
        scaleX = this.scaleX / 2
        scaleY = this.scaleY / 2
      }
    }

    const scaled = { x: Math.round(x * scaleX), y: Math.round(y * scaleY) }
    return scaled
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

          // Get original dimensions
          const originalMeta = await sharp(imageBuffer).metadata()

          const resizedBuffer = await sharp(imageBuffer)
            .resize({ height: 720 })
            .jpeg({ quality: 80 })
            .toBuffer()

          const base64 = resizedBuffer.toString("base64")
          const resizedMeta = await sharp(resizedBuffer).metadata()

          // Update scaling factors
          this.scaleX = originalMeta.width / resizedMeta.width
          this.scaleY = originalMeta.height / resizedMeta.height

          return {
            success: true,
            base64,
            width: resizedMeta.width,
            height: resizedMeta.height
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
        const originalSize = source.thumbnail.getSize()

        // Resize to height 720 for consistency
        const resizedBuffer = await sharp(source.thumbnail.toPNG())
          .resize({ height: 720 })
          .jpeg({ quality: 80 })
          .toBuffer()

        const resizedMeta = await sharp(resizedBuffer).metadata()
        const base64 = resizedBuffer.toString("base64")

        // Update scaling factors
        this.scaleX = originalSize.width / resizedMeta.width
        this.scaleY = originalSize.height / resizedMeta.height

        return {
          success: true,
          base64,
          width: resizedMeta.width,
          height: resizedMeta.height
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
    const { x: sx, y: sy } = this._scale(x, y)
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.move({ x: sx, y: sy })
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.rightClick()
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    showChatWindow()
  }

  async leftClick(x, y) {
    hideChatWindow()
    const { x: sx, y: sy } = this._scale(x, y)
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.move({ x: sx, y: sy })
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.leftClick()
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    showChatWindow()
  }

  async doubleClick(x, y) {
    hideChatWindow()
    const { x: sx, y: sy } = this._scale(x, y)
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.move({ x: sx, y: sy })
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.doubleClick()
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    showChatWindow()
  }

  async leftClickDrag(x1, y1, x2, y2) {
    hideChatWindow()
    const start = this._scale(x1, y1)
    const end = this._scale(x2, y2)
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.move({ x: start.x, y: start.y })
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.pressButton(0) // Left button down
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.move({ x: end.x, y: end.y })
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.releaseButton(0) // Left button up
    showChatWindow()
  }

  async typeText(x, y, text) {
    hideChatWindow()
    const { x: sx, y: sy } = this._scale(x, y)
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.move({ x: sx, y: sy })
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await mouse.leftClick()
    await new Promise((resolve) => setTimeout(resolve, this.mouseDelay))
    await keyboard.type(text)
    showChatWindow()
  }
}
