import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

function readInlineScripts() {
  const htmlPath = path.resolve(process.cwd(), 'public/ar-viewer.html')
  const html = fs.readFileSync(htmlPath, 'utf8')

  return Array.from(
    html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi),
    (match) => match[1],
  ).filter((script) => script.trim().length > 0)
}

describe('ar-viewer.html', () => {
  it('contains only syntactically valid inline scripts', () => {
    const inlineScripts = readInlineScripts()

    expect(inlineScripts.length).toBeGreaterThan(0)
    inlineScripts.forEach((script, index) => {
      expect(() => {
        new vm.Script(script, { filename: `ar-viewer.html#script-${index + 1}` })
      }).not.toThrow()
    })
  })

  it('installs the parent debug bridge before the viewer bootstrap', () => {
    const messages: Array<{ message: unknown; targetOrigin: string }> = []
    const registeredEvents: string[] = []
    const windowMock = {
      parent: {
        postMessage(message: unknown, targetOrigin: string) {
          messages.push({ message, targetOrigin })
        },
      },
      addEventListener(type: string) {
        registeredEvents.push(type)
      },
    }
    const context = vm.createContext({
      window: windowMock,
      location: { search: '?debug=true', hostname: 'example.test', href: 'https://example.test/ar-viewer.html?debug=true' },
      console: { error() {}, warn() {}, log() {} },
    })

    new vm.Script(readInlineScripts()[0], { filename: 'ar-viewer-debug-bridge.js' }).runInContext(context)

    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      message: {
        type: 'AR_DEBUG',
        payload: { label: 'VIEWER_DEBUG_BRIDGE_READY' },
        origin: 'child',
      },
      targetOrigin: '*',
    })
    expect(registeredEvents).toEqual(expect.arrayContaining(['error', 'unhandledrejection']))
    expect(windowMock).toHaveProperty('__AR_VIEWER_POST_TO_PARENT__')
  })
})
