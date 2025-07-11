import os from "os"
import fs from "fs"
import sharp from "sharp"
import { mouse, keyboard } from "@nut-tree-fork/nut-js"
import {
  setChatWindowContentProtection,
  showChatWindow,
  hideChatWindow
} from "../windows/chat.js"

export default class OSClient {
  constructor() {
    mouse.config.autoDelayMs = 3
    keyboard.config.autoDelayMs = 3
    // instantiate node-pty terminal and keep it alive
  }

  async screenshot() {
    // Temporarily enable content protection to hide chat window from screenshot
    setChatWindowContentProtection(true)

    try {
      if (process.platform === "darwin") {
        try {
          const tempPath = path.join(
            os.tmpdir(),
            `screenshot-${Date.now()}.jpg`
          )

          await execFile("screencapture", ["-x", "-t", "jpg", tempPath])

          const imageBuffer = await fs.promises.readFile(tempPath)
          await fs.promises.unlink(tempPath)

          const resizedBuffer = await sharp(imageBuffer)
            // .resize({ height: 1080 })
            .resize({ height: 384 })
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

  async executeCommand(command) {
    // execute command
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

  async typeText(x, y, text) {
    hideChatWindow()
    await mouse.move({ x: x, y: y })
    await mouse.leftClick()
    await keyboard.type(text)
    showChatWindow()
  }
}
