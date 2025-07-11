import { mouse, keyboard } from "@nut-tree-fork/nut-js"

mouse.config.autoDelayMs = 3
keyboard.config.autoDelayMs = 3

console.log("Starting mouse movement...")
await mouse.move({ x: 100, y: 100 })
await new Promise((resolve) => setTimeout(resolve, 1000))
await mouse.move({ x: 100, y: 300 })
await new Promise((resolve) => setTimeout(resolve, 1000))
await mouse.move({ x: 300, y: 300 })
await new Promise((resolve) => setTimeout(resolve, 1000))
await mouse.move({ x: 300, y: 100 })
await new Promise((resolve) => setTimeout(resolve, 1000))
await mouse.move({ x: 100, y: 100 })
await new Promise((resolve) => setTimeout(resolve, 1000))

// sleep for 3 seconds
// await new Promise((resolve) => setTimeout(resolve, 3000))
// mouse.config.autoDelayMs = 3
// keyboard.config.autoDelayMs = 3
// await keyboard.type("Hello bitch :)")
// console.log("Mouse movement complete")
