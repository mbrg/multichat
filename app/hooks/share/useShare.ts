import html2canvas from 'html2canvas'
import GIF from 'gifshot'
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import type { Message } from '@/types/chat'

export function useShare() {
  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const downloadImage = async (container: HTMLElement) => {
    const canvas = await html2canvas(container, { width: 390 })
    canvas.toBlob((blob: Blob | null) => {
      if (blob) downloadBlob(blob, 'chat.png')
    })
  }

  const downloadGif = async (container: HTMLElement) => {
    const totalHeight = container.scrollHeight
    const viewportHeight = container.clientHeight
    const frames: string[] = []
    const originalScroll = container.scrollTop
    for (let y = 0; y <= totalHeight - viewportHeight; y += 50) {
      container.scrollTop = y
      // eslint-disable-next-line no-await-in-loop
      const canvas = await html2canvas(container, { width: 390 })
      frames.push(canvas.toDataURL('image/png'))
    }
    container.scrollTop = originalScroll
    return new Promise<void>((resolve, reject) => {
      GIF.createGIF(
        {
          images: frames,
          gifWidth: 390,
          gifHeight: viewportHeight,
          frameDuration: 0.5,
        },
        (obj: any) => {
          if (!obj.error && obj.image) {
            fetch(obj.image)
              .then((r) => r.blob())
              .then((b) => downloadBlob(b, 'chat.gif'))
              .then(() => resolve())
              .catch(reject)
          } else {
            reject(new Error('Failed to create GIF'))
          }
        }
      )
    })
  }

  const encodeMessages = (messages: Message[]) => {
    const minimal = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      model: m.model,
    }))
    const json = JSON.stringify(minimal)
    return compressToEncodedURIComponent(json)
  }

  const decodeMessages = (encoded: string): Message[] => {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return []
    const arr = JSON.parse(json)
    return arr.map((m: any) => ({ ...m, timestamp: new Date() }))
  }

  const copyShareUrl = (messages: Message[]) => {
    const encoded = encodeMessages(messages)
    const url = `${window.location.origin}?share=${encoded}`
    if (url.length > 2000) {
      alert('Conversation too long to share via URL.')
      return ''
    }
    navigator.clipboard.writeText(url)
    return url
  }

  const shareTo = (
    platform: 'linkedin' | 'x' | 'bluesky',
    imageUrl: string,
    url: string
  ) => {
    const text = encodeURIComponent(
      'Check this AI convo – endless possibilities made real!'
    )
    const encodedUrl = encodeURIComponent(url)
    if (platform === 'linkedin') {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        '_blank'
      )
    } else if (platform === 'x') {
      window.open(
        `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
        '_blank'
      )
    } else if (platform === 'bluesky') {
      window.open(
        `https://bsky.app/intent/compose?text=${text}%20${encodedUrl}`,
        '_blank'
      )
    }
  }

  return { downloadImage, downloadGif, copyShareUrl, shareTo, decodeMessages }
}
